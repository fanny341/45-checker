// GP45 - scanner.js

// ════════════════════════════════════════
// SCANNER
// ════════════════════════════════════════

function toggleScanner() {
  if (scannerActive) { stopScanner(); return; }
  document.getElementById('scannerContainer').classList.add('show');
  setTimeout(function() { startScanner(); }, 300);
}

function startScanner() {
  scannerActive = true;
  if (html5QrCode) { try { html5QrCode.stop(); } catch(e) {} try { html5QrCode.clear(); } catch(e) {} }
  try {
    html5QrCode = new Html5Qrcode('scannerElement');
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 8, 
        videoConstraints: { facingMode: "environment", focusMode: "continuous", width: { ideal: 640 }, height: { ideal: 480 } },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E
        ]
      },
      onScanSuccess, function() {}
    ).then(function() {
      if (!localStorage.getItem("gp45_first_launch")) showManual();
    })
    .catch(function(e) {
      showToast('Camera: ' + e.message);
      scannerActive = false;
      if (!localStorage.getItem("gp45_first_launch")) showManual();
    });
  } catch(e) { scannerActive = false; }
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
    if (torchOn) { btn.classList.add('on'); btn.textContent = '⛱ Matikan'; }
    else { btn.classList.remove('on'); btn.textContent = '⛱ Lampu'; }
  }
}

function stopScanner() {
  scannerActive = false;
  if (torchOn) { torchOn = false;
    try { var v = document.querySelector('#scannerElement video'); if(v&&v.srcObject){var t=v.srcObject.getVideoTracks()[0];if(t)t.applyConstraints({advanced:[{torch:false}]});} } catch(e){} }

  if (html5QrCode) { try { html5QrCode.stop(); } catch(e) {} try { html5QrCode.clear(); } catch(e) {} }
  document.getElementById('scannerContainer').classList.remove('show');
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
  try { navigator.vibrate(100); } catch(e) {}
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

// ════════════════════════════════════════
// SWIPE TO CHANGE TAB
// ════════════════════════════════════════

var tabOrder = ['localdb', 'server81'];
var touchStartX = 0;
var touchStartY = 0;

// Swipe on page but NOT on search bar (biar scrolling/scrolling gak ganti tab)
document.addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].screenX;
  touchStartY = e.touches[0].screenY;
}, {passive: true});

document.addEventListener('touchend', function(e) {
  // Skip if touch started on search input or search section
  var target = e.target;
  while (target) {
    if (target.id === 'searchInput' || target.classList.contains('search-section') || target.closest('.search-wrap')) return;
    target = target.parentElement;
  }
  
  var deltaX = e.changedTouches[0].screenX - touchStartX;
  var deltaY = e.changedTouches[0].screenY - touchStartY;
  
  // Only horizontal swipe, ignore vertical scroll
  if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;
  if (Math.abs(deltaX) < 40) return;
  
  var currentIdx = tabOrder.indexOf(currentMode);
  if (currentIdx === -1) return;
  
  if (deltaX < 0) {
    // Swipe left → next tab
    if (currentIdx < tabOrder.length - 1) setMode(tabOrder[currentIdx + 1]);
  } else {
    // Swipe right → prev tab
    if (currentIdx > 0) setMode(tabOrder[currentIdx - 1]);
  }
}, {passive: true});

