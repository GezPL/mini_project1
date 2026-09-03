import { initDB, saveDraft, getAllDrafts, deleteDraft } from './db.ts';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

initDB();

const surveyForm = document.getElementById('survey-form') as HTMLFormElement;
const networkStatusLabel = document.getElementById('network-status');

// --- Form Handling ---
if (surveyForm) {
  surveyForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const formData = new FormData(surveyForm);
    const newSurvey = {
      facilityName: formData.get('facility-name') as string,
      locationArea: formData.get('location-area') as string,
      conditionStatus: formData.get('condition-status') as string,
      notes: formData.get('notes') as string,
      timestamp: Date.now(),
      status: (navigator.onLine ? 'synced' : 'draft') as 'synced' | 'draft'
    };

    if (navigator.onLine) {
      // Simulate direct server upload
      console.log('Online: Sending data directly to server...', newSurvey);
      alert('Report saved to server!');
    } else {
      // Offline: Save to IndexedDB
      try {
        await saveDraft(newSurvey);
        console.log('Offline: Draft saved to IndexedDB');
        alert('You are offline. Saved as draft.');
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
    surveyForm.reset();
  });
}

// --- Network Status & Sync Logic ---
function updateNetworkStatus() {
  const badge = document.getElementById('network-badge'); // Update this line
  const networkStatusLabel = document.getElementById('network-status');
  
  if (navigator.onLine) {
    if (badge && networkStatusLabel) {
      badge.className = 'status-badge online'; // Update this line
      networkStatusLabel.textContent = 'Online';
    }
    syncDrafts();
  } else {
    if (badge && networkStatusLabel) {
      badge.className = 'status-badge offline'; // Update this line
      networkStatusLabel.textContent = 'Offline';
    }
  }
}

async function syncDrafts() {
  const drafts = await getAllDrafts();
  if (drafts.length === 0) return;

  console.log(`Found ${drafts.length} drafts to sync.`);
  
  for (const draft of drafts) {
    if (!draft.id) continue;
    try {
      // Simulate API call to server
      console.log(`Syncing draft ID ${draft.id} to server...`);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      // If success, remove from IndexedDB
      await deleteDraft(draft.id);
      console.log(`Draft ID ${draft.id} synced and removed from local storage.`);
    } catch (error) {
      console.error(`Failed to sync draft ID ${draft.id}`, error);
    }
  }
  
  if (drafts.length > 0) {
    alert(`${drafts.length} offline report(s) have been synced successfully!`);
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus(); // Initial check

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered', reg.scope))
      .catch((err) => console.error('SW failed', err));
  });
}

const btnCamera = document.getElementById('btn-camera');
const btnGps = document.getElementById('btn-gps');
const photoPreview = document.getElementById('photo-preview');
const gpsPreview = document.getElementById('gps-preview');

// Camera implementation
if (btnCamera && photoPreview) {
  btnCamera.addEventListener('click', async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      
      if (image.dataUrl) {
        photoPreview.innerHTML = `
          <img src="${image.dataUrl}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" alt="Survey Photo" />
        `;
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  });
}

// GPS implementation
if (btnGps && gpsPreview) {
  btnGps.addEventListener('click', async () => {
    try {
      gpsPreview.innerHTML = 'Fetching location...';
      const coordinates = await Geolocation.getCurrentPosition();
      
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      
      gpsPreview.innerHTML = `
        <div style="margin-top: 10px; padding: 10px; background: #e9ecef; border-radius: 6px;">
          <strong>Location:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
      `;
    } catch (error) {
      console.error('GPS error:', error);
      gpsPreview.innerHTML = '<span style="color: red;">Failed to get location. Ensure permissions are granted.</span>';
    }
  });
}