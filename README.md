# GP45 Checker

**GP45 Stock & Price Lookup** — Aplikasi Android WebView untuk cek stok dan harga barang di Grand Hardware. Bisa offline dengan database bundled, online langsung ke server 200, atau via Cloudflare Relay.

## ✨ Fitur

| Fitur | Description |
|-------|-------------|
| 🔍 **Search** | Cari barang by nama (multi-keyword AND) atau barcode |
| 📋 **3 Mode** | OFFLINE (bundled JSON), ONLINE (server 200), RELAY (Cloudflare Worker) |
| 📷 **Scanner** | QR/Barcode scanner dengan torch & beep |
| 💰 **Price Card** | Buat daftar harga item, simpan, lihat riwayat |
| 📈 **OMSET** | Lihat penjualan per sales per hari & per bulan, grouping per lantai |
| 🔄 **Sync** | Update database offline langsung dari server toko |
| 🎨 **Dark Mode** | Toggle tema gelap/terang |
| 📋 **Copy** | Salin nama + harga barang ke clipboard |
| 🏪 **Branch Stock** | Lihat stok di semua cabang (GP45, dll) |
| 💾 **IndexedDB** | Caching otomatis setelah load pertama |

## 📱 Screenshots

<p align="center">
  <img src="assets/ic_launcher.png" width="100" alt="GP45 Checker">
</p>

## 🚀 Cara Install

1. Download APK terbaru dari **Releases** atau copy dari `/sdcard/Download/`
2. Buka di Android (min SDK 21 / Android 5.0+)
3. Izinkan instalasi dari sumber tidak dikenal
4. Buka aplikasi — database akan load otomatis

### Connect ke Server Toko

Pastikan HP terhubung ke **WiFi toko** (192.168.6.200), lalu:

- **OFFLINE** — langsung bisa, data sudah dibundled
- **ONLINE** — otomatis connect ke server 200
- **RELAY** — butuh URL Cloudflare Worker

Setting IP server bisa diubah via Menu ☰ → **Setting Server**

## 🛠 Build dari Source

### Prasyarat

- Android SDK (build-tools, platform 33)
- Java / JDK 11+
- `zipalign` dan `apksigner` (dari Android SDK)

### Build

```bash
git clone https://github.com/fanny341/45-checker.git
cd 45-checker

# Siapkan template APK di template/template.apk
# Jalankan build
bash build.sh <version> <version_code>

# Contoh:
bash build.sh 1.1.0 1
```

Output APK: `output/GP45_v1.1.0.apk` dan di-copy ke `/sdcard/Download/`

### Template APK

Butuh template APK dasar (WebView dengan package `com.moors.gp45`). Letakkan di `template/template.apk`.

## 📁 Struktur Project

```
├── assets/
│   ├── index.html        # HTML structure
│   ├── style.css         # All CSS (351 lines)
│   ├── app.js            # Core logic (654 lines)
│   ├── pricecard.js      # Price card + omset (1363 lines)
│   ├── server81.js       # Online search (206 lines)
│   ├── scanner.js        # Scanner + swipe (144 lines)
│   ├── relay.js          # Relay mode + omset bulan (445 lines)
│   ├── ic_launcher.png   # App icon
│   ├── data_*.json       # Bundled item database (not in repo)
│   └── data_outlet.json  # Outlet stock (not in repo)
├── build.sh              # Build script
├── AndroidManifest.xml   # App manifest
├── PRO_BUILD_REFERENCE.md
└── res/                  # Android resources
```

## 📡 Server API

Aplikasi ini membutuhkan `grand.php` di server 200 (`192.168.6.200`):

```
http://192.168.6.200/grand.php?key=123&action=...
```

### Endpoints

| Action | Parameter | Description |
|--------|-----------|-------------|
| `cari` | `q` | Cari barang by nama/barcode |
| `detail` | `kode` | Detail barang + stok cabang |
| `omset` | `date` | Omset per sales per tanggal |
| `sync` | — | Download full database |

## 👨‍💻 Developer

**Fanny** — [@fanny341](https://github.com/fanny341)

## 📄 License

Private — Internal use for Grand Hardware.
