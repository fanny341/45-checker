// GP45 - pricecard.js

// ════════════════════════════════════════
// SERVER IP (from sync panel)
// ════════════════════════════════════════
function saveSyncServerIp() {
  var raw = document.getElementById('syncServerIp').value.trim();
  if (!raw) { showToast('⚠️ Isi IP server dulu'); return; }
  raw = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  var ip = raw.split(':')[0];
  saveServerIP(ip);
  var status = document.getElementById('syncPingStatus');
  status.textContent = '⏳';
  status.style.color = 'var(--text2)';
  var controller = new AbortController();
  var t = setTimeout(function() { controller.abort(); }, 8000);
  var t0 = Date.now();
  fetch(gpApi('sync'), { signal: controller.signal })
    .then(function(r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var ms = Date.now() - t0;
      status.textContent = '✅ ' + ms + 'ms';
      status.style.color = 'var(--green)';
      showToast('✅ Server: ' + ip + ' (' + ms + 'ms)');
    })
    .catch(function(err) {
      clearTimeout(t);
      status.textContent = err.name === 'AbortError' ? '❌ Timeout' : '❌ Gagal';
      status.style.color = 'var(--primary)';
    });
}

function saveHistServerIp() {
  var raw = document.getElementById('histServerIp').value.trim();
  if (!raw) { showToast('⚠️ Isi IP server dulu'); return; }
  raw = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  var ip = raw.split(':')[0];
  saveServerIP(ip);
  var status = document.getElementById('histPingStatus');
  status.textContent = '⏳';
  status.style.color = 'var(--text2)';
  var controller = new AbortController();
  var t = setTimeout(function() { controller.abort(); }, 8000);
  var t0 = Date.now();
  fetch(gpApi('sync'), { signal: controller.signal })
    .then(function(r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var ms = Date.now() - t0;
      status.textContent = '✅ ' + ms + 'ms';
      status.style.color = 'var(--green)';
    })
    .catch(function(err) {
      clearTimeout(t);
      status.textContent = err.name === 'AbortError' ? '❌ Timeout' : '❌ Gagal';
      status.style.color = 'var(--primary)';
    });
}

// Init server IP in sync panels
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var inp = document.getElementById('syncServerIp');
    if (inp) { inp.value = getServerIP(); }
    var hip = document.getElementById('histServerIp');
    if (hip) { hip.value = getServerIP(); }
  }, 100);
});


// ════════════════════════════════════════
// RELAY STUB (relay.js not loaded - this keeps branch stock from crashing)
// ════════════════════════════════════════
function getRelayUrl() {
  var u = localStorage.getItem('gp45_relay_url');
  if (!u) { u = ''; }
  return u;
}

// ════════════════════════════════════════
// PRICE CARD
// ════════════════════════════════════════
var pcCart = [];

function showPriceCardPanel() {
  closeMenu();
  document.getElementById('pcOverlay').classList.add('show');
  document.getElementById('pcSearch').value = '';
  document.getElementById('pcResults').style.display = 'none';
  document.getElementById('pcResults').innerHTML = '';
  document.getElementById('pcName').value = '';
  pcCart = [];
  renderPCCart();
  loadPCHistory();
}

function closePriceCard() {
  document.getElementById('pcOverlay').classList.remove('show');
}

// PC search - from offline database
document.getElementById('pcSearch').addEventListener('input', function() {
  var val = this.value.trim().toLowerCase();
  var res = document.getElementById('pcResults');
  if (val.length < 1) { res.style.display = 'none'; res.innerHTML = ''; return; }
  var keywords = val.split(/[\s,]+/).filter(function(kw) { return kw.length > 0; });
  if (keywords.length === 0) { res.style.display = 'none'; res.innerHTML = ''; return; }
  var seen = {};
  var found = [];
  // Phase 1: AND name match (multi-word)
  for (var i = 0; i < allItems.length; i++) {
    var it = allItems[i];
    if (!it) continue;
    if (seen[it.k || i]) continue;
    var n = (it.n || '').toLowerCase();
    var matchAll = true;
    for (var j = 0; j < keywords.length; j++) {
      if (n.indexOf(keywords[j]) === -1) { matchAll = false; break; }
    }
    if (matchAll) {
      seen[it.k || i] = true;
      found.push(it);
    }
  }
  // Phase 2: AND kode/barcode match
  for (var i = 0; i < allItems.length; i++) {
    var it = allItems[i];
    if (!it || seen[it.k || i]) continue;
    var ik = (it.k || '').toLowerCase();
    var ib = (it.b || '').toLowerCase();
    var matchAll = true;
    for (var j = 0; j < keywords.length; j++) {
      if (ik.indexOf(keywords[j]) === -1 && ib.indexOf(keywords[j]) === -1) {
        matchAll = false; break;
      }
    }
    if (matchAll) found.push(it);
  }
  // Sort: stock > 0 first
  found.sort(function(a, b) {
    var sa = parseFloat(a.q) || 0;
    var sb = parseFloat(b.q) || 0;
    if (sa > 0 && sb <= 0) return -1;
    if (sa <= 0 && sb > 0) return 1;
    return 0;
  });
  found = found.slice(0, 50);
  if (found.length === 0) {
    res.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text2);font-size:13px">Barang tidak ditemukan</div>';
    res.style.display = 'block';
    return;
  }
  var html = '';
  for (var i = 0; i < found.length; i++) {
    var it = found[i];
    var count = pcCart.filter(function(c) { return c.k === it.k; }).length;
    if (count > 0) {
      html += '<div class="pc-result-item"><div class="info"><div class="name">' + esc(it.n) + '</div><div class="sub">Rp' + Number(it.h || 0).toLocaleString('id-ID') + ' \u2022 ' + esc(it.m || '-') + '</div></div><div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;font-weight:600;color:var(--green)">\u2714 ' + count + '</span><button class="pc-add-btn" onclick="pcAddItem(\'' + it.k + '\')">+</button></div></div>';
    } else {
      html += '<div class="pc-result-item"><div class="info"><div class="name">' + esc(it.n) + '</div><div class="sub">Rp' + Number(it.h || 0).toLocaleString('id-ID') + ' \u2022 ' + esc(it.m || '-') + '</div></div><button class="pc-add-btn" onclick="pcAddItem(\'' + it.k + '\')">+ Tambah</button></div>';
    }
  }
  res.innerHTML = html;
  res.style.display = 'block';
});

function pcAddItem(kode) {
  var item = null;
  for (var i = 0; i < allItems.length; i++) {
    if (allItems[i].k === kode) { item = allItems[i]; break; }
  }
  if (!item) return;
  pcCart.push({k: item.k, n: item.n, h: item.h, b: item.b, qty: 1});
  showToast('\u2714 +1 ' + item.n.substring(0, 25));
  renderPCCart();
  var evt = document.createEvent('HTMLEvents'); evt.initEvent('input', false, true);
  document.getElementById('pcSearch').dispatchEvent(evt);
}

function pcAdjustQty(kode, delta) {
  var indices = [];
  for (var i = 0; i < pcCart.length; i++) {
    if (pcCart[i].k === kode) indices.push(i);
  }
  if (delta > 0) {
    // Add copies
    var ref = pcCart[indices[0]];
    for (var j = 0; j < delta; j++) {
      pcCart.push({k: ref.k, n: ref.n, h: ref.h, b: ref.b, qty: 1});
    }
  } else {
    // Remove copies
    var toRemove = Math.min(Math.abs(delta), indices.length);
    for (var r = 0; r < toRemove; r++) {
      var idx = -1;
        for (var fi = 0; fi < pcCart.length; fi++) {
          if (pcCart[fi].k === kode) { idx = fi; break; }
        }
      if (idx >= 0) pcCart.splice(idx, 1);
    }
  }
  renderPCCart();
  var evt = document.createEvent('HTMLEvents'); evt.initEvent('input', false, true);
  document.getElementById('pcSearch').dispatchEvent(evt);
}

function pcRemoveItem(kode) {
  pcCart = pcCart.filter(function(c) { return c.k !== kode; });
  renderPCCart();
  var evt = document.createEvent('HTMLEvents'); evt.initEvent('input', false, true);
  document.getElementById('pcSearch').dispatchEvent(evt);
}

function renderPCCart() {
  document.getElementById('pcCartCount').textContent = pcCart.length;
  var el = document.getElementById('pcCartItems');
  if (pcCart.length === 0) { el.innerHTML = '<div style="text-align:center;padding:8px;color:var(--text2);font-size:12px">Belum ada item</div>'; document.getElementById('pcSaveBtn').disabled = true; return; }
  document.getElementById('pcSaveBtn').disabled = false;
  var groups = {};
  for (var i = 0; i < pcCart.length; i++) {
    var it = pcCart[i];
    if (!groups[it.k]) groups[it.k] = {k: it.k, n: it.n, h: it.h, count: 0};
    groups[it.k].count++;
  }
  var html = '';
  for (var k in groups) {
    var g = groups[k];
    html += '<div class="pc-cart-item"><div class="info"><div class="name">' + esc(g.n) + '</div><div class="sub">Rp' + Number(g.h || 0).toLocaleString('id-ID') + '</div></div><div style="display:flex;align-items:center;gap:4px"><button class="pc-qty-btn" onclick="pcAdjustQty(\'' + k + '\',-1)">\u2212</button><span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">' + g.count + '</span><button class="pc-qty-btn" onclick="pcAdjustQty(\'' + k + '\',1)">+</button><button class="pc-rm-btn" onclick="pcRemoveItem(\'' + k + '\')">\u2716</button></div></div>';
  }
  el.innerHTML = html;
}

function savePriceCard() {
  var nama = document.getElementById('pcName').value.trim();
  if (!nama) { showToast('\u26a0\ufe0f Isi nama price card'); document.getElementById('pcName').focus(); return; }
  if (pcCart.length === 0) { showToast('\u26a0\ufe0f Belum ada item'); return; }
  // Show confirmation panel
  var groups = {};
  for (var i = 0; i < pcCart.length; i++) { var it = pcCart[i]; if (!groups[it.k]) groups[it.k] = {n: it.n, h: it.h, count: 0}; groups[it.k].count++; }
  var html = '<div class="pc-confirm-overlay" id="pcConfirmOverlay" onclick="if(event.target===this)closePCConfirm()"><div class="pc-confirm-panel"><div style="font-size:16px;font-weight:700;margin-bottom:8px">\ud83d\udcb0 Simpan Price Card</div>';
  html += '<div style="font-size:13px;color:var(--text2);margin-bottom:10px">Nama: <b>' + esc(nama) + '</b></div>';
  html += '<div style="font-size:12px;max-height:180px;overflow-y:auto;margin-bottom:8px">';
  for (var k in groups) { var g = groups[k]; html += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);font-size:12px"><span>' + esc(g.n.substring(0,45)) + '</span><span style="font-weight:600">\u00d7 ' + g.count + '</span></div>'; }
  html += '</div>';
  html += '<div style="font-size:14px;font-weight:600;text-align:right;margin-bottom:12px">Total: ' + pcCart.length + ' label</div>';
  html += '<div style="display:flex;gap:8px"><button class="pc-cancel-btn" onclick="closePCConfirm()">Batal</button><button class="pc-confirm-btn" onclick="doSavePriceCard(\'' + escAttr(nama) + '\')">\ud83d\udcbe Simpan</button></div></div></div>';
  var d = document.createElement('div');
  d.innerHTML = html;
  document.body.appendChild(d);
}

function closePCConfirm() {
  var el = document.getElementById('pcConfirmOverlay');
  if (el) el.remove();
}

function doSavePriceCard(nama) {
  closePCConfirm();
  var btn = document.getElementById('pcSaveBtn');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  var items = [];
  for (var i = 0; i < pcCart.length; i++) {
    items.push({kode: pcCart[i].k, hjual: pcCart[i].h || 0, hmember: pcCart[i].h || 0, qty: 1});
  }
  var pcCtrl = new AbortController();
  setTimeout(function() { pcCtrl.abort(); }, 3000);
  fetch(gpApi('pricecard-save'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({nama: nama, items: items, operator: 'user1'}),
    signal: pcCtrl.signal
  })
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.error)throw new Error(d.error);
    showToast('✅ Tersimpan: ' + d.no_trans + ' (' + items.length + ' label)');
    pcCart = []; renderPCCart();
    document.getElementById('pcName').value = '';
    loadPCHistory();
    btn.disabled = false; btn.textContent = '\ud83d\udcbe Simpan ke Server';
  })
  .catch(function(err){
    // Server failed - save locally for later upload
    saveOfflinePC(nama, items, items.length);
    showToast('\ud83d\udcf1 Disimpan offline, upload nanti');
    pcCart = []; renderPCCart();
    document.getElementById('pcName').value = '';
    loadPCHistory();
    btn.disabled = false; btn.textContent = '\ud83d\udcbe Simpan ke Server';
  });
}

function loadPCHistory() {
  var el = document.getElementById('pcHistoryList');
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2);font-size:13px">\u23f3 Menghubungi server 200...</div>';
  var lcCtrl = new AbortController();
  setTimeout(function() { lcCtrl.abort(); }, 3000);
  fetch(gpApi('pricecard-list'), { signal: lcCtrl.signal })
    .then(function(r){return r.json()})
    .then(function(d){
      var html = '';
      var onlineList = (d && d.length > 0) ? d : [];
      var offlineList = getOfflinePCs();
      for (var i = 0; i < offlineList.length; i++) {
        var o = offlineList[i];
        var badge = o.uploaded ? '\u2601\uFE0F' : '\uD83D\uDCF1';
        var uploadBtn = o.uploaded ? '' : '<button class="pc-upload-btn" data-id="' + o.id + '" onclick="uploadOfflinePC(\'' + o.id + '\')">\u2B06 Upload</button>';
        html += '<div class="pc-history-item" onclick="viewOfflinePCDetail(\'' + o.id + '\')">' +
          '<div class="info"><div class="name">' + badge + ' ' + esc(o.nama) + '</div>' +
          '<div class="sub">' + (o.no_trans || 'Offline') + ' \u2022 ' + o.itemCount + ' label</div></div>' +
          '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">' + uploadBtn +
          '<button class="del-btn" onclick="event.stopPropagation();deleteOfflinePC(\'' + o.id + '\')">\u2716</button></div></div>';
      }
      for (var i = 0; i < onlineList.length && i < 20; i++) {
        var c = onlineList[i];
        html += '<div class="pc-history-item" onclick="viewPCDetail(\'' + escAttr(c.no_trans) + '\',\'' + (c.Waktu||c.waktu||'') + '\',\'' + escAttr(c.tgl||'') + '\',\'' + escAttr(c.Item||0) + '\')">' +
          '<div class="info"><div class="name">\u2601\uFE0F ' + esc(c.nama||'tanpa nama') + '</div>' +
          '<div class="sub">' + esc(c.no_trans) + ' \u2022 ' + c.Item + ' item \u2022 ' + ((c.Waktu||c.waktu||'') ? (c.Waktu||c.waktu||'').split(' ')[0] + ' ' + (c.Waktu||c.waktu||'').split(' ')[1].substring(0,5) : '') + '</div></div>' +
          (c.Item==0?'<button class="fix-btn" onclick="event.stopPropagation();reuploadPC(\'' + escAttr(c.no_trans) + '\',\'' + escAttr(c.nama||'') + '\')" style="padding:4px 8px;border:none;background:var(--accent);color:#fff;border-radius:6px;font-size:11px;cursor:pointer">\u21bb Fix</button>':'') + '<button class="del-btn" onclick="event.stopPropagation();deletePC(\'' + escAttr(c.no_trans) + '\',this)">\u2716</button></div>';
      }
      if (!html) {
        el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text2);font-size:13px">Belum ada price card</div>';
      } else {
        el.innerHTML = html;
      }
    })
    .catch(function(){
      el.innerHTML = '<div style="text-align:center;padding:20px 12px;color:var(--text2);font-size:13px">' +
        '\u26a0\uFE0F Server 200 tidak merespon<br><br>' +
        '<button class="sync-btn" onclick="loadPCHistory()" style="padding:10px 24px;font-size:13px;font-weight:700">\ud83d\udd04 Ambil dari Server</button>' +
        '</div>';
    });
}

function viewPCDetail(noTrans, waktu, tgl, itemCount) {
  fetch(gpApi('pricecard-detail', 'no_trans='+noTrans))
    .then(function(r){return r.json()})
    .then(function(items){
      if(!items||items.length===0){showToast('\ud83d\udced Tidak ada item');return;}
      var html='<div class="pc-confirm-overlay" id="pcDetailOverlay" onclick="if(event.target===this)closePCDetail()"><div class="pc-confirm-panel" style="max-width:420px;max-height:80vh;overflow-y:auto">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
      html+='<div style="font-size:16px;font-weight:700">\ud83d\udcc4 '+noTrans+'</div>';
      html+='<button onclick="closePCDetail()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text2);padding:4px 8px">\u2716</button>';
      html+='</div>';
      html+='<div style="font-size:11px;color:var(--text2);margin-bottom:8px;display:flex;justify-content:space-between">';
      html+='<span>\ud83d\udce6 '+(itemCount||items.length)+' item</span>';
      html+='</div>';
      for(var i=0;i<items.length&&i<50;i++){
        var it=items[i];
        html+='<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px"><span>'+esc(it.nama||'')+'</span><span style="font-weight:600">Rp'+Number(it.hjual||0).toLocaleString('id-ID')+'</span></div>';
      }
      if(items.length>50)html+='<div style="text-align:center;font-size:11px;color:var(--text2);padding:4px">...dan '+(items.length-50)+' lainnya</div>';
      html+='<button class="pc-cancel-btn" onclick="closePCDetail()" style="width:100%;margin-top:10px">Tutup</button>';
      html+='</div></div>';
      var d = document.createElement('div');
      d.innerHTML = html;
      document.body.appendChild(d);
    })
    .catch(function(){showToast('❌ Gagal load detail');});
}

function closePCDetail() {
  var el = document.getElementById('pcDetailOverlay');
  if (el) el.remove();
}

function deletePC(noTrans, btn) {
  // Fetch detail first
  fetch(gpApi('pricecard-detail', 'no_trans='+noTrans))
    .then(function(r){return r.json()})
    .then(function(items){
      var html = '<div class="pc-confirm-overlay" id="pcDelOverlay" onclick="if(event.target===this)closePCDel()"><div class="pc-confirm-panel"><div style="font-size:16px;font-weight:700;margin-bottom:6px;color:var(--primary)">\u26a0\ufe0f Hapus Price Card</div>';
      html += '<div style="font-size:13px;color:var(--text2);margin-bottom:8px">No: <b>' + noTrans + '</b></div>';
      html += '<div style="font-size:12px;max-height:150px;overflow-y:auto;margin-bottom:8px">';
      if (items && items.length > 0) {
        for (var i = 0; i < items.length && i < 30; i++) {
          html += '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;border-bottom:1px solid var(--border)"><span>' + esc((items[i].nama||'').substring(0,40)) + '</span><span>Rp' + Number(items[i].hjual||0).toLocaleString('id-ID') + '</span></div>';
        }
        if (items.length > 30) html += '<div style="text-align:center;font-size:11px;color:var(--text2);padding:4px">...dan ' + (items.length - 30) + ' lainnya</div>';
      }
      html += '</div><div style="font-size:12px;color:var(--text2);margin-bottom:10px">' + (items ? items.length : 0) + ' item akan dihapus</div>';
      html += '<div style="display:flex;gap:8px"><button class="pc-cancel-btn" onclick="closePCDel()">Batal</button><button class="pc-del-btn" onclick="doDeletePC(\'' + noTrans + '\')">\u2716 Ya, Hapus</button></div></div></div>';
      var d = document.createElement('div');
      d.innerHTML = html;
      document.body.appendChild(d);
    })
    .catch(function(){showToast('❌ Gagal memuat detail');});
}

function closePCDel() {
  var el = document.getElementById('pcDelOverlay');
  if (el) el.remove();
}

function doDeletePC(noTrans) {
  closePCDel();
  fetch(gpApi('pricecard-delete', 'no_trans='+noTrans))
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.error)throw new Error(d.error);
      showToast('✅ Dihapus');
      loadPCHistory();
    })
    .catch(function(err){showToast('❌ '+err.message);});
}

function reuploadPC(noTrans, originalNama) {
  var btn = document.querySelector('[onclick*="reuploadPC(\''+noTrans+'\')"]');
  if (btn) { btn.disabled = true; btn.innerHTML = "\u23f3"; }
  showToast("\ud83d\udd04 Fixing " + noTrans + "...");
  fetch(gpApi("pricecard-detail", "no_trans="+noTrans))
    .then(function(r){return r.json()})
    .then(function(items){
      if(!items||items.length===0) throw new Error("No items");
      return fetch(gpApi("pricecard-delete", "no_trans="+noTrans))
        .then(function(r){return r.json()})
        .then(function(){
          var pcItems = items.map(function(it){return {kode: it.kode, nama: it.nama, hjual: it.hjual, qty: it.qty || 1};});
          return fetch(gpApi("pricecard-save"), {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({nama: originalNama || "reupload", items: pcItems, operator: "user1"})
          });
        });
    })
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.error) throw new Error(d.error);
      showToast("\u2705 Fixed! New: " + d.no_trans);
      loadPCHistory();
    })
    .catch(function(err){
      showToast("\u274c Gagal: " + (err.message||"unknown"));
    });
}



// ===== OFFLINE PRICE CARD =====
function getOfflinePCs() {
  try { return JSON.parse(localStorage.getItem('gp45_pc_offline')) || []; }
  catch(e) { return []; }
}

function saveOfflinePCs(list) {
  try { localStorage.setItem('gp45_pc_offline', JSON.stringify(list)); } catch(e) {}
}

function saveOfflinePC(nama, items, count) {
  var list = getOfflinePCs();
  var now = new Date();
  list.push({
    id: 'offline_' + Date.now(),
    nama: nama, items: items, itemCount: count,
    created: now.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) + ' ' + now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}),
    createdTs: Date.now(), uploaded: false, no_trans: null
  });
  saveOfflinePCs(list);
}

function uploadOfflinePC(id) {
  var list = getOfflinePCs();
  var idx = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { idx = i; break; }
  }
  if (idx < 0) { showToast('Data tidak ditemukan'); return; }
  var pc = list[idx];
  var btn = document.querySelector('.pc-upload-btn[data-id="' + id + '"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '\u23f3'; }
  var ulCtrl = new AbortController();
  setTimeout(function() { ulCtrl.abort(); }, 3000);
  fetch(gpApi('pricecard-save'), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({nama: pc.nama, items: pc.items, operator: 'user1'}),
    signal: ulCtrl.signal
  })
  .then(function(r){return r.json()})
  .then(function(d){
    if(d.error) throw new Error(d.error);
    pc.uploaded = true; pc.no_trans = d.no_trans;
    saveOfflinePCs(list);
    if (btn) btn.innerHTML = '\u2601\uFE0F';
    showToast('\u2705 Terupload: ' + d.no_trans);
    loadPCHistory();
  })
  .catch(function(err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '\u2B06 Upload'; }
    showToast('Gagal upload: ' + (err.message||'unknown'));
  });
}

function deleteOfflinePC(id) {
  var list = getOfflinePCs();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { list.splice(i, 1); break; }
  }
  saveOfflinePCs(list);
  loadPCHistory();
}


function viewOfflinePCDetail(id) {
  var list = getOfflinePCs();
  var pc = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { pc = list[i]; break; }
  }
  if (!pc) { showToast('Data tidak ditemukan'); return; }
  var html = '<div class="pc-confirm-overlay" id="pcDetailOverlay" onclick="if(event.target===this)closePCDetail()"><div class="pc-confirm-panel" style="max-width:420px;max-height:80vh;overflow-y:auto">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<div style="font-size:16px;font-weight:700">📱 ' + esc(pc.nama) + '</div>';
  html += '<button onclick="closePCDetail()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text2);padding:4px 8px">✖</button></div>';
  html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">' + pc.itemCount + ' label</div>';
  for (var i = 0; i < pc.items.length && i < 50; i++) {
    var it = pc.items[i];
    var nm = it.kode;
    for (var j = 0; j < allItems.length; j++) {
      if (allItems[j].k === it.kode) { nm = allItems[j].n; break; }
    }
    html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px"><span>' + esc(nm) + '</span><span style="font-weight:600">Rp' + Number(it.hjual||0).toLocaleString('id-ID') + '</span></div>';
  }
  if (pc.items.length > 50) html += '<div style="text-align:center;font-size:11px;color:var(--text2);padding:4px">...dan ' + (pc.items.length - 50) + ' lainnya</div>';
  html += '<button class="pc-cancel-btn" onclick="closePCDetail()" style="width:100%;margin-top:10px">Tutup</button></div></div>';
  var d = document.createElement('div');
  d.innerHTML = html;
  document.body.appendChild(d);
}

function showOmsetPanel() { closeMenu(); document.getElementById("omsetOverlay").classList.add("show"); var d=localStorage.getItem("gp45_omset_lastdate"); if(d){document.getElementById("omsetDate").value=d;}else{document.getElementById("omsetDate").value=new Date().toISOString().slice(0,10);} var isBulan = document.getElementById("omsetBulanResult").style.display==="block"; if(!isBulan){var r=document.getElementById("omsetResult"); if(r.innerHTML.trim()===""){loadOmset();}} }
function closeOmset() { var d=document.getElementById("omsetDate").value; if(d) localStorage.setItem("gp45_omset_lastdate",d); document.getElementById("omsetOverlay").classList.remove("show"); }
function loadOmset() {
  var bulanEl=document.getElementById("omsetBulanResult");
  if(bulanEl){bulanEl.style.display="none";}
  var hrEl=document.getElementById("omsetResult");
  if(hrEl){hrEl.style.display="block";}
  var tabBtn=document.getElementById("omsetTabBtn");
  var bulanBtn=document.getElementById("omsetBulanBtn");
  if(tabBtn) tabBtn.classList.add("active");
  if(bulanBtn) bulanBtn.classList.remove("active");
  var date=document.getElementById("omsetDate").value;
  if(!date) date=new Date().toISOString().slice(0,10);
  var area=document.getElementById("omsetResult");
  area.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2);font-size:13px">⏳ Mengambil omset...</div>';
  
  function fetchOmset(url,fallbackUrl,fallbackBody){
    var timedOut = false;
    var tid = setTimeout(function(){ timedOut = true; }, 12000);
    return fetch(url)
      .then(function(r){ if(timedOut)throw new Error('Timeout'); clearTimeout(tid); return r.json(); })
      .catch(function(err){
        clearTimeout(tid);
        if(fallbackUrl && !timedOut){
          return fetch(fallbackUrl,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(fallbackBody)
          }).then(function(r){return r.json()}).then(function(d){
            if(d&&d.error)throw new Error(d.error);
            return d;
          });
        }
        if(timedOut) throw new Error('Server tidak merespon');
        throw err;
      });
  }
  
  fetchOmset(gpApi('omset', 'date='+date), null, {action:'omset',date:date})
    .then(function(data){
      var area=document.getElementById("omsetResult");
      if(!data||!data.sales){area.innerHTML='<div style="text-align:center;padding:12px;color:var(--text2);font-size:13px">\uD83d\udced Tidak ada data penjualan</div>';return;}
      var sales=data.sales||[];var gr=data.grand_total||0;var gt=data.total_trans||0;
      
      // Load setting from localStorage
      var settJson=localStorage.getItem("gp45_omset_v2");
      var sett=settJson?JSON.parse(settJson):{l1_target:4285714,l2_target:3333333,l1_sales:["Brayen","Darren","Raydel","Pricilia","Franklyn","Genio"],l2_sales:["Mario","Johanes","Rivaldo","Moors"],inactive_sales:["Reagen","Yoshua"]};
      if(!sett.l1_target) sett.l1_target=4285714;
      if(!sett.l2_target) sett.l2_target=3333333;
      if(!sett.l1_sales) sett.l1_sales=[];
      if(!sett.l2_sales) sett.l2_sales=[];
      if(!sett.inactive_sales) sett.inactive_sales=[];
      
      // Build lookup maps
      var l1map={}, l2map={}, inactmap={};
      for(var si=0;si<sett.l1_sales.length;si++) l1map[(sett.l1_sales[si]||"").toLowerCase()]=true;
      for(var si=0;si<sett.l2_sales.length;si++) l2map[(sett.l2_sales[si]||"").toLowerCase()]=true;
      for(var si=0;si<sett.inactive_sales.length;si++) inactmap[(sett.inactive_sales[si]||"").toLowerCase()]=true;
      
      var h='<div style="margin:8px 0 4px;font-size:11px;color:var(--text2);font-weight:600">\uD83d\udcc5 '+date+'</div>';
      var rows="";
      var totalAll=0, totalTrans=0;
      
      for(var i=0;i<sales.length;i++){
        var r=sales[i];
        var nm=(r.sales||"").toLowerCase();
        var j=Number(r.total||0);
        if(j<=0) continue;
        if(inactmap[nm]) continue;
        
        var target=0;
        if(l1map[nm]){ target=sett.l1_target; }
        else if(l2map[nm]){ target=sett.l2_target; }
        
        var persen = target>0 ? ((j/target)*100).toFixed(1) : "";
        var persenStr = persen ? ' <span style="display:inline-block;min-width:48px;text-align:center;background:'+(parseFloat(persen)>=95?'var(--green-bg)':'var(--red-bg)')+';color:'+(parseFloat(persen)>=95?'var(--green)':'var(--primary)')+';font-weight:800;font-size:13px;padding:2px 8px;border-radius:8px;border:1px solid '+(parseFloat(persen)>=95?'var(--green)':'var(--primary)')+';">'+persen+'%</span>' : '';
        
        rows+='<div class="omset-row oset-click" data-sales="'+escAttr(r.sales||'')+'" data-date="'+date+'" style="cursor:pointer">'
          +'<span class="name">▶ '+esc(r.sales||"")+'</span>'
          +'<span class="value">'+(r.trans||0)+' Trx \u2022 '+(r.items||0)+' item \u2014 Rp'+j.toLocaleString("id-ID")+persenStr+'</span>'
          +'</div>';
        totalAll+=j;
        totalTrans+=Number(r.trans||0);
      }
      
      if(!rows){
        h+='<div style="text-align:center;padding:16px;color:var(--text2);font-size:13px">\uD83d\udced Tidak ada data penjualan</div>';
      } else {
        h+='<div class="omset-total"><span>💰 Grand Total</span><span>'+totalTrans+' trans \u2014 Rp'+Number(totalAll).toLocaleString("id-ID")+'</span></div>';
        h+=rows;
      }
      area.innerHTML=h;
    })
    .catch(function(err){
      var area=document.getElementById("omsetResult");
      area.innerHTML='<div style="text-align:center;color:var(--primary);font-size:13px">❌ '+esc(err.message||'Gagal mengambil omset')+'</div>';
    });
}

function omsetDetail(sales,date,el){
  var parent = el.parentNode;
  var existing = parent.querySelector('.omset-detail');
  if (existing) {
    if (el.nextElementSibling === existing) { existing.remove(); return; }
    existing.remove();
  }
  var div=document.createElement('div');
  div.className='omset-detail';
  div.style.cssText='padding:8px 12px;background:var(--bg);border-radius:8px;margin:2px 0 6px;font-size:12px;line-height:1.7';
  div.innerHTML='<div style="text-align:center;color:var(--text2)">⏳ Mengambil detail penjualan...</div>';
  el.parentNode.insertBefore(div,el.nextSibling);

      function fetchOmsetDetail(url,fallbackUrl,fallbackBody){
    var timedOut = false;
    var tid = setTimeout(function(){ timedOut = true; }, 12000);
    return fetch(url)
      .then(function(r){ if(timedOut)throw new Error('Timeout'); clearTimeout(tid); if(!r.ok)throw new Error('HTTP '+r.status); return r.json(); })
      .catch(function(err){
        clearTimeout(tid);
        if(fallbackUrl && !timedOut){
          return fetch(fallbackUrl,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(fallbackBody)
          }).then(function(r){return r.json()}).then(function(d){
            if(d&&d.error)throw new Error(d.error);
            return d;
          });
        }
        if(timedOut) throw new Error('Server tidak merespon');
        throw err;
      });
  }
  
  fetchOmsetDetail(
    gpApi('omset-detail', 'q='+encodeURIComponent(sales)+'&date='+encodeURIComponent(date)),
    null,
    {action:'omset-detail',q:sales,date:date}
  )
    .then(function(items){renderOmsetDetail(div,items)})
    .catch(function(err){
      div.innerHTML='<div style="text-align:center;color:var(--primary)">❌ '+esc(err.message||'Gagal mengambil detail')+'</div>';
    });
}

function renderOmsetDetail(div,items){
  if(!items||items.length===0){
    div.innerHTML='<div style="text-align:center;color:var(--text2)">Tidak ada transaksi</div>';return;
  }
  if(!Array.isArray(items))items=items.items||[items];
  var hh='';
  for(var i=0;i<items.length&&i<30;i++){
    var it=items[i];
    hh+='<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span>'+esc(it.Nama||it.nama||'')+'</span><span style="font-weight:600">'+(it.Qty||it.qty||0)+'x Rp'+Number(it.Jumlah||it.jumlah||0).toLocaleString('id-ID')+'</span></div>';
  }
  if(items.length>30)hh+='<div style="text-align:center;color:var(--text2);margin-top:4px">...dan '+(items.length-30)+' lainnya</div>';
  div.innerHTML=hh;
}

function showAbout() { closeMenu(); document.getElementById("aboutOverlay").classList.add("show"); }
function closeAbout() { document.getElementById("aboutOverlay").classList.remove("show"); }

function showManual() {
  closeMenu();
  document.getElementById("manualOverlay").classList.add("show");
  localStorage.setItem("gp45_first_launch", "1");
}
function closeManual() {
  document.getElementById("manualOverlay").classList.remove("show");
}

function syncData() {
  if (isLoading) { showToast('⏳ Tunggu loading selesai'); return; }
  // Show sync overlay
  document.getElementById('syncOverlay').classList.add('show');
  document.getElementById('syncLoading').style.display = 'block';
  document.getElementById('syncResult').style.display = 'none';
  document.getElementById('syncError').style.display = 'none';
  document.getElementById('syncRetryBtn').style.display = 'none';
  document.getElementById('syncIcon').textContent = '🔄';
  document.getElementById('syncTitle').textContent = 'Sync Database';
  document.getElementById('syncSub').textContent = 'Mendownload data terbaru...';
  document.getElementById('syncStatus').textContent = 'Ping server...';
  document.getElementById('syncBar').style.width = '5%';
  document.getElementById('syncProgressText').textContent = 'Tes koneksi ke server 200...';
  
  // Ping server first before syncing
  var pingController = new AbortController();
  var pingTimeout = setTimeout(function() { pingController.abort(); }, 3000);
  var pt0 = Date.now();
  
  // Show ping status
  var pingStatus = document.getElementById('syncPingStatus');
  var pingMs = document.getElementById('syncPingMs');
  if (pingStatus) pingStatus.innerHTML = '⏳ Ping...';
  if (pingMs) pingMs.textContent = '';
  
  fetch(gpApi('status'), { signal: pingController.signal })
    .then(function(r) {
      clearTimeout(pingTimeout);
      var ms = Date.now() - pt0;
      if (pingStatus) pingStatus.innerHTML = '✅ Online';
      if (pingMs) pingMs.textContent = ms + 'ms';
      localStorage.setItem('gp45_server_ping', JSON.stringify({ok: true, ms: ms, ts: Date.now()}));
      
      // Continue with actual sync
      document.getElementById('syncStatus').textContent = 'Menghubungi server...';
      document.getElementById('syncBar').style.width = '10%';
      document.getElementById('syncProgressText').textContent = 'Mengirim request...';
      doSync();
    })
    .catch(function(err) {
      clearTimeout(pingTimeout);
      var msg = err.name === 'AbortError' ? 'Timeout' : 'Gagal';
      if (pingStatus) pingStatus.innerHTML = '❌ ' + msg;
      if (pingMs) pingMs.textContent = '';
      localStorage.setItem('gp45_server_ping', JSON.stringify({ok: false, ms: 0, ts: Date.now()}));
      
      // Show error
      showSyncError('Server 200 tidak merespon\nCek koneksi WiFi ke jaringan toko');
    });
}

var _currentSyncController = null;

function doSync() {
  document.getElementById('syncBar').style.width = '10%';
  document.getElementById('syncStatus').textContent = 'Menghubungi server...';
  document.getElementById('syncProgressText').textContent = 'Mengirim request...';
  
  var syncUrl = gpApi('sync');
  var oldCount = allItems.length;
  var oldItems = [];
  // Save a copy of old items for comparison
  for (var i = 0; i < allItems.length && i < 50; i++) oldItems.push(allItems[i]);
  
  var syncController = new AbortController(); _currentSyncController = syncController;
  var syncTimeout = setTimeout(function() { syncController.abort(); }, 120000);
  fetch(syncUrl, { signal: syncController.signal })
    .then(function(r) { clearTimeout(syncTimeout);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      document.getElementById('syncBar').style.width = '30%';
      document.getElementById('syncStatus').textContent = 'Membaca data...';
      return r.json();
    })
    .then(function(data) {
      document.getElementById('syncBar').style.width = '50%';
      document.getElementById('syncStatus').textContent = 'Menyimpan ke database lokal...';
      
      var items = data.items || data;
      if (!items || items.length === 0) throw new Error('Tidak ada data');
      
      // Map to internal format
      var mapped = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        mapped.push({
          k: it.Kode || '',
          n: it.Nama || '',
          b: it.Barcode || '',
          b2: it.Barcode2 || '',
          s: it.Satuan || '',
          h: it.HJual || 0,
          h2: it.HJual2 || 0,
          h3: it.HJual3 || 0,
          hm: it.HMember || 0,
          hb: it.HBeli || 0,
          q: it.Stok || 0,
          m: it.Merek || '',
          hk: it.HK || 0,
          hk_nama: it.HK_Nama || '',
          hk_expiry: it.HK_Expiry || ''
        });
      }
      
      // Compute comparison
      var newCount = mapped.length;
      var oldByKode = {};
      for (var i = 0; i < allItems.length; i++) {
        oldByKode[allItems[i].k] = allItems[i];
      }
      var newByKode = {};
      for (var i = 0; i < mapped.length; i++) {
        newByKode[mapped[i].k] = mapped[i];
      }
      
      var oldKodes = Object.keys(oldByKode);
      var newKodes = Object.keys(newByKode);
      var added = [];
      var removed = [];
      var kept = 0;
      var priceChanged = 0;
      var stockChanged = 0;
      var hkChanged = 0;
      var priceSamples = [];
      
      for (var i = 0; i < newKodes.length; i++) {
        var k = newKodes[i];
        if (oldByKode[k]) {
          kept++;
          var oldItem = oldByKode[k];
          var newItem = newByKode[k];
          if (oldItem.h !== newItem.h) {
            priceChanged++;
            if (priceSamples.length < 5) {
              priceSamples.push({n: oldItem.n, old: oldItem.h, nw: newItem.h});
            }
          }
          if (oldItem.q !== newItem.q) stockChanged++;
          if (oldItem.hk !== newItem.hk) hkChanged++;
        } else {
          added.push(k);
        }
      }
      for (var i = 0; i < oldKodes.length; i++) {
        if (!newByKode[oldKodes[i]]) removed.push(oldKodes[i]);
      }
      
      var stockSamples = [];
      var allPriceChanges = [];
      var hkChanges = [];
      
      for (var i = 0; i < newKodes.length; i++) {
        var k = newKodes[i];
        if (oldByKode[k]) {
          var oldItem = oldByKode[k];
          var newItem = newByKode[k];
          if (oldItem.h !== newItem.h) {
            allPriceChanges.push({k: k, n: oldItem.n, old: oldItem.h, nw: newItem.h});
          }
          if (oldItem.q !== newItem.q && stockSamples.length < 20) {
            stockSamples.push({k: k, n: oldItem.n, old: oldItem.q, nw: newItem.q});
          }
          if (oldItem.hk !== newItem.hk) {
            hkChanges.push({k: k, n: oldItem.n, old: oldItem.hk, nw: newItem.hk, old_exp: oldItem.hk_expiry||'', new_exp: newItem.hk_expiry||'', old_nama: oldItem.hk_nama||'', new_nama: newItem.hk_nama||''});
          }
        }
      }
      
      var now = new Date();
      
      // Save detailed changes to localStorage
      var detailData = {
        time: now.toLocaleString('id-ID'),
        price_changes: allPriceChanges.slice(0, 30),
        stock_changes: stockSamples.slice(0, 20),
        total_price: priceChanged,
        total_stock: stockChanged,
        total_hk: hkChanged,
        hk_changes: hkChanges.slice(0, 20),
        added: added.length,
        removed: removed.length
      };
      localStorage.setItem('gp45_sync_detail', JSON.stringify(detailData));
      
      var timeStr = now.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) + ' ' + now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      
      // Get last update time
      var lastUpdate = localStorage.getItem('gp45_lu_v26') || '';
      var lastUpdateStr = 'sebelumnya';
      if (lastUpdate) {
        var d = new Date(parseInt(lastUpdate));
        if (!isNaN(d.getTime())) lastUpdateStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      }
      
      // Save to IndexedDB
      var req = indexedDB.open('GP45Offline', 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('stock')) db.createObjectStore('stock', {keyPath:'k'});
      };
      req.onsuccess = function(e) {
        var db = e.target.result;
        var tx = db.transaction('stock', 'readwrite');
        var store = tx.objectStore('stock');
        store.clear();
        for (var i = 0; i < mapped.length; i++) store.put(mapped[i]);
        tx.oncomplete = function() {
          db.close();
          allItems = mapped;
          localStorage.setItem('gp45_lu_v26', Date.now().toString());
          
          // Save sync history
          var now = new Date();
          var timeStr = now.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) + ' ' + now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
          saveSyncHistory({
            time: timeStr,
            items: newCount,
            price_changes: priceChanged,
            stock_changes: stockChanged,
            hk_changes: hkChanged,
            added: added.length,
            removed: removed.length,
            kept: kept
          });
          
          // Update UI
          var count = document.getElementById('itemCount');
          if (count) count.textContent = mapped.length.toLocaleString() + ' items';
          var status = document.getElementById('statusText');
          if (status) status.textContent = mapped.length.toLocaleString() + ' items [offline]';
          var aboutDb = document.getElementById('aboutDbCount');
          if (aboutDb) aboutDb.textContent = mapped.length.toLocaleString() + ' item';
          
          // Show result
          document.getElementById('syncIcon').textContent = '✅';
          document.getElementById('syncTitle').textContent = 'Sinkron Berhasil!';
          document.getElementById('syncSub').textContent = mapped.length.toLocaleString() + ' item dari server';
          document.getElementById('syncLoading').style.display = 'none';
          document.getElementById('syncResult').style.display = 'block';
          
          document.getElementById('syncOldCount').textContent = oldCount.toLocaleString();
          document.getElementById('syncNewCount').textContent = newCount.toLocaleString();
          // Update status bar time
          updateLastUpdateDisplay();
          document.getElementById('syncNewDate').textContent = timeStr;
          document.getElementById('syncPriceChange').textContent = priceChanged.toLocaleString();
          document.getElementById('syncStockChange').textContent = stockChanged.toLocaleString();
          document.getElementById('syncHKChange').textContent = hkChanged.toLocaleString();
          document.getElementById('syncAdded').textContent = added.length.toLocaleString();
          document.getElementById('syncRemoved').textContent = removed.length.toLocaleString();
          document.getElementById('syncKept').textContent = kept.toLocaleString();
          
          // Build detailed change list
          var changesHtml = '';
          // Show price changes
          var allPriceChanges = [];
      var hkChanges = [];
          for (var i = 0; i < newKodes.length; i++) {
            var k = newKodes[i];
            if (oldByKode[k] && oldByKode[k].h !== newByKode[k].h) {
              allPriceChanges.push({k: k, n: oldByKode[k].n, old: oldByKode[k].h, nw: newByKode[k].h});
            }
          }
          
          changesHtml += '<div style="font-size:11px;font-weight:600;color:var(--text2);margin:4px 0">🏷️ Perubahan Harga (' + allPriceChanges.length + ')</div>';
          if (allPriceChanges.length > 0) {
            var shown = 0;
            for (var i = 0; i < allPriceChanges.length && shown < 10; i++, shown++) {
              var s = allPriceChanges[i];
              var dir = s.nw > s.old ? '🟢' : '🔴';
              var arrow = s.nw > s.old ? '▲' : '▼';
              changesHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;font-size:10px;border-bottom:1px solid var(--border)">' +
                '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.n.substring(0, 28)) + '</span>' +
                '<span style="font-weight:600;margin:0 4px;white-space:nowrap">Rp' + Number(s.old).toLocaleString('id-ID') + '</span>' +
                '<span style="color:var(--text2)">→</span>' +
                '<span style="font-weight:700;color:' + (s.nw > s.old ? 'var(--green)' : 'var(--primary)') + ';margin:0 4px;white-space:nowrap">Rp' + Number(s.nw).toLocaleString('id-ID') + '</span>' +
                '<span style="font-size:9px">' + arrow + '</span></div>';
            }
            if (allPriceChanges.length > 10) {
              changesHtml += '<div style="text-align:center;font-size:10px;color:var(--text2);padding:3px">+ ' + (allPriceChanges.length - 10) + ' perubahan lainnya...</div>';
          
          // Show HK changes
          changesHtml += '<div style="font-size:11px;font-weight:600;color:var(--text2);margin:8px 0 4px">🏷️ HK Perubahan (' + hkChanges.length + ')</div>';
          if (hkChanges.length > 0) {
            for (var i = 0; i < hkChanges.length && i < 10; i++) {
              var h = hkChanges[i];
              var oldHkStr = (h.old > 0) ? 'Rp' + Number(h.old).toLocaleString('id-ID') : '-';
              var newHkStr = (h.nw > 0) ? 'Rp' + Number(h.nw).toLocaleString('id-ID') : '-';
              var expStr = (h.new_exp && h.new_exp !== '0000-00-00') ? ' Exp: ' + h.new_exp : '';
              changesHtml += '<div class="hk-change-item" style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;font-size:10px;border-bottom:1px solid var(--border);cursor:pointer" onclick="showToast("' + esc(h.n) + ': HK ' + oldHkStr + ' \u2192 ' + newHkStr + expStr + '")">' +
                '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(h.n.substring(0, 28)) + '</span>' +
                '<span style="font-weight:600;margin:0 4px;white-space:nowrap">' + oldHkStr + '</span>' +
                '<span style="color:var(--text2)">\u2192</span>' +
                '<span style="font-weight:700;color:var(--primary);margin:0 4px;white-space:nowrap">' + newHkStr + '</span>' +
                (expStr ? '<span style="font-size:8px;color:var(--text2)">' + expStr + '</span>' : '') +
                '</div>';
            }
            if (hkChanges.length > 10) {
              changesHtml += '<div style="text-align:center;font-size:10px;color:var(--text2);padding:3px">+ ' + (hkChanges.length - 10) + ' HK lainnya...</div>';
            }
          } else {
            changesHtml += '<div style="text-align:center;padding:6px;font-size:11px;color:var(--text2)">Tidak ada perubahan HK</div>';
          }
            }
          } else {
            changesHtml += '<div style="text-align:center;padding:6px;font-size:11px;color:var(--text2)">Tidak ada perubahan harga</div>';
          }
          
          // Show new items
          changesHtml += '<div style="font-size:11px;font-weight:600;color:var(--text2);margin:8px 0 4px">✨ Item Baru (' + added.length + ')</div>';
          if (added.length > 0) {
            var addedNames = [];
            for (var i = 0; i < added.length && i < 8; i++) {
              var k = added[i];
              var it = newByKode[k];
              changesHtml += '<div style="padding:3px 6px;font-size:10px;border-bottom:1px solid var(--border)">' +
                esc(it.n.substring(0, 35)) + ' — <span style="font-weight:600">Rp' + Number(it.h).toLocaleString('id-ID') + '</span></div>';
            }
            if (added.length > 8) {
              changesHtml += '<div style="text-align:center;font-size:10px;color:var(--text2);padding:3px">+ ' + (added.length - 8) + ' item baru lainnya...</div>';
            }
          }
          
          // Show removed items
          if (removed.length > 0) {
            changesHtml += '<div style="font-size:11px;font-weight:600;color:var(--primary);margin:8px 0 4px">❌ Item Hilang (' + removed.length + ')</div>';
            for (var i = 0; i < removed.length && i < 5; i++) {
              changesHtml += '<div style="padding:3px 6px;font-size:10px;color:var(--text2)">' + esc(removed[i]) + '</div>';
            }
          }
          
          document.getElementById('syncChangeList').innerHTML = changesHtml;
          
          // Start outlet stock sync with proper chaining
          var otController = new AbortController();
          var otTimer = setTimeout(function() { otController.abort(); }, 120000);
          document.getElementById('syncStatus').textContent = 'Mendownload stok outlet...';
          document.getElementById('syncProgressText').textContent = 'Mengambil data stok outlet...';
          fetch(gpApi('sync_outlet_stock'), { signal: otController.signal })
            .then(function(r) { clearTimeout(otTimer); return r.json(); })
            .then(function(od) {
              if (od && od.stocks) {
                var codes = Object.keys(od.stocks);
                var savedCount = 0;
                var maxSave = codes.length;
                var totalSave = codes.length;
                document.getElementById('syncStatus').textContent = 'Menyimpan ' + totalSave + ' stok outlet...';
                for (var i = 0; i < codes.length && i < maxSave; i++) {
                  var kode = codes[i];
                  var sk = od.stocks[kode];
                  if (sk && typeof sk === 'object') {
                    var stocks = {};
                    var stockKeys = Object.keys(sk);
                    for (var j = 0; j < stockKeys.length; j++) {
                      stocks[stockKeys[j]] = sk[stockKeys[j]];
                    }
                    try { saveOutletStockLocal(kode, stocks); savedCount++; } catch(e) { break; }
                  }
                  if (i % 5000 === 0 && i > 0) {
                    document.getElementById('syncStatus').textContent = 'Menyimpan ' + i + '/' + totalSave + ' stok outlet...';
                  }
                }
                if (typeof outletStockData !== 'undefined') { outletStockData = od.stocks; }
                document.getElementById('syncSub').textContent = mapped.length.toLocaleString() + ' item + ' + savedCount + ' outlet stock';
                document.getElementById('syncStatus').textContent = 'Selesai! ' + savedCount + ' item stok outlet tersimpan';
                document.getElementById('syncProgressText').textContent = 'Semua data tersimpan.';
              }
            })
            .catch(function(err) {
              var msg = err.name === 'AbortError' ? 'Timeout (120s)' : (err.message || 'Gagal');
              document.getElementById('syncStatus').textContent = 'Outlet stock: ' + msg;
              document.getElementById('syncSub').textContent = 'Stok outlet gagal di-sync, coba sync lagi';
              showToast('⚠️ Stok outlet gagal di-download: ' + msg);
            });
          
          document.getElementById('syncRetryBtn').style.display = 'block';
          document.getElementById('syncRetryBtn').textContent = '🔄 Sync Lagi';
        };
        tx.onerror = function() {
          db.close();
          showSyncError('Gagal menyimpan ke database lokal');
        };
      };
      req.onerror = function() {
        showSyncError('Gagal membuka database');
      };
    })
    .catch(function(err) {
      if (err.name === 'AbortError') { document.getElementById('syncOverlay').classList.remove('show'); return; }
      showSyncError(err.message);
    });
}

function showSyncError(msg) {
  document.getElementById('syncLoading').style.display = 'none';
  document.getElementById('syncResult').style.display = 'none';
  document.getElementById('syncError').style.display = 'block';
  document.getElementById('syncErrorMsg').textContent = msg;
  document.getElementById('syncIcon').textContent = '❌';
  document.getElementById('syncTitle').textContent = 'Sinkron Gagal';
  document.getElementById('syncSub').textContent = 'Cek koneksi ke server 200';
  document.getElementById('syncRetryBtn').style.display = 'block';
  document.getElementById('syncRetryBtn').textContent = '🔄 Coba Lagi';
}

function timeAgo(ts) {
  if (!ts) return 'tidak diketahui';
  var d = new Date(parseInt(ts));
  if (isNaN(d.getTime())) return 'tidak diketahui';
  var now = new Date();
  var diff = now - d;
  var mins = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return mins + ' menit lalu';
  if (hours < 24) return hours + ' jam lalu';
  if (days < 7) return days + ' hari lalu';
  var weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks + ' minggu lalu';
  return days + ' hari lalu';
}

function getSyncHistory() {
  try { return JSON.parse(localStorage.getItem('gp45_sync_history')) || []; }
  catch(e) { return []; }
}

function saveSyncHistory(entry) {
  var history = getSyncHistory();
  history.unshift(entry);
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem('gp45_sync_history', JSON.stringify(history));
}

function renderDbInfo() {
  var items = document.getElementById('dbInfoItems');
  var time = document.getElementById('dbInfoTime');
  var badge = document.getElementById('dbInfoBadge');
  
  if (items) items.textContent = allItems.length.toLocaleString() + ' item';
  
  var stored = localStorage.getItem('gp45_lu_v26');
  if (stored) {
    var d = new Date(parseInt(stored));
    if (!isNaN(d.getTime())) {
      var dateStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
      var timeStr = d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      if (time) time.textContent = dateStr + ' ' + timeStr;
      
      if (badge) {
        var diff = Date.now() - d.getTime();
        var hours = Math.floor(diff / 3600000);
        badge.style.display = 'inline-block';
        if (hours < 6) {
          badge.className = 'badge ok';
          badge.textContent = timeAgo(stored);
        } else if (hours < 48) {
          badge.className = 'badge old';
          badge.textContent = timeAgo(stored);
        } else {
          badge.className = 'badge stale';
          badge.textContent = timeAgo(stored);
        }
      }
    } else {
      if (time) time.textContent = 'tidak diketahui';
    }
  } else {
    if (time) time.textContent = 'belum pernah sync';
  }
  
  // Show last sync detail
}

function renderSyncDetail() {
  // Now handled in openSyncHistory overlay
}

function showAllSyncChanges() {
  try {
    var detail = JSON.parse(localStorage.getItem('gp45_sync_detail'));
    if (!detail) { showToast('\u26a0\ufe0f Tidak ada data sync'); return; }
    var html = '<div class="pc-confirm-overlay" id="syncAllOverlay" onclick="if(event.target===this)closeSyncAll()"><div class="pc-confirm-panel" style="max-width:420px">';
    html += '<div style="font-size:16px;font-weight:700;margin-bottom:8px">\ud83d\udcca Semua Perubahan</div>';
    
    // Price changes
    var pc = detail.price_changes || [];
    var sc = detail.stock_changes || [];
    
    if (pc.length > 0) {
      html += '<div style="font-size:12px;font-weight:600;margin:6px 0 4px;color:var(--text2)">\ud83c\udff7\ufe0f Harga Berubah (' + (detail.total_price || pc.length) + '):</div>';
      html += '<div style="max-height:160px;overflow-y:auto;font-size:11px">';
      for (var i = 0; i < pc.length; i++) {
        var c = pc[i];
        var diff = c.nw - c.old;
        html += '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border)"><span>' + (c.n||'').substring(0,40) + '</span><span style="font-weight:600;color:' + (diff > 0 ? '#d97706' : 'var(--green)') + '">Rp' + Number(c.old).toLocaleString('id-ID') + ' \u2192 Rp' + Number(c.nw).toLocaleString('id-ID') + '</span></div>';
      }
      html += '</div>';
    }
    
    if (sc.length > 0) {
      html += '<div style="font-size:12px;font-weight:600;margin:8px 0 4px;color:var(--text2)">\ud83d\udce6 Stok Berubah (' + (detail.total_stock || sc.length) + '):</div>';
      html += '<div style="max-height:120px;overflow-y:auto;font-size:11px">';
      for (var i = 0; i < sc.length; i++) {
        var c = sc[i];
        var diff = c.nw - c.old;
        html += '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border)"><span>' + (c.n||'').substring(0,35) + '</span><span style="font-weight:600;color:' + (diff > 0 ? 'var(--green)' : 'var(--primary)') + '">' + Number(c.old).toLocaleString() + ' \u2192 ' + Number(c.nw).toLocaleString() + '</span></div>';
      }
      html += '</div>';
    }
    
    if (pc.length === 0 && sc.length === 0) {
      html += '<div style="text-align:center;padding:16px;color:var(--text2);font-size:13px">Tidak ada perubahan</div>';
    }
    
    html += '<div style="display:flex;gap:8px;margin-top:12px"><button class="pc-cancel-btn" onclick="closeSyncAll()">Tutup</button></div></div></div>';
    var d = document.createElement('div');
    d.innerHTML = html;
    document.body.appendChild(d);
  } catch(e) { showToast('❌ ' + e.message); }
}

function closeSyncAll() {
  var el = document.getElementById('syncAllOverlay');
  if (el) el.remove();
}

function closeSyncHistory() {
  document.getElementById('syncHistOverlay').style.display = 'none';
}

function pingServerStatusHTML() {
  var ip = getServerIP();
  var stored = localStorage.getItem('gp45_server_ping');
  var status = '🔍 Cek koneksi...';
  var color = 'var(--text2)';
  if (stored) {
    try {
      var p = JSON.parse(stored);
      var ago = Date.now() - p.ts;
      if (ago < 10000) {
        status = p.ok ? '✅ ' + p.ms + 'ms' : '❌ Gagal';
        color = p.ok ? 'var(--green)' : 'var(--primary)';
      }
    } catch(e) {}
  }
  return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:10px">' +
    '<span style="font-size:12px;font-weight:600">🌐 Server 200</span>' +
    '<span id="histPingStatus" style="font-size:11px;color:' + color + '">' + status + '</span>' +
    '<button onclick="testServerPing()" style="margin-left:auto;padding:5px 10px;border:none;border-radius:6px;background:var(--accent);color:#fff;font-size:11px;font-weight:600;cursor:pointer">Ping</button>' +
    '</div>';
}

function testServerPing() {
  var status = document.getElementById('histPingStatus');
  if (status) status.innerHTML = '⏳ Testing...';
  var controller = new AbortController();
  var tid = setTimeout(function() { controller.abort(); }, 8000);
  var t0 = Date.now();
  fetch(gpApi('sync'), { signal: controller.signal })
    .then(function(r) {
      clearTimeout(tid);
      var ms = Date.now() - t0;
      localStorage.setItem('gp45_server_ping', JSON.stringify({ok: true, ms: ms, ts: Date.now()}));
      if (status) status.innerHTML = '✅ ' + ms + 'ms';
      showToast('✅ Server: ' + ms + 'ms');
    })
    .catch(function(err) {
      clearTimeout(tid);
      var msg = err.name === 'AbortError' ? 'Timeout' : 'Gagal';
      localStorage.setItem('gp45_server_ping', JSON.stringify({ok: false, ms: 0, ts: Date.now()}));
      if (status) status.innerHTML = '❌ ' + msg;
      showToast('❌ Server tidak merespon');
    });
}

function openSyncHistory() {
  var overlay = document.getElementById('syncHistOverlay');
  var content = document.getElementById('syncHistContent');
  if (!overlay || !content) return;
  overlay.style.display = 'flex';
  
  var html = '';
  
  // Ping status row
  html += pingServerStatusHTML();
  
  // Sync button
  html += '<div style="margin-bottom:10px">' +
    '<button class="sync-btn" onclick="syncData();closeSyncHistory()" style="width:100%;padding:14px;font-size:15px;font-weight:800">🔄 Update Database</button>' +
    '</div>';
  
  // Compact summary bar
  var lu = localStorage.getItem('gp45_lu_v26');
  if (lu) {
    var d = new Date(parseInt(lu));
    if (!isNaN(d.getTime())) {
      html += '<div style="margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:10px;font-size:11px;display:flex;justify-content:space-between;align-items:center">' +
        '<span>📦 <b>' + (allItems.length || 0).toLocaleString() + '</b> item</span>' +
        '<span style="color:var(--text2);font-size:10px">🕐 ' + d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) + '</span>' +
        '</div>';
    }
  } else {
    html += '<div style="margin-bottom:10px;padding:8px 10px;background:var(--bg);border-radius:10px;font-size:11px;display:flex;justify-content:space-between">' +
      '<span>📦 <b>' + (allItems.length || 0).toLocaleString() + '</b> item</span>' +
      '<span style="color:var(--text2)">🕐 Siap sync</span>' +
      '</div>';
  }
  
  // Last sync result - compact counts
  try {
    var detail = JSON.parse(localStorage.getItem('gp45_sync_detail'));
    if (detail) {
      html += '<div style="margin-bottom:8px;padding:8px 10px;background:var(--bg);border-radius:10px">' +
        '<div style="font-size:12px;font-weight:600;margin-bottom:4px">📊 Hasil Sync Terakhir</div>' +
        '<div style="font-size:11px;color:var(--text2);display:flex;flex-wrap:wrap;gap:4px 12px">' +
        '<span>🏷️ <b>' + (detail.total_price || 0) + '</b></span>' +
        '<span>📦 <b>' + (detail.total_stock || 0) + '</b></span>' +
        '<span>🏷️ <b>' + (detail.total_hk || 0) + '</b></span>' +
        '<span>✨ +<b>' + (detail.added || 0) + '</b></span>' +
        '<span>❌ -<b>' + (detail.removed || 0) + '</b></span>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--text2);margin-top:2px">' + (detail.time || '') + '</div>' +
        '</div>';
    }
  } catch(e) {}
  
  // Scrollable history list
  var history = getSyncHistory();
  html += '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:4px">📋 Riwayat Sync</div>';
  html += '<div style="max-height:260px;overflow-y:auto;padding-right:4px">';
  if (history.length === 0) {
    html += '<div style="font-size:12px;color:var(--text2);padding:20px 0;text-align:center">Belum ada riwayat sync</div>';
  } else {
    for (var i = 0; i < history.length; i++) {
      var e = history[i];
      var extras = '';
      if (e.price_changes > 0) extras += ' 🏷️ ' + e.price_changes;
      if (e.hk_changes > 0) extras += ' 💲HK ' + e.hk_changes;
      if (e.stock_changes > 0) extras += ' 📦 ' + e.stock_changes;
      if (e.added > 0) extras += ' ✨ +' + e.added;
      if (e.removed > 0) extras += ' ❌ -' + e.removed;
      html += '<div style="font-size:11px;padding:7px 8px;border-bottom:1px solid var(--border)">' +
        '<div style="font-weight:600">' + (e.time || '') + '</div>' +
        '<div style="color:var(--text2);font-size:10px;margin-top:2px">' + (e.items || 0).toLocaleString() + ' item' + extras + '</div></div>';
    }
  }
  html += '</div>';
  
  content.innerHTML = html;
}

function updateLastUpdateDisplay() {
  var dot = document.getElementById('statusDot');
  var age = document.getElementById('dataAge');
  if (!dot) return;
  var stored = localStorage.getItem('gp45_lu_v26');
  if (!stored) { dot.style.background = '#9ca3af'; if (age) age.textContent = ''; return; }
  var d = new Date(parseInt(stored));
  if (isNaN(d.getTime())) { dot.style.background = '#9ca3af'; if (age) age.textContent = ''; return; }
  var timeStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}) + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
  if (age) age.textContent = timeStr;
  var now = new Date();
  var days = Math.floor((now - d) / 86400000);
  if (days < 1) dot.style.background = '#16a34a';      // 🟢 Fresh
  else if (days < 3) dot.style.background = '#d97706';  // 🟡 Warning
  else dot.style.background = "#dc2626";                 // 🔴 Old
}

function showDataAge() {
  var stored = localStorage.getItem('gp45_lu_v26');
  if (!stored) return showToast('Data offline: belum pernah sync');
  var d = new Date(parseInt(stored));
  if (isNaN(d.getTime())) return showToast('Data offline: tanggal tidak valid');
  var timeStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
  var ago = timeAgo(stored);
  showToast('📦 Data offline: ' + timeStr + ' (' + ago + ')');
}

function pingServer200() {
  var dot = document.getElementById('connDot');
  var label = document.getElementById('connLabel');
  var pingEl = document.getElementById('connPing');
  if (!dot || !label) return;
  
  dot.style.background = '#9ca3af';
  dot.style.animation = 'connPulse 1s ease-in-out infinite';
  label.textContent = '⏳ Mengetes koneksi ke server 200...';
  pingEl.textContent = '';
  
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
  var start = Date.now();
  fetch(gpApi('sync'), { method:'GET', signal: controller.signal })
    .then(function(r) {
      clearTimeout(timeoutId);
      var ms = Date.now() - start;
      dot.style.animation = '';
      if (r.ok) {
        if (ms < 120) { dot.style.background = '#16a34a'; label.textContent = '✅ Server 200 terhubung'; }
        else if (ms < 500) { dot.style.background = '#d97706'; label.textContent = '⚠️ Server 200 lambat'; }
        else { dot.style.background = "#dc2626"; label.textContent = '🐢 Server 200 sangat lambat'; }
        pingEl.textContent = ms + 'ms';
      } else {
        dot.style.background = "#dc2626"; label.textContent = '❌ Server 200 error'; pingEl.textContent = '';
      }
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      dot.style.background = "#dc2626";
      label.textContent = err.name === 'AbortError' ? '⏰ Server 200 timeout' : '❌ Server 200 tidak terjangkau';
      pingEl.textContent = '';
    });
}

// Offline outlet stock storage

function showBranchStock(containerId, item, kode) {
  var container = document.getElementById(containerId);
  if (!container) return;
  if (!kode && item) kode = item.k || item.b;
  if (!kode) { container.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text2)">Tidak ada kode</div>'; return; }
  
  // Generate safe id
  var safeId = kode.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Render 3-source card
  container.innerHTML = '<div class="bs-grid">' +
    '<div class="bs-card offline"><div class="bs-label">📦 Offline</div><div class="bs-content" id="bs_off_' + safeId + '">⏳ Memuat...</div></div>' +
    '<div class="bs-card server"><div class="bs-label">🌐 Server 200</div><div class="bs-content" id="bs_srv_' + safeId + '">⏳ Memuat...</div></div>' +
    '<div class="bs-card relay"><div class="bs-label">📡 Relay</div><div class="bs-content" id="bs_rly_' + safeId + '">⏳ Memuat...</div></div>' +
    '</div>';
  
  // Source 1: Offline (immediate)
  (function() {
    var el = document.getElementById('bs_off_' + safeId);
    if (!el) return;
    var saved = loadOutletStockLocal(kode);
    if (saved && saved.stocks) {
      // Inject GP45 stock from item's main stock (q field)
      if (item && item.q !== undefined) {
        saved.stocks['GP45'] = Number(item.q) || 0;
      }
      var h = renderOutletStockHTML(saved.stocks, saved.ts);
      el.innerHTML = h || '<div class="bs-empty">Tidak ada data offline</div>';
    } else if (item && item.q !== undefined) {
      // Fallback: show main stock from database
      var mainStok = {};
      mainStok['GP45'] = Number(item.q) || 0;
      var h = renderOutletStockHTML(mainStok, Date.now());
      el.innerHTML = h || '<div class="bs-empty">Stok: ' + Number(item.q).toFixed(0) + '</div>';
      el.innerHTML += '<div style="font-size:9px;color:var(--text2);margin-top:4px">💡 Data outlet stock belum di-sync. Tampil stok pusat.</div>';
    } else {
      el.innerHTML = '<div class="bs-empty">Belum ada data outlet</div>';
    }
  })();
  
  // Source 2: Server 200
  (function() {
    var el = document.getElementById('bs_srv_' + safeId);
    if (!el) return;
    el.innerHTML = '<div class="bs-loading">⏳ Mengambil dari server 200...</div>';
    var controller = new AbortController();
    var tid = setTimeout(function() { controller.abort(); }, 15000);
    var start = Date.now();
    fetch(gpApi('detail', 'kode=' + encodeURIComponent(kode)), { signal: controller.signal })
      .then(function(r) { clearTimeout(tid); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(d) {
        if (d.error) throw new Error(d.error);
        var stocks = {}; stocks['GP45'] = Number(d.Stok || 0);
        if (d.stocks) { for (var key in d.stocks) stocks[key] = Number(d.stocks[key]) || 0; }
        var h = renderOutletStockHTML(stocks, Date.now());
        el.innerHTML = h || '<div class="bs-empty">Tidak ada data</div>';
        var ms = Date.now() - start;
        el.innerHTML += '<div class="bs-time">🌐 ' + ms + 'ms</div>';
      })
      .catch(function(err) {
        if (err.name === 'AbortError') {
          el.innerHTML = '<div class="bs-error">⏱ Server 200 terlalu lambat (timeout 15 detik)</div>';
        } else {
          el.innerHTML = '<div class="bs-error">❌ ' + esc(err.message) + '</div>';
        }
      });
  })();
  
  // Source 3: Relay (always loads, independent of server 200 result)
  (function() {
    var rlyEl = document.getElementById('bs_rly_' + safeId);
    if (!rlyEl) return;
    var rlyUrl = getRelayUrl();
    if (!rlyUrl) {
      rlyEl.innerHTML = '<div class="bs-empty">⚙️ Atur URL relay di tab RELAY</div>';
      return;
    }
    rlyEl.innerHTML = '<div class="bs-loading">⏳ Mengambil dari relay...</div>';
    var rc = new AbortController();
    var rtid = setTimeout(function() { rc.abort(); }, 10000);
    var rstart = Date.now();
    fetch(rlyUrl + '?key=gp45relay&live=1&action=detail&kode=' + encodeURIComponent(kode), { signal: rc.signal })
      .then(function(r) { clearTimeout(rtid); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(d) {
        if (d.error) throw new Error(d.error);
        var stocks = {}; stocks['GP45'] = Number(d.Stok || 0);
        if (d.stocks) { for (var key in d.stocks) stocks[key] = Number(d.stocks[key]) || 0; }
        var h = renderOutletStockHTML(stocks, Date.now());
        rlyEl.innerHTML = h || '<div class="bs-empty">Tidak ada data</div>';
        var rms = Date.now() - rstart;
        rlyEl.innerHTML += '<div class="bs-time">📡 ' + rms + 'ms</div>';
      })
      .catch(function(e) {
        var msg = e.name === 'AbortError' ? 'Relay timeout' : (e.message || 'Relay gagal');
        rlyEl.innerHTML = '<div class="bs-error">❌ ' + esc(msg) + '</div>';
      });
  })();
}

function saveOutletStockLocal(kode, stocks) {
  if (!kode || !stocks) return;
  try {
    var key = 'gp45_ostock_' + kode.replace(/[^a-zA-Z0-9]/g, '_');
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), stocks: stocks }));
  } catch(e) { /* localStorage full - ignore */ }
}

function loadOutletStockLocal(kode) {
  if (!kode) return null;
  // Check in-memory data first (faster, no race condition)
  if (typeof outletStockData !== 'undefined' && outletStockData && outletStockData[kode]) {
    return { ts: Date.now(), stocks: outletStockData[kode] };
  }
  // Fallback to localStorage
  try {
    var key = 'gp45_ostock_' + kode.replace(/[^a-zA-Z0-9]/g, '_');
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function renderOutletStockHTML(stocks, ts) {
  if (!stocks) return null;
  // Fixed order and labels for all outlets — always shown, even if stok = 0
  var outletOrder = ['GP45', 'GP', 'MCT', 'GH', 'GHM', 'GHA', 'GHB', 'HO'];
  var labels = { 'GP45': 'GP45', 'GP': 'GP', 'MCT': 'MCT', 'GH': 'GH', 'GHM': 'GHM', 'GHA': 'GHA', 'GHB': 'GHB', 'HO': 'HO' };
  var total = 0;
  var h = '';
  for (var i = 0; i < outletOrder.length; i++) {
    var k = outletOrder[i];
    var qty = (stocks[k] !== undefined && stocks[k] !== null) ? Number(stocks[k]) : 0;
    total += qty;
    var nm = labels[k] || k;
    var color = qty > 0 ? 'var(--green)' : (qty < 0 ? 'var(--primary)' : 'var(--text2)');
    h += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px"><span><b>' + nm + '</b></span><span style="font-weight:700;color:' + color + '">' + qty.toFixed(0) + '</span></div>';
  }
  h += '<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;font-size:13px;font-weight:700;border-top:2px solid var(--primary);color:var(--text)"><span>📊 Total</span><span style="color:var(--primary)">' + total.toFixed(0) + '</span></div>';
  
  if (ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    var ago = diff < 60 ? diff + ' detik' : diff < 3600 ? Math.floor(diff/60) + ' menit' : diff < 86400 ? Math.floor(diff/3600) + ' jam' : Math.floor(diff/86400) + ' hari';
    h += '<div style="font-size:10px;color:var(--text2);text-align:right;margin-top:4px">🕐 ' + ago + ' yang lalu</div>';
  }
  return h;
}

function pingRelay() {
  var dot = document.getElementById('connDot');
  var label = document.getElementById('connLabel');
  var pingEl = document.getElementById('connPing');
  if (!dot || !label) return;
  
  var url = getRelayUrl();
  if (!url) {
    dot.style.background = '#9ca3af'; label.textContent = '⏸️ Relay: atur URL dulu'; pingEl.textContent = '';
    return;
  }
  
  dot.style.background = '#9ca3af';
  dot.style.animation = 'connPulse 1s ease-in-out infinite';
  label.textContent = '⏳ Mengetes relay...';
  pingEl.textContent = '';
  
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
  var start = Date.now();
  fetch(url + '?key=gp45relay&action=status', {
    method: 'GET',
    signal: controller.signal
  })
    .then(function(r) {
      clearTimeout(timeoutId);
      var ms = Date.now() - start;
      dot.style.animation = '';
      if (r.ok) {
        if (ms < 500) { dot.style.background = '#16a34a'; label.textContent = '✅ Relay terhubung'; }
        else if (ms < 2000) { dot.style.background = '#d97706'; label.textContent = '⚠️ Relay lambat'; }
        else { dot.style.background = "#dc2626"; label.textContent = '🐢 Relay sangat lambat'; }
        pingEl.textContent = ms + 'ms';
      } else {
        dot.style.background = "#dc2626"; label.textContent = '❌ Relay error ' + r.status; pingEl.textContent = '';
      }
    })
    .catch(function(err) {
      clearTimeout(timeoutId);
      dot.style.background = "#dc2626";
      label.textContent = err.name === 'AbortError' ? '⏰ Relay timeout' : '❌ Relay tidak terjangkau';
      pingEl.textContent = '';
    })
    .then(function() {
      // Auto fence removed
    });
}
function cancelSync() {
  if (_currentSyncController) {
    try { _currentSyncController.abort(); } catch(e) {}
    _currentSyncController = null;
  }
  document.getElementById('syncOverlay').classList.remove('show');
}






function resetSyncOverlay() {
  var overlay = document.getElementById('syncOverlay');
  var ipRow = overlay.querySelector('.sync-panel > div:first-child');
  if (ipRow && ipRow.querySelector('#syncServerIp')) {
    // IP row exists - keep it, only reset loading section
    var loadingSection = overlay.querySelector('#syncLoading');
    if (loadingSection) {
      loadingSection.innerHTML = 
        '<div class="spinner"></div>' +
        '<div id="syncTitle" style="font-size:16px;font-weight:700;margin:8px 0 4px">Sync Database</div>' +
        '<div id="syncSub" style="font-size:12px;color:var(--text2)">Mendownload data terbaru...</div>' +
        '<div id="syncStatus" style="font-size:12px;color:var(--text2);margin-top:8px;text-align:center">Siap sync</div>' +
        '<div class="progress-bar" style="width:auto;margin:12px 20px"><div class="fill" id="syncBar" style="width:10%"></div></div>' +
        '<div id="syncProgressText" style="font-size:11px;color:var(--text2);text-align:center">Downloading latest data from server</div>' +
        '<button onclick="cancelSync()" id="syncCancelBtn" style="width:100%;padding:10px;margin-top:12px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">✕ Batal</button>';
    }
  } else {
    overlay.innerHTML = '<div class="sync-panel">' +
      '<div class="spinner"></div>' +
      '<div class="sync-status-text">Starting...</div>' +
      '<div class="progress-bar" style="width:auto;margin:12px 20px"><div class="fill sync-bar-fill" style="width:0%"></div></div>' +
      '<div class="sync-progress-text">Downloading latest data from server</div></div>';
  }
}
function saveToIndexedDB(items) {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open('GP45Offline', 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('stock')) { db.createObjectStore('stock', {keyPath:'k'}); }
    };
    req.onsuccess = function(e) {
      var db = e.target.result;
      var tx = db.transaction('stock', 'readwrite');
      var store = tx.objectStore('stock');
      store.clear();
      for (var i = 0; i < items.length; i++) { store.put(items[i]); }
      tx.oncomplete = function() { db.close(); resolve(); };
      tx.onerror = function(err) { db.close(); reject(err); };
    };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

// Load from IndexedDB first
var originalLoadData = loadData;
loadData = function() {
  var req = indexedDB.open('GP45Offline', 1);
  req.onsuccess = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains('stock')) { db.close(); originalLoadData(); return; }
    var tx = db.transaction('stock', 'readonly');
    var store = tx.objectStore('stock');
    var countReq = store.count();
    countReq.onsuccess = function() {
      if (countReq.result > 0) {
        var getAll = store.getAll();
        getAll.onsuccess = function() {
          allItems = getAll.result; db.close();
          document.getElementById('loadingSection').style.display = 'none';
          document.getElementById('statusText').textContent = allItems.length.toLocaleString() + ' items • cached';
          document.getElementById('itemCount').textContent = '📦 ' + allItems.length.toLocaleString();
          document.getElementById('searchInput').disabled = false;
          document.getElementById('searchInput').focus();
          setTimeout(function() {
          }, 600);
        };
        getAll.onerror = function() { db.close(); originalLoadData(); };
      } else { db.close(); originalLoadData(); }
    };
    countReq.onerror = function() { db.close(); originalLoadData(); };
  };
  req.onerror = function() { originalLoadData(); };
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains('stock')) { db.createObjectStore('stock', {keyPath:'k'}); }
  };
};

