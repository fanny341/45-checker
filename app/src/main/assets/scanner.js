// GP45 - scanner.js (v2 - simple camera switch + native bridge)

var _cameraIds = [];
var _camIdx = 0;

function toggleScanner() {
  if (scannerActive) { stopScanner(); return; }
  document.getElementById('scannerContainer').classList.add('show');
  
  // Use native scanner if available (AndroidScanner bridge)
  if (window.AndroidScanner) {
    var el = document.getElementById('scannerElement');
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;background:var(--bg2)"><div style="font-size:48px;margin-bottom:12px">📷</div><div style="font-size:16px;font-weight:700;color:var(--text)">Native Scanner Active</div><div style="font-size:12px;color:var(--text2);margin-top:4px">Arahkan ke barcode...</div></div>';
    }
    scannerActive = true;
    AndroidScanner.startScan('onNativeScanResult');
    if (!localStorage.getItem("gp45_first_launch")) showManual();
    return;
  }
  
  setTimeout(function() { startScanner(); }, 300);
}

function startScanner() {
  scannerActive = true;
  if (html5QrCode) { try { html5QrCode.stop(); } catch(e) {} try { html5QrCode.clear(); } catch(e) {} }
  try {
    html5QrCode = new Html5Qrcode('scannerElement');
    
    var config = { facingMode: 'environment' };
    var vidConstraints = { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } };
    
    // If a specific camera ID was selected, use it
    if (_cameraIds.length > 0 && _camIdx < _cameraIds.length) {
      config.deviceId = { exact: _cameraIds[_camIdx] };
      delete config.facingMode;
      vidConstraints.deviceId = { exact: _cameraIds[_camIdx] };
      delete vidConstraints.facingMode;
    }
    
    html5QrCode.start(
      config,
      { fps: 8, 
        videoConstraints: vidConstraints,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E
        ]
      },
      onScanSuccess, function() {}
    ).then(function() {
      // Enumerate cameras after scanner starts
      enumerateCameras();
      // Camera optimization: continuous autofocus + zoom
      setTimeout(function() {
        try {
          var v = document.querySelector('#scannerElement video');
          if (v && v.srcObject) {
            var t = v.srcObject.getVideoTracks()[0];
            if (t && t.getCapabilities) {
              var caps = t.getCapabilities();
              var c = {};
              if (caps.focusMode && caps.focusMode.includes('continuous')) c.focusMode = 'continuous';
              if (caps.zoom) c.zoom = Math.min(2.5, caps.zoom.max);
              if (Object.keys(c).length > 0) t.applyConstraints(c);
            }
          }
        } catch(e) {}
      }, 800);
      updateCamLabel();
      if (!localStorage.getItem("gp45_first_launch")) showManual();
    })
    .catch(function(e) {
      // If camera fails with specific ID, try next
      if (_cameraIds.length > 0) {
        _camIdx = (_camIdx + 1) % _cameraIds.length;
        if (_camIdx === 0) { // cycled through all
          showToast('Camera: ' + e.message);
          scannerActive = false;
          if (!localStorage.getItem("gp45_first_launch")) showManual();
          return;
        }
        stopScanner();
        setTimeout(function() { startScanner(); }, 300);
      } else {
        showToast('Camera: ' + e.message);
        scannerActive = false;
        if (!localStorage.getItem("gp45_first_launch")) showManual();
      }
    });
  } catch(e) { scannerActive = false; }
}

// Native scanner result callback
function onNativeScanResult(code) {
  if (!code || code === '') return;
  playBeep();
  if (window.AndroidUtils) AndroidUtils.vibrate(100);
  else try { navigator.vibrate(100); } catch(e) {}
  stopScanner();
  document.getElementById('searchInput').value = code;
  document.getElementById('clearBtn').classList.add('show');
  if (currentMode === 'server81') {
    doServer81SearchProgressive(code);
    setTimeout(function() {
      var r = window._lastResults;
      if (r && r.length > 0) selectItem(0);
      else showToast('Barcode tidak ditemukan di server');
    }, 500);
  } else {
    var results = searchItems(code);
    if (results.length > 0) { showSuggestions(results); selectItem(0); }
    else { showToast('Barcode tidak ditemukan'); }
  }
}

function enumerateCameras() {
  if (window.AndroidScanner) return; // Native scanner handles camera selection
  navigator.mediaDevices.enumerateDevices().then(function(devices) {
    var cams = devices.filter(function(d) { return d.kind === 'videoinput'; });
    // Filter out front cameras
    var backCams = cams.filter(function(c) {
      var l = (c.label || '').toLowerCase();
      return l.indexOf('front') < 0 && l.indexOf('selfie') < 0 && l.indexOf('wajah') < 0;
    });
    if (backCams.length > 0) _cameraIds = backCams.map(function(c) { return c.deviceId; });
    else _cameraIds = cams.map(function(c) { return c.deviceId; });
    
    // Show/hide switch button
    var btn = document.getElementById('switchCamBtn');
    if (btn) btn.style.display = _cameraIds.length > 1 ? 'inline-flex' : 'none';
    
    updateCamLabel();
  }).catch(function() {});
}

function updateCamLabel() {
  if (window.AndroidScanner) return; // Native scanner handles camera selection
  var label = document.getElementById('camLabel');
  if (!label) return;
  if (_cameraIds.length > 0) {
    label.textContent = (_camIdx + 1) + '/' + _cameraIds.length;
    label.style.display = _cameraIds.length > 1 ? 'inline' : 'none';
  } else {
    label.style.display = 'none';
  }
}

function switchCamera() {
  if (_cameraIds.length < 2) return;
  _camIdx = (_camIdx + 1) % _cameraIds.length;
  if (scannerActive) { stopScanner(); setTimeout(function() { startScanner(); }, 300); }
}

function toggleTorch() {
  torchOn = !torchOn;
  try {
    var video = document.querySelector('#scannerElement video');
    if (video && video.srcObject) {
      var track = video.srcObject.getVideoTracks()[0];
      if (track) {
        track.applyConstraints({ advanced: [{ torch: torchOn }] });
      }
    }
  } catch(e) {}
  var btn = document.getElementById('torchBtn');
  if (btn) {
    if (torchOn) { btn.classList.add('on'); btn.textContent = '\u26d1 Matikan'; }
    else { btn.classList.remove('on'); btn.textContent = '\u26d1 Lampu'; }
  }
}

function stopScanner() {
  scannerActive = false;
  if (window.AndroidScanner) {
    try { AndroidScanner.stopScan(); } catch(e) {}
  }
  if (torchOn) { torchOn = false;
    try { var v = document.querySelector('#scannerElement video'); if(v&&v.srcObject){var t=v.srcObject.getVideoTracks()[0];if(t)t.applyConstraints({advanced:[{torch:false}]});} } catch(e){} }
  if (html5QrCode) { try { html5QrCode.stop(); } catch(e) {} try { html5QrCode.clear(); } catch(e) {} }
  document.getElementById('scannerContainer').classList.remove('show');
  // Restore scanner element display
  var el = document.getElementById('scannerElement');
  if (el) el.style.display = 'block';
}

function playBeep() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

function onScanSuccess(decodedText) {
  playBeep();
  if (window.AndroidUtils) AndroidUtils.vibrate(100);
  else try { navigator.vibrate(100); } catch(e) {}
  stopScanner();
  document.getElementById('searchInput').value = decodedText;
  document.getElementById('clearBtn').classList.add('show');
  if (currentMode === 'server81') {
    doServer81SearchProgressive(decodedText);
    setTimeout(function() {
      var r = window._lastResults;
      if (r && r.length > 0) selectItem(0);
      else showToast('Barcode tidak ditemukan di server');
    }, 500);
  } else {
    var results = searchItems(decodedText);
    if (results.length > 0) { showSuggestions(results); selectItem(0); }
    else { showToast('Barcode tidak ditemukan'); }
  }
}

// Tab swipe
var tabOrder = ['localdb', 'server81'];
var touchStartX = 0;
var touchStartY = 0;

document.addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].screenX;
  touchStartY = e.touches[0].screenY;
}, {passive: true});

document.addEventListener('touchend', function(e) {
  var target = e.target;
  while (target) {
    if (target.id === 'searchInput' || target.classList.contains('search-section') || target.closest('.search-wrap')) return;
    target = target.parentElement;
  }
  var deltaX = e.changedTouches[0].screenX - touchStartX;
  var deltaY = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;
  if (Math.abs(deltaX) < 40) return;
  var currentIdx = tabOrder.indexOf(currentMode);
  if (currentIdx === -1) return;
  if (deltaX < 0) { if (currentIdx < tabOrder.length - 1) setMode(tabOrder[currentIdx + 1]); } 
  else { if (currentIdx > 0) setMode(tabOrder[currentIdx - 1]); }
}, {passive: true});
