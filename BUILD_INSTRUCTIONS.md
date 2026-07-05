# 🏗️ GP45 Build Instructions

## 📋 Prerequisites

### Option 1: Local Build (Linux/Mac)
```bash
# Required tools
- Java JDK 11+
- Android SDK (build-tools, platform 33)
- zipalign & apksigner (from Android SDK)

# Install Android SDK (Ubuntu/Debian)
sudo apt update && sudo apt install -y wget unzip
wget https://dl.google.com/android/repository/commandlinetools-linux-10406988_latest.zip
unzip commandlinetools-linux-*.zip -d ~/android-cmdline
mkdir -p ~/Android/Sdk/cmdline-tools && mv cmdline-tools ~/Android/Sdk/cmdline-tools/latest
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
yes | sdkmanager "build-tools;34.0.0" "platforms;android-33"
```

### Option 2: GitHub Actions (Auto)
Just push to `main` branch. The workflow in `.github/workflows/build.yml` will:
1. Build the APK automatically
2. Upload it as a build artifact
3. If you push a tag (e.g., `v1.1.0`), it creates a Release with the APK

## 🔨 Building

```bash
# Clone the repo
git clone https://github.com/fanny341/45-checker.git
cd 45-checker

# Make build script executable
chmod +x build.sh

# Build with version
bash build.sh 1.1.0 1
#          ^^^^^ ^
#          ver   code

# APK output:
# - output/GP45_v1.1.0.apk
# - Copied to /sdcard/Download/ if available
```

## 📱 Installing on Android

1. Copy APK to phone or download from GitHub Releases/Artifacts
2. Open the APK file on your Android device (min SDK 21 / Android 5.0+)
3. Allow installation from unknown sources if prompted
4. Open the app — database loads automatically from bundled JSON

## 🌐 Connecting to Server

The app connects to `http://192.168.6.200/grand.php` for:
- Online search (`action=cari`)
- Item details (`action=detail`)
- Sales data (`action=omset`)
- Database sync (`action=sync`)

### Setting up a local dev server
Place `grand.php` in your web server (XAMPP, etc.) and update the IP via:
```
Menu ☰ → Setting Server → Enter IP → Simpan & Test
```

## 📁 Project Structure

```
├── assets/
│   ├── index.html              # HTML structure
│   ├── style.css               # All styles
│   ├── app.js                  # Core logic
│   ├── pricecard.js            # Price Card + OMSET
│   ├── server81.js             # Online search
│   ├── scanner.js              # QR scanner + swipe
│   ├── relay.js                # Relay mode + OMSET bulan
│   ├── data_*.json             # Bundled database (45k+ items)
│   ├── data_outlet.json        # Outlet stock
│   ├── html5-qrcode.min.js     # QR library
│   ├── ic_launcher.png         # App icon
│   └── logo.jpg                # Logo
├── template/template.apk       # Base APK template
├── build.sh                    # Build script
├── AndroidManifest.xml         # Android manifest
├── PRO_BUILD_REFERENCE.md      # PRO version notes
└── .github/workflows/build.yml # CI workflow
```

## 🔑 Keystore

If the keystore doesn't exist, `build.sh` auto-generates one:
- **Alias:** `gp45`
- **Password:** `android`
- **File:** `keystore/gp45.keystore`

> ⚠️ Auto-generated keystore changes every time it's regenerated.
> Keep `keystore/gp45.keystore` if you want consistent signing.
