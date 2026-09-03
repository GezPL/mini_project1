import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface SurveyData {
  id?: number;
  facilityName: string;
  locationArea: string;
  conditionStatus: string;
  notes: string;
  timestamp: number;
  status: 'draft' | 'synced';
}

interface SurveyDB extends DBSchema {
  'survey-drafts': {
    key: number;
    value: SurveyData;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<SurveyDB>>;

export const initDB = () => {
  dbPromise = openDB<SurveyDB>('vku-survey-db', 1, {
    upgrade(db) {
      // Create a store for our survey drafts
      const store = db.createObjectStore('survey-drafts', {
        keyPath: 'id',
        autoIncrement: true,
      });
      // Create an index to easily query drafts vs synced items
      store.createIndex('by-status', 'status');
    },
  });
};

export const saveDraft = async (data: Omit<SurveyData, 'id'>) => {
  const db = await dbPromise;
  await db.add('survey-drafts', data);
};

export const getAllDrafts = async () => {
  const db = await dbPromise;
  return await db.getAllFromIndex('survey-drafts', 'by-status', 'draft');
};

export const deleteDraft = async (id: number) => {
  const db = await dbPromise;
  await db.delete('survey-drafts', id);
};