# Generate Laporan Excel Expo

Aplikasi Expo (React Native) untuk membuat laporan Excel dari data lokal dan mengunduh/membagikannya langsung dari perangkat, tanpa internet.

## Fitur

- Generate file `.xlsx` dari data lokal.
- Berjalan offline (tanpa API/internet).
- File disimpan di penyimpanan lokal aplikasi.
- Bisa di-download/di-share lewat menu sistem perangkat.
- UI responsif untuk mobile.

## Menjalankan proyek

```bash
npm install
npm run start
```

Lalu jalankan di perangkat dengan Expo Go (Android/iOS).

## Catatan

- Data laporan saat ini berupa data contoh di `App.tsx` dan bisa disesuaikan.
- File excel dibuat secara lokal menggunakan library `xlsx` dan `expo-file-system`.
