import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type UrgencyLevel = 'good' | 'warning' | 'critical';

export interface SurveyReport {
  id?: number;
  zone: string;                 // Khu V, Khu K, KTX, Khu Thể thao, Thư viện/Khác
  specificLocation: string;     // Phòng V.A102, Hành lang Tầng 3 Nhà K...
  category: string;             // Điện & Chiếu sáng, Điều hòa/Quạt, Máy tính/Lab, Bàn ghế, Cửa/Kính, Vệ sinh, Khác
  facilityName: string;         // Tên tài sản/thiết bị cụ thể
  urgency: UrgencyLevel;        // good (Bình thường), warning (Cần bảo trì), critical (Khẩn cấp)
  notes: string;                // Mô tả chi tiết hiện trạng
  reporterName: string;         // Họ tên / Mã SV
  photo: string | null;         // Data URL (Base64)
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
  createdAt: number;            // Timestamp
  status: 'draft' | 'synced';   // Trạng thái đồng bộ
}

interface SurveyDB extends DBSchema {
  'survey-reports': {
    key: number;
    value: SurveyReport;
    indexes: {
      'by-status': string;
      'by-created': number;
    };
  };
}

const DB_NAME = 'vku-survey-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<SurveyDB>> | null = null;

export const initDB = (): Promise<IDBPDatabase<SurveyDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<SurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Xoá store cũ nếu nâng cấp từ version 1
        if (oldVersion < 2 && db.objectStoreNames.contains('survey-drafts' as any)) {
          db.deleteObjectStore('survey-drafts' as any);
        }

        if (!db.objectStoreNames.contains('survey-reports')) {
          const store = db.createObjectStore('survey-reports', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

// Lưu báo cáo mới
export const saveReport = async (data: Omit<SurveyReport, 'id'>): Promise<number> => {
  const db = await initDB();
  const id = await db.add('survey-reports', data as SurveyReport);
  return id as number;
};

// Lấy tất cả báo cáo
export const getAllReports = async (): Promise<SurveyReport[]> => {
  const db = await initDB();
  const all = await db.getAll('survey-reports');
  return all.sort((a, b) => b.createdAt - a.createdAt);
};

// Lấy các bản nháp chưa đồng bộ
export const getDraftReports = async (): Promise<SurveyReport[]> => {
  const db = await initDB();
  return await db.getAllFromIndex('survey-reports', 'by-status', 'draft');
};

// Cập nhật trạng thái báo cáo
export const updateReportStatus = async (id: number, status: 'draft' | 'synced'): Promise<void> => {
  const db = await initDB();
  const item = await db.get('survey-reports', id);
  if (item) {
    item.status = status;
    await db.put('survey-reports', item);
  }
};

// Xoá báo cáo
export const deleteReport = async (id: number): Promise<void> => {
  const db = await initDB();
  await db.delete('survey-reports', id);
};