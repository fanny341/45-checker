// GP45 - server81.js

// ════════════════════════════════════════
// SERVER 81 SEARCH
// ════════════════════════════════════════

// Online search: fetch from server, show in suggestions
function doServer81SearchProgressive(query) {
  if (!query || query.trim().length < 1) { doClearSearch(); return; }
  
  var el = document.getElementById('suggestions');
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)"><div class="spin" style="margin:0 auto 8px"></div>🌐 Mencari di server...</div>';
  el.classList.add('show');
  
  fetch(gpApi('cari', 'q=' + encodeURIComponent(query.trim())))
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(items) {
      if (!items || items.length === 0) {
        el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">❌ Barang tidak ditemukan di server<br><small>Coba kata kunci lain</small></div>';
        return;
      }
      // Map server fields to internal format - filter by all keywords (AND)
      var keywords = query.trim().toLowerCase().split(/[\s,]+/).filter(function(kw) { return kw.length > 0; });
      var mapped = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.Kode) continue;
        // Filter by all keywords (server uses AND already, but double-check)
        var n = (it.Nama || '').toLowerCase();
        var matchAll = keywords.every(function(kw) { return n.indexOf(kw) !== -1; });
        if (!matchAll) continue;
        mapped.push({
          k: it.Kode || '',
          n: it.Nama || '',
          b: it.Barcode || '',
          h: it.HJual || 0,
          q: it.Stok || 0,
          m: it.Merek || '',
          s: it.Satuan || ''
        });
      }
      if (mapped.length === 0) {
        el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">❌ Barang tidak ditemukan</div>';
        return;
      }
      // Sort: stock > 0 first
      mapped.sort(function(a,b) {
        var sa = parseFloat(a.q) || 0;
        var sb = parseFloat(b.q) || 0;
        if (sa > 0 && sb <= 0) return -1;
        if (sa <= 0 && sb > 0) return 1;
        return 0;
      });
      window._lastResults = mapped;
      var h = '';
      for (var i = 0; i < Math.min(mapped.length, 50); i++) {
        var it = mapped[i];
        var price = it.h > 0 ? 'Rp' + Number(it.h).toLocaleString('id-ID') : '-';
        var sc = it.q > 0 ? 'avail' : 'empty';
        var sl = it.q > 0 ? Number(it.q).toFixed(0) : '0';
        h += '<div class="item" onclick="selectItem(' + i + ')"><div class="info"><div class="name">' + esc(it.n) + '</div><div class="bcode">' + esc(it.b || '') + ' | ' + esc(it.m || '') + '</div></div><div class="price">' + price + '</div><div class="stock ' + sc + '">' + sl + '</div></div>';
      }
      el.innerHTML = h;
      el.classList.add('show');
    })
    .catch(function(err) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--primary)">❌ Gagal: ' + esc(err.message) + '</div>';
      showToast('Online error: ' + err.message);
    });
}

function doServer81Search(query) {
  if (!query || query.trim().length < 1) { doClearSearch(); return; }
  var area = document.getElementById('liveArea');
  area.innerHTML = '<div class="live-loading"><div class="spin"></div>Mencari <strong>' + esc(query) + '</strong> di server...</div>';
  
  fetch(gpApi('cari', 'q=' + encodeURIComponent(query.trim())))
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(items) {
      if (!items || items.length === 0) {
        area.innerHTML = '<div class="live-error">❌ Barang tidak ditemukan di server</div>';
        return;
      }
      var h = '<div style="font-size:11px;color:var(--text2);padding:8px 0 4px;font-weight:500">Ditemukan ' + items.length + ' barang</div>';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var price = it.HJual > 0 ? 'Rp' + Number(it.HJual).toLocaleString('id-ID') : '-';
        var sc = it.Stok > 0 ? '' : 'empty';
        var bcode = it.Barcode || '';
        var name = esc(it.Nama);
        var kod = esc(it.Kode);
        h += '<div class="live-item" onclick="showServer81Detail(\'' + kod + '\',\'' + esc(bcode) + '\')">' +
          '<div class="info"><div class="name">' + name + '</div><div class="bcode">' + esc(bcode || '') + ' | ' + esc(it.Merek || '') + ' <span style="background:#e8f5e9;padding:1px 6px;border-radius:4px;font-size:9px;color:var(--green)">' + esc(it.outlet || '') + '</span></div></div>' +
          '<div class="price">' + price + '</div>' +
          '<div class="stock ' + sc + '">' + Number(it.q || 0).toFixed(0) + '</div></div>';
      }
      area.innerHTML = h;
    })
    .catch(function(err) {
      area.innerHTML = '<div class="live-error">❌ Gagal konek server: ' + esc(err.message) + '</div>';
    });
}

function showServer81Result(item) {
  // Show item detail in resultCard (like OFFLINE) + fetch branch stock from server
  var card = document.getElementById('resultCard');
  var sc = item.q > 0 ? 'avail' : 'empty';
  var sl = item.q > 0 ? '✅ Stok: ' + Number(item.q).toFixed(0) + ' ' + (item.s || '') : '❌ Stok Habis';
  
  var extras = '';
  if (item.hb > 0) extras += '<div class="cell"><div class="lbl">Harga Beli</div><div class="val">Rp' + Number(item.hb).toLocaleString('id-ID') + '</div></div>';
  if (item.m && item.m.trim()) extras += '<div class="cell"><div class="lbl">Merek</div><div class="val">' + esc(item.m) + '</div></div>';
  if (item.h2 > 0) extras += '<div class="cell"><div class="lbl">HJual 2</div><div class="val">Rp' + Number(item.h2).toLocaleString('id-ID') + '</div></div>';
  if (item.h3 > 0) extras += '<div class="cell"><div class="lbl">HJual 3</div><div class="val">Rp' + Number(item.h3).toLocaleString('id-ID') + '</div></div>';
  
  card.innerHTML = 
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div class="name" style="flex:1">' + esc(item.n) + '</div><button class="copy-np-btn" data-nama="' + escAttr(item.n) + '" data-harga="' + Number(item.h || 0).toLocaleString('id-ID') + '" style="flex-shrink:0;background:none;border:none;font-size:20px;cursor:pointer;padding:4px;border-radius:8px;line-height:1" title="Salin nama + harga">📋</button></div>' +
    '<div class="price-section">' +
      '<div class="price-big"><span class="rp">Rp</span>' + Number(item.h || 0).toLocaleString('id-ID') + '</div>' +
    '</div>' +
    '<div class="stock-row ' + sc + '">' + sl + '</div>' +
    '<div class="info-grid">' + extras + '</div>' +
    '<div id="onlineBranchStock" style="margin-top:10px;padding:12px;background:var(--bg);border-radius:10px;text-align:center;font-size:13px;color:var(--text2)">🔄 Mengambil stok cabang...</div>';
  
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
  
  // Branch stock: 3 sources (offline, server 200, relay)
  var q = item.k || item.b;
  showBranchStock('onlineBranchStock', q);
}

function showServer81Detail(kode, barcode) {
  var q = barcode || kode;
  var area = document.getElementById('liveArea');
  area.innerHTML = '<div class="live-loading"><div class="spin"></div>Mengambil detail...</div>';
  
  fetch(gpApi('detail', 'kode=' + encodeURIComponent(q)))
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d) {
      if (d.error) throw new Error(d.error);
      SearchHistory.save({k: d.Kode, n: d.Nama, h: d.HJual, b: d.Barcode});
      var sc = d.Stok > 0 ? 'avail' : 'empty';
      var sl = d.Stok > 0 ? '✅ Stok: ' + Number(d.Stok).toFixed(0) + ' ' + (d.Satuan || '') : '❌ Stok Habis';
      var info = '<div class="cell"><div class="lbl">Kode</div><div class="val">' + esc(d.Kode) + '</div></div>';
      info += '<div class="cell"><div class="lbl">Barcode</div><div class="val">' + esc(d.Barcode || '-') + '</div></div>';
      if (d.Barcode2) info += '<div class="cell"><div class="lbl">Barcode 2</div><div class="val">' + esc(d.Barcode2) + '</div></div>';
      info += '<div class="cell"><div class="lbl">Satuan</div><div class="val">' + esc(d.Satuan || '-') + '</div></div>';
      info += '<div class="cell"><div class="lbl">Merek</div><div class="val">' + esc(d.Merek || '-') + '</div></div>';
      info += '<div class="cell"><div class="lbl">Harga Beli</div><div class="val">Rp' + Number(d.HBeli || 0).toLocaleString('id-ID') + '</div></div>';
      info += '<div class="cell"><div class="lbl">Harga Jual</div><div class="val" style="color:var(--primary);font-size:16px;font-weight:700">Rp' + Number(d.HJual || 0).toLocaleString('id-ID') + '</div></div>';
      if (d.HJual2 > 0) info += '<div class="cell"><div class="lbl">Harga Jual 2</div><div class="val">Rp' + Number(d.HJual2).toLocaleString('id-ID') + '</div></div>';
      if (d.HJual3 > 0) info += '<div class="cell"><div class="lbl">Harga Jual 3</div><div class="val">Rp' + Number(d.HJual3).toLocaleString('id-ID') + '</div></div>';
      if (d.HMember > 0) info += '<div class="cell"><div class="lbl">Harga Member</div><div class="val">Rp' + Number(d.HMember).toLocaleString('id-ID') + '</div></div>';
      // GP45 stock = d.Stok
      var gp45_qty = Number(d.Stok || 0);
      var cabang = [];
      var total_cabang = gp45_qty;
      cabang.push({code:'GP45', name:'GP45 (Pusat)', qty:gp45_qty});
      if (d.stocks) {
        for (var key in d.stocks) {
          if (key === 'GP45') continue;
          var qty = Number(d.stocks[key]) || 0;
          total_cabang += qty;
          cabang.push({code:key, name:('Outlet ' + key), qty:qty});
        }
      }
      if (cabang.length > 1) {
        info += '<div class="detail-title" style="margin-top:8px;font-size:13px;font-weight:600;color:var(--text2)">📍 Stok Per Cabang</div>';
        for (var i = 0; i < cabang.length; i++) {
          var c = cabang[i];
          var cqty = Number(c.qty) || 0;
          info += '<div class="cell"><div class="lbl">' + esc(c.name) + '</div><div class="val" style="font-weight:600;color:' + (cqty > 0 ? 'var(--green)' : 'var(--primary)') + '">' + cqty.toFixed(0) + '</div></div>';
        }
        info += '<div class="cell full" style="margin-top:4px;border-top:2px solid var(--primary);padding-top:8px"><div class="lbl" style="font-weight:700">📊 Total Semua</div><div class="val" style="font-size:16px;font-weight:700;color:var(--primary)">' + total_cabang.toFixed(0) + '</div></div>';
      } else {
        info += '<div class="cell" style="grid-column:1/-1"><div class="lbl">Stok GP45 (Pusat)</div><div class="val" style="font-size:16px;font-weight:700;color:' + (gp45_qty > 0 ? 'var(--green)' : 'var(--primary)') + '">' + gp45_qty.toFixed(0) + '</div></div>';
      }
      area.innerHTML = 
        '<div style="padding:12px 16px">' +
        '<button class="back-btn" onclick="backToServer81Results()">← Kembali ke hasil</button>' +
        '<div class="result-card show" style="margin:0">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div class="name" style="flex:1">' + esc(d.Nama) + '</div><button class="copy-np-btn" data-nama="' + escAttr(d.Nama) + '" data-harga="' + Number(d.HJual || 0).toLocaleString('id-ID') + '" style="flex-shrink:0;background:none;border:none;font-size:20px;cursor:pointer;padding:4px;border-radius:8px;line-height:1" title="Salin nama + harga">📋</button></div>' +
        '<div class="stock-row ' + sc + '" style="margin:8px 0">' + sl + '</div>' +
        '<div class="detail-title">📋 Informasi Lengkap</div>' +
        '<div class="detail-grid">' + info + '</div></div></div>';
    })
    .catch(function(err) {
      area.innerHTML = '<div class="live-error">❌ Gagal: ' + esc(err.message) + '</div>';
    });
}

function backToServer81Results() {
  var q = document.getElementById('searchInput').value;
  doServer81Search(q);
}

