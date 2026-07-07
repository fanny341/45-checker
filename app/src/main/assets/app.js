// GP45 - app.js


// ════════════════════════════════════════
// SEARCH HISTORY
// ════════════════════════════════════════
var SearchHistory = {};
(function() {
  var KEY = 'gp45_search_history';
  var MAX = 20;
  var saved = [];
  
  function ld() {
    try { saved = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch(e) { saved = []; }
  }
  function sv() {
    localStorage.setItem(KEY, JSON.stringify(saved));
  }
  
  SearchHistory.save = function(item) {
    if (!item || !item.k) return;
    ld();
    for (var i = 0; i < saved.length; i++) {
      if (saved[i].k === item.k) { saved.splice(i, 1); break; }
    }
    saved.unshift({
      k: item.k,
      n: item.n || item.Nama || item.nama || '',
      h: Number(item.h || item.HJual || item.harga_jual || 0),
      b: item.b || item.Barcode || item.barcode || '',
      t: Date.now()
    });
    if (saved.length > MAX) saved.length = MAX;
    sv();
    SearchHistory.render();
  };
  
  SearchHistory.render = function(containerId) {
    var list = containerId ? document.getElementById(containerId) : document.getElementById('historyBelowList');
    if (!list) return;
    ld();
    if (saved.length === 0) { list.innerHTML = '<div style="text-align:center;padding:8px;font-size:11px;color:var(--text2)">Belum ada riwayat</div>'; return; }
    var h = '';
    var n = Math.min(saved.length, 5);
    for (var i = 0; i < n; i++) {
      var it = saved[i];
      var p = it.h > 0 ? 'Rp' + Number(it.h).toLocaleString('id-ID') : '';
      h += '<div class="history-item" onclick="SearchHistory.openByIndex(' + i + ')">' +
        '<span class="hi-icon">📦</span>' +
        '<div class="hi-info"><div class="hi-name">' + esc(it.n) + '</div><div class="hi-meta">' + esc(it.k) + (it.b ? ' | ' + esc(it.b) : '') + '</div></div>' +
        '<div class="hi-price">' + p + '</div>' +
        '<div class="hi-time">' + getTimeAgo(it.t) + '</div></div>';
    }
    list.innerHTML = h;
  };
  
  SearchHistory.openByIndex = function(idx) {
    ld();
    if (idx < 0 || idx >= saved.length) return;
    var it = saved[idx];
    if (typeof allItems !== 'undefined' && allItems.length > 0) {
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].k === it.k || allItems[i].b === it.k || allItems[i].b2 === it.k) {
          showResult(allItems[i]);
          return;
        }
      }
    }
    if (it.k) { showServer81Detail(it.k, it.b || it.k); }
  };
  
  SearchHistory.showAll = function() {
    ld();
    var panel = document.getElementById('histOverlay');
    var list = document.getElementById('histFullList');
    if (!panel || !list) return;
    if (saved.length === 0) {
      list.innerHTML = '<div class="empty-state"><span>📭</span>Belum ada riwayat pencarian</div>';
    } else {
      var h = '';
      for (var i = 0; i < saved.length; i++) {
        var it = saved[i];
        var p = it.h > 0 ? 'Rp' + Number(it.h).toLocaleString('id-ID') : '';
        h += '<div class="history-item" onclick="SearchHistory.openByIndex(' + i + ');SearchHistory.hideAll()">' +
          '<span class="hi-icon">📦</span>' +
          '<div class="hi-info"><div class="hi-name">' + esc(it.n) + '</div><div class="hi-meta">' + esc(it.k) + (it.b ? ' | ' + esc(it.b) : '') + '</div></div>' +
          '<div class="hi-price">' + p + '</div>' +
          '<div class="hi-time">' + getTimeAgo(it.t) + '</div></div>';
      }
      list.innerHTML = h + '<div style="text-align:center;font-size:11px;color:var(--text2);margin-top:8px">Total ' + saved.length + ' riwayat</div>';
    }
    panel.classList.add('show');
  };
  
  SearchHistory.hideAll = function() {
    var panel = document.getElementById('histOverlay');
    if (panel) panel.classList.remove('show');
  };
  
  SearchHistory.clearAll = function() {
    if (!confirm('Hapus semua riwayat pencarian?')) return;
    localStorage.removeItem(KEY);
    saved = [];
    SearchHistory.render();
    SearchHistory.hideAll();
    showToast('Riwayat dihapus');
  };
  
  // Attach UI button listeners
  setTimeout(function() {
    var b1 = document.getElementById('histShowAllBtn');
    var b2 = document.getElementById('histCloseBtn');
    var b3 = document.getElementById('histClearAllBtn');
    var b4 = document.getElementById('histBelowShowAllBtn');
    var ov = document.getElementById('histOverlay');
    if (b1) b1.onclick = SearchHistory.showAll;
    if (b2) b2.onclick = SearchHistory.hideAll;
    if (b3) b3.onclick = SearchHistory.clearAll;
    if (b4) b4.onclick = SearchHistory.showAll;
    if (ov) ov.onclick = function(e) { if (e.target === this) SearchHistory.hideAll(); };
  }, 50);
})();

function getTimeAgo(ts) {
  if (!ts) return '';
  var diff = Date.now() - ts;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru';
  if (mins < 60) return mins + 'm lalu';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'j lalu';
  var days = Math.floor(hours / 24);
  if (days < 7) return days + 'h lalu';
  return Math.floor(days / 7) + 'mgg lalu';
}

var allItems = [];
var outletStockData = null; // Will hold data_outlet.json in memory
var totalChunks = 5;
var dbInfo = { version: '4.0', date: '23 Jun 2026', items: 41158, source: 'server 200' };
var currentMode = 'localdb';
var isLoading = false;  // Prevent sync during data loading
var html5QrCode = null;
var scannerActive = false;
var torchOn = false;
var searchTimeout = null;
var liveTimeout = null;
var pingInterval = null;
var lastLiveQuery = '';

var _serverIP = '192.168.6.200';
function getServerIP() {
  var ip = localStorage.getItem('gp45_server_ip');
  if (ip) _serverIP = ip;
  return _serverIP;
}
function saveServerIP(ip) {
  ip = (ip || '').trim();
  if (!ip) return;
  localStorage.setItem('gp45_server_ip', ip);
  _serverIP = ip;
  showToast('✅ Server IP: ' + ip);
}
function gpApi(action, extra) {
  return 'http://' + getServerIP() + '/grand.php?key=123' + (action ? '&action=' + action : '') + (extra ? '&' + extra : '');
}

// ════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════

function loadData() 
{
  isLoading = true;
  var status = document.getElementById('statusText');
  var input = document.getElementById('searchInput');
  var count = document.getElementById('itemCount');
  var progress = document.getElementById('progressFill');
  var sub = document.getElementById('loadingSub');
  var loadText = document.getElementById('loadingText');
  var loadingSection = document.getElementById('loadingSection');
  var failedChunks = [];
  
  function loadNext(i) { 
    if (i >= totalChunks) {
      progress.style.width = '100%';
      var msg = allItems.length.toLocaleString() + ' items ready!'; 
      if (failedChunks.length > 0) msg += ' (' + failedChunks.length + ' chunks skipped)';
      sub.textContent = msg;
      setTimeout(function() {
        loadingSection.style.display = "none";
        status.textContent = allItems.length.toLocaleString() + " items [offline]";
        var aboutDb = document.getElementById("aboutDbCount");
        if (aboutDb) aboutDb.textContent = allItems.length.toLocaleString() + " item";
        input.disabled = false;
        input.focus();
        // Set last update info
        // Set initial timestamp: bundled data is fresh from server
        if (!localStorage.getItem("gp45_lu_v26")) {
          localStorage.setItem("gp45_lu_v26", Date.now().toString());
        }
        loadBundledOutletStock();
        updateLastUpdateDisplay();
        status.textContent = allItems.length.toLocaleString() + ' items [offline]';
        renderDbInfo();
        SearchHistory.render();
        isLoading = false;
        input.disabled = false;
        input.focus();
        // Auto-select OFFLINE mode after data loads
        setMode('localdb');
      }, 400);
      return;
    }
    sub.textContent = 'Loading ' + (i+1) + '/' + totalChunks + '...';
    progress.style.width = ((i / totalChunks) * 100) + '%';
    
    loadChunk(i).then(function(chunk) {
      if (chunk && chunk.length) {
        Array.prototype.push.apply(allItems, chunk.map(mapItem));
        
      } else {
        
      }
      count.textContent = '[items] ' + allItems.length.toLocaleString();
      loadNext(i + 1);
    }).catch(function(err) {
      failedChunks.push(i);
      loadNext(i + 1); // SKIP failed chunk, continue loading
    });
  }
  loadNext(0);
}

function loadBundledOutletStock() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data_outlet.json', true);
  xhr.onload = function() {
    if (xhr.status === 0 || xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        outletStockData = (data && data.stocks) ? data.stocks : data;
        if (!outletStockData || typeof outletStockData !== 'object') outletStockData = null;
        console.log('[Outlet] Loaded ' + (outletStockData ? Object.keys(outletStockData).length : 0) + ' items into memory');
        // Update any visible detail card's offline stock
        var resultCard = document.getElementById('resultCard');
        if (resultCard && resultCard.classList.contains('show')) {
          var bsGrid = resultCard.querySelector('.bs-grid');
          if (!bsGrid) {
            // Result card visible but no branch stock - re-render if item visible
            var nameEl = resultCard.querySelector('.name');
            if (nameEl) {
              // Find item by name in allItems and re-show if found
              var itemName = nameEl.textContent;
              for (var i = 0; i < allItems.length; i++) {
                if (allItems[i] && allItems[i].n === itemName) {
                  showBranchStock('offlineBranchStock', allItems[i], allItems[i].k);
                  break;
                }
              }
            }
          }
        }
      } catch(e) { console.log('[Outlet] Failed to parse bundled outlet stock', e); }
    }
  };
  xhr.onerror = function() { console.log('[Outlet] Failed to fetch bundled outlet stock'); };
  xhr.timeout = 30000;
  xhr.send();
}

function mapItem(it) {
  if (!it) return it;
  if (it.k !== undefined) return it; // already mapped
  return {
    k: it.Kode || it.k || '',
    n: it.Nama || it.n || '',
    b: it.Barcode || it.b || '',
    h: parseFloat(it.HJual || it.h || 0),
    hb: parseFloat(it.HBeli || it.hb || 0),
    q: parseFloat(it.Stok || it.q || 0),
    m: it.Merek || it.m || '',
    s: it.Satuan || it.s || '',
    h2: parseFloat(it.HJual2 || it.h2 || 0),
    h3: parseFloat(it.HJual3 || it.h3 || 0),
    q2: parseFloat(it.Qty2 || it.q2 || 0),
    q3: parseFloat(it.Qty3 || it.q3 || 0),
    hk: parseFloat(it.HK || it.hk || 0),
    hk_nama: it.HK_Nama || it.hk_nama || '',
    hk_expiry: it.HK_Expiry || it.hk_expiry || ''
  };
}
function loadChunk(idx) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data_' + idx + '.json', true); 
    xhr.onload = function() {
      if (xhr.status === 0 || xhr.status === 200) {
        try {  resolve(JSON.parse(xhr.responseText)); }
        catch(e) {  reject(new Error('Parse error chunk ' + idx)); }
      } else { reject(new Error('HTTP ' + xhr.status + ' chunk ' + idx)); }
    };
    xhr.onerror = function() {  reject(new Error('Failed chunk ' + idx)); };
    xhr.timeout = 15000;
    xhr.send();
  });
}

// ════════════════════════════════════════
// MODE SWITCHING
// ════════════════════════════════════════

function setMode(mode) {
  currentMode = mode;
  document.getElementById('modeLocalDB').className = 'mode-btn' + (mode === 'localdb' ? ' active' : '');
  document.getElementById('modeServer81').className = 'mode-btn' + (mode === 'server81' ? ' active' : '');
  
  // Hide all mode-specific bars
  document.getElementById('syncInfo').classList.remove('show');
  document.getElementById('connBar').style.display = 'none';
  clearInterval(pingInterval);
  document.getElementById('liveBarServer81').style.display = 'none';
  document.getElementById('liveBarLocalDB').style.display = 'none';
  document.getElementById('liveArea').style.display = 'none';
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('suggestions').classList.remove('show');
  document.getElementById('searchInput').value = '';
  document.getElementById('clearBtn').classList.remove('show');
  
  if (mode === 'localdb') {
    document.getElementById('statusBar').style.display = 'flex';
    document.getElementById('liveBarLocalDB').style.display = 'block';
    document.getElementById('syncInfo').classList.add('show');
    document.getElementById('searchInput').placeholder = 'Cari di database offline...';
    document.getElementById('liveArea').style.display = 'block';
    document.getElementById('historyBelow').style.display = 'block';
    // Show last update time
    updateLastUpdateDisplay();
    renderDbInfo();
    SearchHistory.render('historyBelowList');
  } else if (mode === 'server81') {
    document.getElementById('statusBar').style.display = 'flex';
    document.getElementById('liveBarServer81').style.display = 'block';
    document.getElementById('connBar').style.display = 'flex';
    document.getElementById('searchInput').placeholder = 'Cari di server 200...';
    document.getElementById('liveArea').style.display = 'block';
    clearInterval(pingInterval);
    pingServer200();
    pingInterval = setInterval(pingServer200, 5000);
  }
}

// Shared precision filter: word-boundary AND matching
function precisionFilter(items, query, mode) {
  if (mode === 'barcode') return items; // server handles barcode search
  var keywords = query.trim().toLowerCase().split(/[\s,]+/).filter(function(kw) { return kw.length > 0; });
  if (keywords.length === 0) return items;
  
  // Use indexOf AND matching (not strict word boundary)
  return items.filter(function(item) {
    var n = (item.n || '').toLowerCase();
    for (var j = 0; j < keywords.length; j++) {
      if (n.indexOf(keywords[j]) === -1) return false;
    }
    return true;
  });
}

function searchItems(query) {
  if (!query || query.trim().length < 1) return [];
  query = query.trim().toLowerCase();
  var keywords = query.split(/[\s,]+/).filter(function(kw) { return kw.length > 0; });
  if (keywords.length === 0) return [];

  var seen = {};
  var results = [];

  // Skip name search if query is all digits (likely barcode, not item name)
  var cleanQuery = query.replace(/[\s,]+/g, '');
  var isDigitQuery = cleanQuery.length >= 3 && /^[\d]+$/.test(cleanQuery);

  if (!isDigitQuery) {
    // Phase 1: AND name match (multi-word)
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!item) continue;
      if (seen[item.k || i]) continue;
      var n = (item.n || '').toLowerCase();
      var matchAll = true;
      for (var j = 0; j < keywords.length; j++) {
        if (n.indexOf(keywords[j]) === -1) { matchAll = false; break; }
      }
      if (matchAll) {
        seen[item.k || i] = true;
        results.push(item);
      }
    }
  }

  // Phase 2: AND barcode/kode match (same logic as Phase 1)
  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];
    if (!item || seen[item.k || i]) continue;
    var ik = (item.k || '').toLowerCase();
    var ib = (item.b || '').toLowerCase();
    var ib2 = (item.b2 || '').toLowerCase();
    
    var matchAll = true;
    for (var j = 0; j < keywords.length; j++) {
      var kw = keywords[j];
      if (ik.indexOf(kw) === -1 && ib.indexOf(kw) === -1 && ib2.indexOf(kw) === -1) {
        matchAll = false;
        break;
      }
    }
    if (matchAll) results.push(item);
  }

  // Sort: stock > 0 first
  results.sort(function(a, b) {
    var sa = parseFloat(a.q) || 0;
    var sb = parseFloat(b.q) || 0;
    if (sa > 0 && sb <= 0) return -1;
    if (sa <= 0 && sb > 0) return 1;
    return 0;
  });

  return results.slice(0, 50);
}

function showSuggestions(results) {
  var el = document.getElementById('suggestions');
  if (!results || results.length === 0) {
    el.innerHTML = '<div class="no-results">🔍 Barang tidak ditemukan</div>';
    el.classList.add('show'); window._lastResults = []; return;
  }
  var html = '';
  for (var i = 0; i < results.length; i++) {
    var item = results[i];
    var price = item.h > 0 ? 'Rp' + Number(item.h).toLocaleString('id-ID') : '-';
    var sc = item.q > 5 ? 'avail' : (item.q > 0 ? 'low' : 'empty');
    var sl = item.q > 0 ? Number(item.q).toFixed(0) : '0';
    html += '<div class="item" onclick="selectItem(' + i + ')"><div class="info"><div class="name">' + esc(item.n) + '</div><div class="bcode">' + esc(item.b || item.b2 || '') + '</div></div><div class="price">' + price + '</div><div class="stock ' + sc + '">' + sl + '</div></div>';
  }
  el.innerHTML = html; el.classList.add('show');
  window._lastResults = results;
}

function selectItem(idx) {
  var r = window._lastResults;
  if (!r || !r[idx]) return;
  showResult(r[idx]);
  document.getElementById('suggestions').classList.remove('show');
  document.getElementById('searchInput').value = r[idx].n || r[idx].k;
  document.getElementById('clearBtn').classList.add('show');
}

function showResult(item) {
  if (!item) { document.getElementById('resultCard').classList.remove('show'); return; }
  SearchHistory.save(item);
  var card = document.getElementById('resultCard');
  var sc = item.q > 0 ? 'avail' : 'empty';
  var sl = item.q > 0 ? '✅ Stok: ' + Number(item.q).toFixed(0) + ' ' + (item.s || '') : '❌ Stok Habis';
  var isLocalDB = (currentMode === 'localdb');
  
  // Extra info for the info grid
  var extras = '';
  extras += '<div class="cell"><div class="lbl">Kode</div><div class="val">' + esc(item.k) + '</div></div>';
  extras += '<div class="cell"><div class="lbl">Barcode</div><div class="val">' + esc(item.b || '-') + '</div></div>';
  if (item.b2) extras += '<div class="cell"><div class="lbl">Barcode 2</div><div class="val">' + esc(item.b2) + '</div></div>';
  extras += '<div class="cell"><div class="lbl">Satuan</div><div class="val">' + esc(item.s || '-') + '</div></div>';
  if (item.m && item.m.trim()) extras += '<div class="cell"><div class="lbl">Merek</div><div class="val">' + esc(item.m) + '</div></div>';
  if (item.hb > 0) extras += '<div class="cell"><div class="lbl">Harga Beli</div><div class="val">Rp' + Number(item.hb).toLocaleString('id-ID') + '</div></div>';
  if (item.h2 > 0) extras += '<div class="cell"><div class="lbl">HJual 2</div><div class="val">Rp' + Number(item.h2).toLocaleString('id-ID') + '</div></div>';
  if (item.h3 > 0) extras += '<div class="cell"><div class="lbl">HJual 3</div><div class="val">Rp' + Number(item.h3).toLocaleString('id-ID') + '</div></div>';
  if (item.hm > 0 && item.hm != item.h) extras += '<div class="cell"><div class="lbl">Harga Member</div><div class="val">Rp' + Number(item.hm).toLocaleString('id-ID') + '</div></div>';
  
  // Unified card: Big Price + Info Grid + Branch Stock
  var modeLabel = isLocalDB ? 'OFFLINE' : (currentMode === 'server81' ? 'ONLINE' : 'OFFLINE');
  card.innerHTML = 
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div class="name" style="flex:1">' + esc(item.n) + '</div><button class="copy-np-btn" data-nama="' + escAttr(item.n) + '" data-harga="' + escAttr(Number(item.h || 0).toLocaleString('id-ID')) + '" style="background:none;border:none;font-size:20px;padding:4px 8px;cursor:pointer;color:var(--primary)">📋</button></div>' +
    // Big Price
    '<div class="price-section">' +
      '<div class="price-big"><span class="rp">Rp</span>' + Number(item.h || 0).toLocaleString('id-ID') + '</div>' +
    '</div>' +
    // H2 section (harga grosir)
    (item.h2 && item.h2 > 0 && item.h2 < item.h ? 
      '<div class="h2-section">' +
        '<div class="h2-row"><div class="h2-left"><span class="h2-icon">📦</span><span class="h2-label">Grosir</span></div><span class="h2-price">Rp' + Number(item.h2).toLocaleString('id-ID') + ' <span class="h2-sat">/' + (item.s || '') + '</span></span></div>' +
        '<div class="h2-tags"><span class="h2-tag">Min. ' + (item.q2 > 0 ? Number(item.q2).toFixed(0) + ' ' + (item.s || '') : '?') + '</span><span class="h2-tag orange">Hemat Rp' + Number((item.h - item.h2) * (item.q2 || 1)).toLocaleString('id-ID') + '</span><span class="h2-tag green">Total Rp' + Number(item.h2 * (item.q2 || 1)).toLocaleString('id-ID') + '</span></div>' +
      '</div>' : '') +
    // HK section (only if hk > 0)
    (item.hk && item.hk > 0 ? 
      '<div class="hk-section">' +
        '<button class="hk-toggle" onclick="toggleHKPanel(this)">' +
          '<span class="hk-toggle-left"><span class="hk-badge">HK</span> <span>Rp' + Number(item.hk).toLocaleString('id-ID') + '</span></span>' +
          '<span class="hk-arrow">▼</span>' +
        '</button>' +
        '<div class="hk-detail" style="display:none">' +
          '<div class="hk-detail-row"><span class="hk-lbl">Harga HK</span><span class="hk-val hk-price">Rp' + Number(item.hk).toLocaleString('id-ID') + '</span></div>' +
          '<div class="hk-detail-row"><span class="hk-lbl">Harga Reguler</span><span class="hk-val"><span class="hk-coret">Rp' + Number(item.h).toLocaleString('id-ID') + '</span></span></div>' +
          '<div class="hk-detail-row"><span class="hk-lbl">Hemat</span><span class="hk-val" style="color:var(--green)">Rp' + Number(item.h - item.hk).toLocaleString('id-ID') + '</span></div>' +
          '' + (item.hk_nama ? '<div class="hk-detail-row"><span class="hk-lbl">Nama Promo</span><span class="hk-val" style="font-weight:400;font-size:11px;color:var(--accent)">' + item.hk_nama + '</span></div>' : '') + (item.hk_expiry ? '<div class="hk-detail-row"><span class="hk-lbl">Berlaku s/d</span><span class="hk-val" style="font-weight:400;font-size:11px;color:#e74c3c">' + item.hk_expiry.split(' ')[0] + '</span></div>' : '') + '<div class="hk-detail-row"><span class="hk-lbl">Info</span><span class="hk-val" style="font-weight:400;font-size:11px;color:var(--text2)">Harga Khusus — hubungi kasir untuk validasi</span></div>' +
        '</div>' +
      '</div>' : '') +
    '<div class="stock-row ' + sc + '" style="margin:8px 0">' + sl + '</div>' +
    '<div class="detail-title">📋 ' + modeLabel + '</div>' +
    '<div class="info-grid">' + extras + '</div>' +
    '<div id="offlineBranchStock" style="margin-top:10px;padding:12px;background:var(--bg);border-radius:10px;text-align:center;font-size:13px;color:var(--text2)">🔄 Mengambil stok cabang...</div>';
  
  card.classList.add('show');
  card.scrollIntoView({behavior:'smooth',block:'center'});
  // Show search history below card (OFFLINE tab)
  if (currentMode === 'localdb' || currentMode === 'offline') {
    var hb = document.getElementById('historyBelow');
    if (hb) hb.style.display = 'block';
    SearchHistory.render('historyBelowList');
  } else {
    var hb = document.getElementById('historyBelow');
    if (hb) hb.style.display = 'none';
  }
  
  // Branch stock: 2 sources (offline, server 200)
  var q = item.k || item.b;
  showBranchStock('offlineBranchStock', item, q);
}
function doClearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('suggestions').classList.remove('show');
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('clearBtn').classList.remove('show');
  document.getElementById('searchInput').focus();
  if (currentMode === 'localdb' || currentMode === 'offline') {
    SearchHistory.render('historyBelowList');
  }
}

function esc(t) { return !t ? '' : String(t).replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }
function escAttr(t) { return !t ? '' : String(t).replace(/[&"]/g, function(m) { return ({'&':'&amp;','"':'&quot;'})[m]; }); }

// ════════════════════════════════════════
// MENU
// ════════════════════════════════════════

function toggleMenu() { 
  var menu = document.getElementById('menuDropdown');
  var isOpen = menu.classList.contains('show');
  menu.classList.toggle('show');
}
function closeMenu() { 
  document.getElementById('menuDropdown').classList.remove('show'); 
}
// Close menu when tapping outside
document.addEventListener('click', function(e) {
  var menu = document.getElementById('menuDropdown');
  if (!menu.classList.contains('show')) return;
  if (e.target.closest('.menu-dropdown') || e.target.closest('.menu-btn')) return;
  menu.classList.remove('show');
});

// ════════════════════════════════════════
// SETTINGS
function toggleTheme() {
  var body = document.body;
  var isDark = body.classList.toggle("dark");
  localStorage.setItem("gp45_theme", isDark ? "dark" : "light");
  // Update menu text
  var menuItems = document.querySelectorAll(".menu-item");
  for (var i = 0; i < menuItems.length; i++) {
    if (menuItems[i].textContent.indexOf("Dark Mode") >= 0 || menuItems[i].textContent.indexOf("Light Mode") >= 0) {
      menuItems[i].textContent = (isDark ? "☀️ Light Mode" : "🎨 Dark Mode");
    }
  }
}

// Auto-restore theme on load
(function() {
  if (localStorage.getItem("gp45_theme") === "dark") {
    document.body.classList.add("dark");
    // Update menu text after DOM loads
    setTimeout(function() {
      var menuItems = document.querySelectorAll(".menu-item");
      for (var i = 0; i < menuItems.length; i++) {
        if (menuItems[i].textContent.indexOf("Dark Mode") >= 0 || menuItems[i].textContent.indexOf("Light Mode") >= 0) {
          menuItems[i].textContent = "☀️ Light Mode";
        }
      }
    }, 100);
  }
})();
// ════════════════════════════════════════

// ════════════════════════════════════════
// SEARCH INPUT HANDLER
// ════════════════════════════════════════

document.getElementById('searchInput').addEventListener('focus', function() {
  SearchHistory.render();
});

document.getElementById('searchInput').addEventListener('blur', function() {
});

document.getElementById('searchInput').addEventListener('input', function() {

  var val = this.value.trim();
  document.getElementById('clearBtn').classList.toggle('show', val.length > 0);
  clearTimeout(searchTimeout);
  clearTimeout(liveTimeout);
  
  if (val.length < 1) {
    document.getElementById('suggestions').classList.remove('show');
    document.getElementById('resultCard').classList.remove('show');
    doClearSearch();
    SearchHistory.render();
    return;
  }
  
  if (currentMode === 'server81') {
    // ONLINE: live search from server with progressive fallback
    liveTimeout = setTimeout(function() { doServer81SearchProgressive(val); }, 300);
  } else {
    // offline or localdb - both use offline data
    searchTimeout = setTimeout(function() { showSuggestions(searchItems(val)); }, 120);
  }
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (currentMode === 'server81') {
      clearTimeout(liveTimeout); doServer81SearchProgressive(this.value.trim());
    } else {
      var r = window._lastResults; if (r && r.length > 0) selectItem(0);
    }
  }
});

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════

function showToast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2500);
}

// ════════════════════════════════════════
// INIT - first launch manual moved to after camera permission
// ════════════════════════════════════════
// ════════════════════════════════════════
// HK TOGGLE
// ════════════════════════════════════════
function copyText(str) {
  if (!str) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str);
    } else {
      var ta = document.createElement("textarea");
      ta.value = str;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  } catch(e) {}
}

function toggleHKPanel(btn) {
  var detail = btn.nextElementSibling;
  if (!detail) return;
  var isOpen = detail.style.display === 'block';
  detail.style.display = isOpen ? 'none' : 'block';
  var arrow = btn.querySelector('.hk-arrow');
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
}

loadData();

