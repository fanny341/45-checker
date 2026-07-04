# GP45 DB PRO — Build Reference
> Last updated: 30 June 2026

## BASE APK
- **File**: `/tmp/codex-web-uploads/f-km4gwQ/GP45 DB PRO v1.0.0 - PRO Edition.apk`
- **Package**: `moorspangalila.gp45dbpro`
- **classes.dex**: ORIGINAL — jangan diganti (ada `AppChecker` Java bridge)
- **Icons**: ORIGINAL PRO icons (5 density) — jangan diganti

## BUILD METHOD
```
1. Extract PRO APK
2. Hapus file backup (index.html.bak, *.bak, *.web-fixed, *.apk-original)
3. Hapus META-INF
4. Patch ONLY: assets/index.html
5. zip -r -0 -X (STORE, no compression)
6. zipalign
7. apksigner (keystore: gp45.keystore, pass: android, alias: gp45)
8. Output: /sdcard/Download/GP45_DB_PRO_v1.0.0.apk
```

⚠️ Keystore beda dengan PRO asli → user harus uninstall dulu.

## JANGAN PERNAH
- Ganti package name
- Ganti classes.dex
- Hapus checkConflict / AppChecker
- Tambah 141122 extend di checkLockPass
- Gunakan \\uXXXX escape di HTML (pake emoji asli)
- Build sebelum verify braces/dim seimbang

## FILE BACKUP (HAPUS SEBELUM BUILD)
- `assets/index.html.bak`, `assets/index.html.bak-omsetsetting`
- `assets/index.html.omset-bak`, `assets/index.html.omset-bug-bak`
- `assets/index.html.web-fixed`, `assets/index.html.web.bak`
- `assets/index.html.apk-original`

## PRO FEATURES (JANGAN DIHAPUS)

### 1. Lock System — headerLockTap + checkLockPass
```js
function headerLockTap() {
  document.getElementById('lockOverlay').classList.add('show');
  document.getElementById('lockPassScreen').style.display = 'block';
  document.getElementById('lockSettingScreen').style.display = 'none';
  document.getElementById('lockPassInput').value = '';
  document.getElementById('lockPassInput').focus();
}

function closeLockOverlay() {
  document.getElementById('lockOverlay').classList.remove('show');
}

```js
function checkLockPass() {
  var pass = document.getElementById('lockPassInput').value.trim();
  if (pass === MENU_PASS) {
    document.getElementById('lockPassScreen').style.display = 'none';
    document.getElementById('lockSettingScreen').style.display = 'block';
    applyMenuVisToggles();
  } else {
    showToast('❌ Password salah');
    document.getElementById('lockPassInput').value = '';
    document.getElementById('lockPassInput').focus();
  }
}
```

### 2. Setup System — checkSetupPass + finishSetup
```js
function checkSetupPass() {
  var pass = document.getElementById('setupPassInput').value.trim();
  if (pass === 'M0RITZU') {
    document.getElementById('setupPassScreen').style.display = 'none';
    document.getElementById('setupDurationScreen').style.display = 'block';
  } else if (pass === '141122') {
    localStorage.setItem('gp45_temp_last_access', Date.now().toString());
    // Setup default with no trial expiry (just temp pass)
    var defaultVis = { 'pricecard': false };
    localStorage.setItem('gp45_menu_vis', JSON.stringify(defaultVis));
    document.getElementById('setupOverlay').classList.remove('show');
    applyMenuVis();
    showToast('✅ Akses temporary 6 jam');
  } else {
    showToast('❌ Password salah');
    document.getElementById('setupPassInput').value = '';
    document.getElementById('setupPassInput').focus();
  }
}
```

```js
NOT FOUND
```

### 3. Trial — isAppExpired + applyMenuVis
```js
function isAppExpired() {
  var installed = localStorage.getItem('gp45_pro_installed_at');
  var expiryMs = parseInt(localStorage.getItem('gp45_pro_expiry_ms') || '0');
  if (!installed || !expiryMs) return false;
  var elapsed = Date.now() - parseInt(installed);
  return elapsed > expiryMs;
}
```

```js
function applyMenuVis() {
  var vis = getMenuVis();
  var hasConfig = localStorage.getItem('gp45_menu_vis') !== null;
  var items = document.querySelectorAll('.menu-item[data-menu]');
  var expired = isAppExpired();
  
  for (var i = 0; i < items.length; i++) {
    var menu = items[i].getAttribute('data-menu');
    if (expired) {
      items[i].style.display = 'none';
    } else if (vis[menu] === false) {
      items[i].style.display = 'none';
    } else {
      items[i].style.display = '';
    }
  }
  
  // Show expired overlay if needed
  if (expired) {
    document.getElementById('expiredOverlay').classList.add('show');
    var diff = parseInt(localStorage.getItem('gp45_pro_expiry_ms') || '0') / 86400000;
    document.getElementById('expiredMsg').innerHTML = 'Waktu percobaan sudah habis.<br>Silahkan hubungi pengembang.';
    var input = document.getElementById('searchInput');
    if (input) { input.disabled = true; input.placeholder = '⏰ Trial habis...'; }
  }
}

// ── Setup functions ──
```

### 4. Conflict Check — checkConflict
```js
NOT FOUND
```

### 5. Setup Overlay Triggers

**Primary (loadData completion):**
```js
// Show setup overlay on first install (no expiry config yet)
        if (!localStorage.getItem("gp45_pro_expiry_ms")) {
          setTimeout(function() { document.getElementById('setupOverlay').classList.add('show'); }, 600);
        }
```

**Cached IDB path:**
```js
NOT FOUND
```

**End of file (fallback):**
```js
NOT FOUND
```

### 6. gpApi + Server IP
```js
NOT FOUND

function gpApi(action, extra) {
  return 'http://' + getServerIP() + '/grand.php?key=123' + (action ? '&action=' + action : '') + (extra ? '&' + extra : '');
}
```

## FEATURES DARI v1.8.2 (WAJIB ADA)
- gpApi() + getServerIP() + saveServerIP()
- Default sales preset:
  - L1: Brayen, Darren, Raydel, Pricilia, Franklyn, Genio
  - L2: Mario, Johanes, Rivaldo, Moors
  - Inactive: Reagen, Yoshua
- OMSET perbulan (Bulan Ini) — tab Harian/Bulan, grand total, target/org
- OMSET row: Trx + items display
- Font 15px di OMSET
- Icons emoji asli (bukan \\uXXXX escape)
- loadOmset() tab switching (active class toggle)
- showOmsetPanel() checks isBulan state
