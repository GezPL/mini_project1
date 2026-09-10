# 🏫 VKU Field Survey - Khảo sát & Báo cáo Cơ sở Vật chất

> **Môn học:** Phát triển Ứng dụng Đa nền tảng  
> **Đồ án:** Mini Project 1  
> **Trường:** Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
> **Nền tảng hỗ trợ:** Web (Progressive Web App - PWA) & Mobile (Android qua Capacitor 8)

---

## 📖 Giới thiệu Dự án

**VKU Field Survey** là ứng dụng di động đa nền tảng phục vụ công tác thanh tra, kiểm tra và ghi nhận sự cố cơ sở vật chất (CSVC) tại trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn.

Ứng dụng được thiết kế theo tư duy **Offline-First**, cho phép sinh viên, giảng viên và cán bộ khảo sát hiện trường ngay cả ở những khu vực không có sóng Wi-Fi hoặc mất kết nối 4G/5G. Dữ liệu (kèm ảnh chụp và tọa độ GPS) sẽ được lưu trữ an toàn trong bộ nhớ máy và tự động đồng bộ khi có kết nối Internet.

---

## ✨ Tính năng Nổi bật

### 1. 📴 Khả năng hoạt động Ngoại tuyến (Offline-First)
* **Service Worker thông minh:** Sử dụng chiến lược **Stale-While-Revalidate & Dynamic Runtime Caching**, tự động lưu đệm mọi tài nguyên tĩnh (HTML, CSS bundle, JavaScript, hình ảnh, icon).
* **Offline Navigation Fallback:** Không bị trắng màn hình hay vỡ giao diện CSS khi reload trang lúc không có mạng.
* **Lưu trữ cục bộ IndexedDB v2:** Lưu trữ không giới hạn các bản ghi khảo sát hiện trường trực tiếp trên thiết bị thông qua thư viện `idb`.
* **Đồng bộ tự động & Thủ công:** Tự động phát hiện khi thiết bị khôi phục mạng để đồng bộ dữ liệu, hỗ trợ nút bấm "Đồng bộ tất cả" hoặc gửi từng bản nháp.

### 2. 📱 Trải nghiệm Người dùng Trực quan (Mobile-First UI/UX)
* **Hệ thống 2 Tab mượt mà:**
  * **Tab 📝 Khảo sát mới:** Form nhập liệu được chia làm các thẻ (card) logic theo từng bước.
  * **Tab 📋 Bản nháp:** Hiển thị danh sách các khảo sát đang chờ đồng bộ kèm ảnh thumbnail, thời gian tạo và huy hiệu số lượng nháp (counter badge).
* **Thẻ chọn mức độ hư hỏng trực quan:**
  * 🟢 **Bình thường:** Kiểm tra định kỳ / Thiết bị hoạt động tốt.
  * 🟡 **Cần sửa chữa:** Hỏng nhẹ, chập chờn hoặc có nguy cơ hỏng.
  * 🔴 **Khẩn cấp:** Mất an toàn, nguy hiểm, cần xử lý ngay lập tức.
* **Banner thông báo mạng thông minh:** Cảnh báo trực quan khi mất kết nối mạng và hệ thống **Toast Notifications** hiện đại thay thế các popup `alert()` mặc định.

### 3. 📷 Tích hợp Phần cứng Thiết bị qua Capacitor
* **Chụp ảnh hiện trường (`@capacitor/camera`):** Chụp trực tiếp từ máy ảnh hoặc chọn từ thư viện, hỗ trợ xem trước (preview), chụp lại và xóa ảnh.
* **Định vị GPS (`@capacitor/geolocation`):** Lấy kinh độ / vĩ độ với độ chính xác cao, hiển thị sai số ước tính (mét) và liên kết mở vị trí trực tiếp trên Google Maps.

---

## 🛠️ Công nghệ Sử dụng (Tech Stack)

| Thành phần | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Giao diện & Logic** | HTML5, Modern CSS, TypeScript | Mobile-First UI, Responsive, CSS Variables |
| **Công cụ đóng gói** | Vite 8 | Tốc độ biên dịch siêu tốc, tối ưu hóa bundle |
| **Đa nền tảng (Hybrid)** | Capacitor 8 | `@capacitor/core`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/geolocation` |
| **Cơ sở dữ liệu cục bộ** | IndexedDB (`idb`) | Store `survey-reports` v2 với index tìm kiếm theo trạng thái |
| **PWA & Caching** | Service Worker, Manifest | Web App Manifest, Cache Storage API |
| **Native Android** | Android Gradle, WebView | Target SDK hiện đại, tương thích Android 8.0+ |

---

## 🗂️ Cấu trúc Thư mục

```text
vku-field-survey/
├── android/                   # Project native Android Studio (Capacitor)
├── public/                    # Tài nguyên tĩnh & Service Worker
│   ├── favicon.svg            # Favicon
│   ├── logo-vku.jpg           # Logo thương hiệu VKU
│   ├── manifest.json          # Cấu hình PWA Web App Manifest
│   └── sw.js                  # Service Worker hỗ trợ Offline Caching
├── src/                       # Mã nguồn TypeScript & Stylesheet
│   ├── db.ts                  # Cấu hình IndexedDB v2 & các hàm CRUD
│   ├── main.ts                # Logic chính: Form, Camera, GPS, Tabs, Sync
│   └── style.css              # Giao diện hiện đại phong cách VKU
├── capacitor.config.ts        # Cấu hình Capacitor App (AppID: com.example.app)
├── index.html                 # Trang chủ ứng dụng
├── package.json               # Quản lý thư viện và scripts
└── tsconfig.json              # Cấu hình TypeScript
```

---

## 📊 Cấu trúc Dữ liệu Khảo sát (`SurveyReport`)

```typescript
export interface SurveyReport {
  id?: number;                  // Khóa chính tự tăng (IndexedDB)
  zone: string;                 // Khu vực: Khu V, Khu K, KTX, Khu Thể thao...
  specificLocation: string;     // Vị trí chi tiết: Phòng V.A102, Hành lang Tầng 3...
  category: string;             // Phân loại: Điện, Điều hòa, Máy chiếu/Lab, Bàn ghế...
  facilityName: string;         // Tên thiết bị: Máy chiếu Sony, Quạt trần số 3...
  urgency: 'good' | 'warning' | 'critical'; // Mức độ hư hỏng
  notes: string;                // Mô tả chi tiết hiện trạng
  reporterName: string;         // Tên / Mã SV người báo cáo
  photo: string | null;         // Dữ liệu ảnh hiện trường (Base64 Data URL)
  location: {                   // Tọa độ GPS
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
  createdAt: number;            // Thời gian ghi nhận (timestamp)
  status: 'draft' | 'synced';   // Trạng thái: nháp / đã đồng bộ
}
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
* **Node.js:** Phiên bản 18 trở lên (Khuyến nghị 20+).
* **Android Studio:** (Nếu muốn build và chạy ứng dụng native trên máy ảo hoặc thiết bị Android thật).

### 2. Cài đặt thư viện
Tại thư mục `vku-field-survey`, chạy lệnh:
```bash
npm install
```

### 3. Chạy môi trường phát triển (Web Dev Server)
```bash
npm run dev
```
Truy cập ứng dụng tại địa chỉ hiển thị trên terminal (thường là `http://localhost:5173`).

### 4. Đóng gói ứng dụng (Production Build)
```bash
npm run build
```
Quá trình này sẽ biên dịch TypeScript và đóng gói các tài nguyên tối ưu vào thư mục `dist/`.

### 5. Đồng bộ sang Android (Capacitor)
Sau khi build xong thư mục `dist/`, đồng bộ sang Android bằng lệnh:
```bash
npx cap copy android
```
Hoặc để cập nhật cả plugin:
```bash
npx cap sync android
```

### 6. Mở và Chạy trên Android Studio
```bash
npx cap open android
```
Android Studio sẽ tự động mở dự án. Bạn chỉ cần chọn thiết bị (máy ảo hoặc điện thoại thật) và nhấn **Run (Shift + F10)**.

---

## 🧪 Hướng dẫn Kiểm thử Khả năng Ngoại tuyến (Offline Mode)

1. Mở ứng dụng trên trình duyệt Google Chrome / Microsoft Edge.
2. Nhấn phím `F12` để mở **Developer Tools**.
3. Chuyển sang tab **Network**, tại mục Throttling chọn **Offline**.
4. **Kiểm tra giao diện:**
   * Banner màu cam *"Chế độ Ngoại tuyến"* sẽ xuất hiện ngay phía trên.
   * Viên thuốc trạng thái mạng chuyển sang màu đỏ và hiển thị `Offline`.
5. **Kiểm tra lưu dữ liệu:**
   * Điền thông tin vào form khảo sát, chụp ảnh hoặc lấy GPS.
   * Nhấn nút **"Lưu báo cáo khảo sát"**.
   * Toast thông báo *"Đã lưu bản nháp ngoại tuyến trên thiết bị"* sẽ xuất hiện.
   * Chuyển sang tab **📋 Bản nháp** để xem bản ghi vừa lưu (có hình ảnh và tọa độ).
6. **Kiểm tra tải lại trang khi mất mạng (Offline Reload):**
   * Nhấn `F5` để tải lại trang trong khi vẫn đang ở chế độ **Offline**.
   * Trang web vẫn tải tức thì, CSS và giao diện giữ nguyên 100%, không bị lỗi.
7. **Kiểm tra đồng bộ:**
   * Bật lại mạng sang **No throttling** (Online).
   * Banner tự động ẩn, badge chuyển xanh `Online`.
   * Nhấn nút **"Đồng bộ tất cả"** hoặc **"Gửi ngay"** trên thẻ bản nháp để hoàn tất đồng bộ.

