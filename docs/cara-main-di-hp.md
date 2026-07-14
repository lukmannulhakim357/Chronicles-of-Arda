# Cara Main di HP 📱

Game ini adalah **game browser** (HTML5) — tidak ada APK dan tidak perlu
install aplikasi game apa pun di HP. Yang dibutuhkan cuma browser
(Chrome/Safari/Firefox). Ada 3 cara menjalankannya, dari yang paling gampang:

---

## Opsi 1 — Buka lewat internet (GitHub Pages) ⭐ paling gampang

Tidak perlu install apa-apa. Cukup aktifkan GitHub Pages sekali, setelah itu
game bisa dibuka dari mana saja lewat link.

**Langkah aktivasi (sekali saja, lewat browser HP/PC):**

1. Buka repositori ini di GitHub → tab **Settings**.
2. Menu kiri → **Pages**.
3. Di bagian **Build and deployment** → **Source**, pilih **GitHub Actions**.
4. Merge/push branch ini ke branch **main** (workflow deploy-nya ada di
   `.github/workflows/deploy.yml` dan jalan otomatis setiap push ke main).
5. Tunggu ±1–2 menit (lihat tab **Actions** sampai hijau ✅).
6. Game bisa dibuka di:

   **`https://lukmannulhakim357.github.io/Chronicles-of-Arda/`**

**Biar rasanya seperti aplikasi:**

- **Android (Chrome)**: buka link di atas → menu ⋮ → **Tambahkan ke layar
  utama** (Add to Home screen) → ikon game muncul di home screen, dan
  terbuka fullscreen tanpa address bar.
- **iPhone (Safari)**: buka link → tombol Share (kotak+panah) → **Add to
  Home Screen**.

> ⚠️ Catatan save: progres tersimpan di penyimpanan browser (localStorage).
> Jangan "Hapus data situs / Clear browsing data" untuk situs ini kalau tidak
> mau save hilang. Main dari browser yang sama supaya save-nya ketemu terus.

---

## Opsi 2 — Dari PC/laptop, HP ikut lewat WiFi

Cocok untuk development: edit kode di PC, tes langsung di HP.
Yang di-install cuma di **PC** (HP tidak perlu install apa pun):

1. **Install Node.js LTS** di PC → unduh dari <https://nodejs.org> (pilih
   versi LTS, install biasa sampai selesai). Node.js sudah termasuk `npm`.
2. Ambil kode game — salah satu dari:
   - `git clone https://github.com/lukmannulhakim357/Chronicles-of-Arda.git`
     (kalau ada Git), atau
   - tombol hijau **Code → Download ZIP** di GitHub, lalu ekstrak.
3. Buka terminal/Command Prompt di folder proyek, lalu:

   ```bash
   npm install
   npm run dev:host
   ```

4. Di terminal akan muncul beberapa alamat, cari yang **Network**, misalnya
   `http://192.168.1.7:5173`.
5. Pastikan **HP dan PC tersambung ke WiFi yang sama**, lalu buka alamat
   Network tadi di browser HP. Selesai — langsung main.

Kalau tidak muncul alamat Network: cek firewall PC (izinkan Node.js), atau
cari IP PC manual (`ipconfig` di Windows / `ip addr` di Linux-Mac) lalu buka
`http://IP-PC:5173` di HP.

---

## Opsi 3 — Sepenuhnya di HP Android (tanpa PC), pakai Termux

Untuk yang mau semuanya jalan di HP. Aplikasi yang perlu di-install:
**Termux** (terminal Linux untuk Android).

1. Install **Termux dari F-Droid**: <https://f-droid.org/packages/com.termux/>
   (versi Play Store sudah tidak di-update — jangan pakai yang itu).
2. Buka Termux, jalankan perintah berikut satu per satu:

   ```bash
   pkg update -y
   pkg install -y git nodejs-lts
   git clone https://github.com/lukmannulhakim357/Chronicles-of-Arda.git
   cd Chronicles-of-Arda
   npm install --omit=optional
   npm run dev
   ```

   (`--omit=optional` melewati tool build asset & testing yang memang tidak
   dibutuhkan untuk main, dan belum tentu bisa terpasang di Android.)

3. Setelah muncul tulisan `Local: http://localhost:5173`, **jangan tutup
   Termux** — minimize saja.
4. Buka **Chrome di HP yang sama** → ketik alamat: `http://localhost:5173`.
5. Main! Untuk berhenti: kembali ke Termux, tekan `Ctrl+C` (tombol CTRL ada
   di baris tombol ekstra Termux).

Lain kali tinggal: buka Termux → `cd Chronicles-of-Arda && npm run dev` →
buka `localhost:5173` lagi.

---

## Kontrol di HP 🎮

| Aksi | Cara |
|---|---|
| Jalan | Sentuh & seret di **separuh kiri layar** (joystick virtual muncul di bawah jempol) |
| Bicara / Periksa / Hampiri | Tombol bundar **kanan bawah** (labelnya berubah sesuai konteks) |
| Serang | Tombol **Attack** (muncul saat ada musuh) |
| Lanjutkan dialog | Ketuk kotak dialog |
| Pilih jawaban dialog | Ketuk salah satu tombol pilihan |
| Menu (Save / Road West / Keluar) | Tombol **☰** kanan atas |

**Save**: simpan kapan saja lewat ☰ → *Save*. Game juga autosave tiap masuk
zona dan tiap progres quest. Dari layar judul, ketuk *Continue the Journey*
untuk melanjutkan.

---

## Masalah umum

- **Layar putih/kosong** → refresh halaman; pastikan alamatnya benar
  (termasuk `/Chronicles-of-Arda/` di akhir untuk opsi 1).
- **Save hilang** → biasanya karena data browser dibersihkan, atau buka lewat
  browser/mode berbeda (mode incognito tidak menyimpan save).
- **Opsi 2: HP tidak bisa akses alamat Network** → HP & PC harus satu WiFi;
  matikan sementara firewall/VPN; beberapa WiFi kantor/kampus memblokir
  koneksi antar-perangkat (pakai hotspot HP sebagai alternatif: PC connect ke
  hotspot HP, lalu buka IP yang muncul).
- **Termux: `npm install` error** → pastikan pakai `--omit=optional`, dan
  Termux dari F-Droid (bukan Play Store).
