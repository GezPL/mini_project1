import './style.css';
import {
  initDB,
  saveReport,
  getDraftReports,
  updateReportStatus,
  deleteReport,
  type SurveyReport,
  type UrgencyLevel
} from './db.ts';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

// --- Khởi tạo DB & Biến toàn cục ---
initDB();

let currentPhotoDataUrl: string | null = null;
let currentLocation: { lat: number; lng: number; accuracy?: number } | null = null;

// DOM Elements
const surveyForm = document.getElementById('survey-form') as HTMLFormElement;
const tabSurveyBtn = document.getElementById('tab-survey') as HTMLButtonElement;
const tabDraftsBtn = document.getElementById('tab-drafts') as HTMLButtonElement;
const surveyView = document.getElementById('survey-view') as HTMLElement;
const draftsView = document.getElementById('drafts-view') as HTMLElement;
const draftsList = document.getElementById('drafts-list') as HTMLElement;
const draftsCounterBadge = document.getElementById('drafts-counter-badge') as HTMLElement;
const networkBadge = document.getElementById('network-badge') as HTMLElement;
const networkStatusLabel = document.getElementById('network-status') as HTMLElement;
const offlineBanner = document.getElementById('offline-banner') as HTMLElement;
const btnCamera = document.getElementById('btn-camera') as HTMLButtonElement;
const btnGps = document.getElementById('btn-gps') as HTMLButtonElement;
const photoPreviewContainer = document.getElementById('photo-preview-container') as HTMLElement;
const gpsPreviewContainer = document.getElementById('gps-preview-container') as HTMLElement;
const btnSyncAll = document.getElementById('btn-sync-all') as HTMLButtonElement;
const reporterInput = document.getElementById('reporter-name') as HTMLInputElement;

// Tự động điền lại tên người báo cáo nếu đã lưu lần trước
const savedReporterName = localStorage.getItem('vku_survey_reporter');
if (savedReporterName && reporterInput) {
  reporterInput.value = savedReporterName;
}

// --- Toast Thông Báo ---
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Chuyển Đổi Tab ---
function switchTab(tab: 'survey' | 'drafts') {
  if (tab === 'survey') {
    tabSurveyBtn.classList.add('active');
    tabDraftsBtn.classList.remove('active');
    surveyView.classList.remove('hidden');
    draftsView.classList.add('hidden');
  } else {
    tabDraftsBtn.classList.add('active');
    tabSurveyBtn.classList.remove('active');
    draftsView.classList.remove('hidden');
    surveyView.classList.add('hidden');
    renderDrafts();
  }
}

tabSurveyBtn?.addEventListener('click', () => switchTab('survey'));
tabDraftsBtn?.addEventListener('click', () => switchTab('drafts'));

// --- Trạng Thái Mạng ---
function updateNetworkUI() {
  const isOnline = navigator.onLine;

  if (isOnline) {
    networkBadge.className = 'status-badge online';
    networkStatusLabel.textContent = 'Online';
    offlineBanner.classList.add('hidden');
    btnSyncAll.disabled = false;
  } else {
    networkBadge.className = 'status-badge offline';
    networkStatusLabel.textContent = 'Offline';
    offlineBanner.classList.remove('hidden');
  }

  refreshDraftsCount();
}

window.addEventListener('online', () => {
  updateNetworkUI();
  showToast('Đã khôi phục kết nối Internet! Sẵn sàng đồng bộ.', 'success');
  // Tự động đồng bộ nếu có nháp
  syncAllDrafts(true);
});

window.addEventListener('offline', () => {
  updateNetworkUI();
  showToast('Bạn đang ngoại tuyến. Dữ liệu sẽ lưu cục bộ.', 'info');
});

updateNetworkUI(); // Kiểm tra ban đầu

// --- Cập nhật số lượng bản nháp ---
async function refreshDraftsCount() {
  try {
    const drafts = await getDraftReports();
    const count = drafts.length;
    if (draftsCounterBadge) {
      if (count > 0) {
        draftsCounterBadge.textContent = count.toString();
        draftsCounterBadge.classList.remove('hidden');
      } else {
        draftsCounterBadge.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Lỗi lấy số lượng nháp:', error);
  }
}

// --- Xử Lý Camera ---
if (btnCamera && photoPreviewContainer) {
  btnCamera.addEventListener('click', async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
      });

      if (image.dataUrl) {
        currentPhotoDataUrl = image.dataUrl;
        renderPhotoPreview();
        showToast('Đã chụp ảnh thành công!', 'success');
      }
    } catch (error) {
      console.warn('Hủy hoặc lỗi khi chụp ảnh:', error);
    }
  });
}

function renderPhotoPreview() {
  if (!currentPhotoDataUrl) {
    photoPreviewContainer.innerHTML = '';
    return;
  }

  photoPreviewContainer.innerHTML = `
    <div class="photo-preview-card">
      <img src="${currentPhotoDataUrl}" alt="Ảnh hiện trường" />
      <div class="photo-actions">
        <button type="button" id="btn-retake-photo" class="btn-small btn-secondary-outline">Chụp lại</button>
        <button type="button" id="btn-remove-photo" class="btn-small btn-danger-outline">Xóa ảnh</button>
      </div>
    </div>
  `;

  document.getElementById('btn-remove-photo')?.addEventListener('click', () => {
    currentPhotoDataUrl = null;
    renderPhotoPreview();
  });

  document.getElementById('btn-retake-photo')?.addEventListener('click', () => {
    btnCamera.click();
  });
}

// --- Xử Lý GPS ---
if (btnGps && gpsPreviewContainer) {
  btnGps.addEventListener('click', async () => {
    try {
      gpsPreviewContainer.innerHTML = `
        <div class="gps-card" style="justify-content: center;">
          <span>⏳ Đang định vị GPS hiện trường...</span>
        </div>
      `;

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      const accuracy = coordinates.coords.accuracy ? Math.round(coordinates.coords.accuracy) : undefined;

      currentLocation = { lat, lng, accuracy };

      gpsPreviewContainer.innerHTML = `
        <div class="gps-card">
          <div class="gps-info">
            <span class="gps-coords">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            <span class="gps-accuracy">${accuracy ? `Sai số ước tính: ±${accuracy}m` : 'Đã xác định vị trí'}</span>
          </div>
          <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="btn-small btn-secondary-outline" style="text-decoration: none;">
            Xem bản đồ ↗
          </a>
        </div>
      `;
      showToast('Đã lấy tọa độ GPS thành công!', 'success');
    } catch (error) {
      console.error('Lỗi GPS:', error);
      gpsPreviewContainer.innerHTML = `
        <div class="gps-card" style="border-color: #fecaca; background: #fee2e2;">
          <span style="color: #b91c1c; font-size: 13px;">Không thể lấy vị trí. Vui lòng cấp quyền định vị.</span>
        </div>
      `;
      showToast('Lỗi định vị. Vui lòng bật vị trí trên máy.', 'error');
    }
  });
}

// --- Gửi / Lưu Khảo Sát ---
if (surveyForm) {
  surveyForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    const formData = new FormData(surveyForm);
    const reporterName = (formData.get('reporterName') as string).trim();
    if (reporterName) {
      localStorage.setItem('vku_survey_reporter', reporterName);
    }

    const urgencyVal = (formData.get('urgency') as UrgencyLevel) || 'warning';

    const reportData: Omit<SurveyReport, 'id'> = {
      zone: formData.get('zone') as string,
      specificLocation: formData.get('specificLocation') as string,
      category: formData.get('category') as string,
      facilityName: formData.get('facilityName') as string,
      urgency: urgencyVal,
      notes: (formData.get('notes') as string) || '',
      reporterName: reporterName || 'Ẩn danh',
      photo: currentPhotoDataUrl,
      location: currentLocation,
      createdAt: Date.now(),
      status: navigator.onLine ? 'synced' : 'draft',
    };

    try {
      if (navigator.onLine) {
        // Mô phỏng gửi dữ liệu lên server
        console.log('Online: Gửi báo cáo lên hệ thống...', reportData);
        await saveReport(reportData);
        showToast('Báo cáo đã được lưu và gửi lên hệ thống!', 'success');
      } else {
        // Offline: Lưu vào IndexedDB
        await saveReport(reportData);
        showToast('Đã lưu bản nháp ngoại tuyến trên thiết bị.', 'info');
      }

      // Reset form & states
      surveyForm.reset();
      currentPhotoDataUrl = null;
      currentLocation = null;
      renderPhotoPreview();
      if (gpsPreviewContainer) gpsPreviewContainer.innerHTML = '';
      if (savedReporterName && reporterInput) {
        reporterInput.value = savedReporterName;
      }

      refreshDraftsCount();
    } catch (error) {
      console.error('Lỗi khi lưu báo cáo:', error);
      showToast('Có lỗi xảy ra khi lưu khảo sát.', 'error');
    }
  });
}

// --- Hiển Thị Danh Sách Bản Nháp ---
async function renderDrafts() {
  if (!draftsList) return;

  try {
    const drafts = await getDraftReports();

    if (drafts.length === 0) {
      draftsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3 class="empty-title">Không có bản nháp nào</h3>
          <p class="empty-desc">Tất cả các báo cáo đã được đồng bộ hoặc chưa có khảo sát mới.</p>
        </div>
      `;
      return;
    }

    draftsList.innerHTML = drafts
      .map((item) => {
        const timeStr = new Date(item.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        const urgencyBadge =
          item.urgency === 'good'
            ? '<span class="badge good">🟢 Bình thường</span>'
            : item.urgency === 'critical'
            ? '<span class="badge critical">🔴 Khẩn cấp</span>'
            : '<span class="badge warning">🟡 Cần sửa</span>';

        const thumbHtml = item.photo
          ? `<img src="${item.photo}" class="draft-thumb" alt="Thumb" />`
          : `<div class="draft-thumb">📦</div>`;

        const coordsStr = item.location
          ? `📍 ${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`
          : '';

        return `
          <div class="draft-card" id="draft-card-${item.id}">
            <div class="draft-card-main">
              ${thumbHtml}
              <div class="draft-details">
                <div class="draft-header-row">
                  <h4 class="draft-facility">${item.facilityName}</h4>
                  ${urgencyBadge}
                </div>
                <div class="draft-meta">
                  <strong>${item.zone}</strong> • ${item.specificLocation}
                </div>
                <div class="draft-meta" style="color: var(--text-muted); font-size: 11px;">
                  Hạng mục: ${item.category} ${coordsStr ? `• ${coordsStr}` : ''}
                </div>
                ${item.notes ? `<div class="draft-notes">"${item.notes}"</div>` : ''}
              </div>
            </div>
            <div class="draft-footer">
              <span class="draft-time">🕒 ${timeStr} • Người báo: ${item.reporterName}</span>
              <div class="draft-actions">
                <button type="button" class="btn-small btn-secondary-outline btn-sync-item" data-id="${item.id}">
                  Gửi ngay
                </button>
                <button type="button" class="btn-small btn-danger-outline btn-delete-item" data-id="${item.id}">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Gắn sự kiện Xóa và Gửi từng item
    document.querySelectorAll('.btn-delete-item').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = Number((e.currentTarget as HTMLElement).dataset.id);
        if (confirm('Bạn có chắc chắn muốn xóa bản nháp này?')) {
          await deleteReport(id);
          renderDrafts();
          refreshDraftsCount();
          showToast('Đã xóa bản nháp.', 'info');
        }
      });
    });

    document.querySelectorAll('.btn-sync-item').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        if (!navigator.onLine) {
          showToast('Không có kết nối mạng để gửi báo cáo.', 'error');
          return;
        }
        const id = Number((e.currentTarget as HTMLElement).dataset.id);
        await syncSingleDraft(id);
      });
    });
  } catch (error) {
    console.error('Lỗi hiển thị bản nháp:', error);
  }
}

// --- Đồng Bộ Từng Bản Nháp ---
async function syncSingleDraft(id: number) {
  try {
    showToast('Đang gửi báo cáo lên máy chủ...', 'info');
    // Giả lập độ trễ mạng
    await new Promise((r) => setTimeout(r, 800));
    await updateReportStatus(id, 'synced');
    showToast('Đã gửi báo cáo thành công!', 'success');
    renderDrafts();
    refreshDraftsCount();
  } catch (error) {
    console.error('Lỗi khi đồng bộ item:', error);
    showToast('Gửi báo cáo thất bại.', 'error');
  }
}

// --- Đồng Bộ Tất Cả ---
async function syncAllDrafts(isAuto: boolean = false) {
  if (!navigator.onLine) {
    if (!isAuto) showToast('Không có kết nối Internet để đồng bộ!', 'error');
    return;
  }

  const drafts = await getDraftReports();
  if (drafts.length === 0) {
    if (!isAuto) showToast('Không có bản nháp nào cần đồng bộ.', 'info');
    return;
  }

  btnSyncAll.disabled = true;
  btnSyncAll.innerHTML = '<span>⏳</span> Đang đồng bộ...';

  try {
    for (const draft of drafts) {
      if (draft.id) {
        await new Promise((r) => setTimeout(r, 500));
        await updateReportStatus(draft.id, 'synced');
      }
    }
    showToast(`Đã đồng bộ thành công ${drafts.length} bản ghi!`, 'success');
  } catch (error) {
    console.error('Lỗi đồng bộ tất cả:', error);
    showToast('Có lỗi xảy ra trong quá trình đồng bộ.', 'error');
  } finally {
    btnSyncAll.disabled = false;
    btnSyncAll.innerHTML = '<span>⚡</span> Đồng bộ tất cả';
    renderDrafts();
    refreshDraftsCount();
  }
}

btnSyncAll?.addEventListener('click', () => syncAllDrafts(false));

// --- Modal Cài đặt & Tải file APK / PWA ---
const installModal = document.getElementById('install-modal') as HTMLElement;
const btnOpenInstallModal = document.getElementById('btn-open-install-modal') as HTMLButtonElement;
const btnCloseInstallModal = document.getElementById('btn-close-install-modal') as HTMLButtonElement;
const btnDownloadApk = document.getElementById('btn-download-apk') as HTMLAnchorElement;
const btnPwaInstall = document.getElementById('btn-pwa-install') as HTMLButtonElement;
const pwaGuideText = document.getElementById('pwa-guide-text') as HTMLElement;

let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Ngăn chặn prompt mặc định của trình duyệt để tự quản lý
  e.preventDefault();
  deferredPrompt = e;
  if (btnPwaInstall) {
    btnPwaInstall.innerHTML = '<span>🚀</span> Cài đặt ngay ứng dụng PWA';
  }
});

btnOpenInstallModal?.addEventListener('click', () => {
  installModal?.classList.remove('hidden');
});

btnCloseInstallModal?.addEventListener('click', () => {
  installModal?.classList.add('hidden');
});

// Click ra ngoài thẻ modal để đóng
installModal?.addEventListener('click', (e) => {
  if (e.target === installModal) {
    installModal.classList.add('hidden');
  }
});

// Bấm Escape để đóng modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !installModal?.classList.contains('hidden')) {
    installModal?.classList.add('hidden');
  }
});

// Thông báo khi bấm tải APK
btnDownloadApk?.addEventListener('click', () => {
  showToast('Đang tải file vku-survey.apk (8.7 MB)... Mở file sau khi tải xong để cài đặt nhé!', 'success');
});

// Kích hoạt PWA Install
btnPwaInstall?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Cảm ơn bạn đã cài đặt VKU Field Survey!', 'success');
      installModal?.classList.add('hidden');
    }
    deferredPrompt = null;
  } else {
    showToast('Trình duyệt hiện tại chưa hỗ trợ cài đặt trực tiếp. Vui lòng làm theo hướng dẫn bên dưới.', 'info');
    if (pwaGuideText) {
      pwaGuideText.style.color = 'var(--vku-blue)';
      pwaGuideText.style.fontWeight = 'bold';
    }
  }
});

// --- Đăng Ký Service Worker (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[SW] Service Worker đã đăng ký thành công:', reg.scope))
      .catch((err) => console.error('[SW] Lỗi đăng ký Service Worker:', err));
  });
}