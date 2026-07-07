// GP45 - relay.js

// ════════════════════════════════════════
// RELAY MODE - Cloudflare Worker (POST JSON)
// ════════════════════════════════════════

function saveRelayUrl() {
  var url = document.getElementById('relayUrlInput').value.trim();
  if (!url) {
    document.getElementById('relayStatus').textContent = '🔴 Masukkan URL server relay';
    return;
  }
  if (url.endsWith('/')) url = url.slice(0, -1);
  localStorage.setItem('gp45_relay_url', url);
  document.getElementById('relayStatus').textContent = '✅ Server: ' + url;
  showToast('URL relay disimpan');
}

function getRelayUrl() {
  var u = localStorage.getItem('gp45_relay_url');
  if (!u) { u = 'https://gp45-relay.xmoritzu.workers.dev/'; localStorage.setItem('gp45_relay_url', u); }
  return u;
}

function doRelaySearch(query) {
  var area = document.getElementById('liveArea');
  var url = getRelayUrl();
  if (!url) {
    area.innerHTML = '<div class="live-error">❌ Atur dulu URL server relay di input di atas</div>';
    return;
  }
  
  if (!query || query.trim().length < 1) {
    area.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text2);font-size:14px"><span style="font-size:48px;display:block;margin-bottom:12px">📡</span>Cari barang via relay server<br><span style="font-size:12px">Akses dari mana saja!</span></div>';
    return;
  }
  
  area.innerHTML = '<div class="live-loading"><div class="spin"></div>🌐 Mencari di relay server...</div>';
  
  var searchController = new AbortController();
  var searchTimeoutId = setTimeout(function() { searchController.abort(); }, 30000);
  fetch(url + '?key=gp45relay&live=1&action=cari&q=' + encodeURIComponent(query.trim()), {
    method: 'GET',
    signal: searchController.signal
  })
    .then(function(r) { clearTimeout(searchTimeoutId); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      var items = data && data.items ? data.items : (data || []);
      if (!items || items.length === 0) {
        area.innerHTML = '<div class="live-error">❌ Barang tidak ditemukan</div>';
        return;
      }
      var h = '<div style="margin-bottom:8px;font-size:12px;color:var(--text2)">Ditemukan ' + items.length + ' barang</div>';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var name = esc(it.nama || it.Nama || '');
        var kod = esc(it.kode || it.Kode || '');
        var bcode = esc(it.barcode || it.BarcodeAktif || it.Barcode || '');
        var price = (it.harga_jual || it.HJual) > 0 ? 'Rp' + Number(it.harga_jual || it.HJual).toLocaleString('id-ID') : '-';
        var stok = it.stok || it.qty || it.QtyAkhir || 0;
        var sc = stok > 0 ? '' : 'empty';
        h += '<div class="live-item" onclick="showRelayDetail(\'' + kod + '\')">' +
          '<div class="info"><div class="name">' + name + '</div><div class="bcode">' + bcode + '</div></div>' +
          '<div class="price">' + price + '</div>' +
          '<div class="stock ' + sc + '">' + Number(stok).toFixed(0) + '</div></div>';
      }
      area.innerHTML = h;
    })
    .catch(function(err) {
      clearTimeout(searchTimeoutId);
      area.innerHTML = '<div class="live-error">❌ Gagal: ' + esc(err.message) + '<br><small>Cek URL server atau koneksi internet</small></div>';
    });
}

function showRelayDetail(kode) {
  var area = document.getElementById('liveArea');
  var url = getRelayUrl();
  if (!url) {
    area.innerHTML = '<div class="live-error">❌ Atur dulu URL server relay</div>';
    return;
  }
  
  area.innerHTML = '<div class="live-loading"><div class="spin"></div>Mengambil detail...</div>';
  
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
  fetch(url + '?key=gp45relay&live=1&action=detail&kode=' + encodeURIComponent(kode), {
    method: 'GET',
    signal: controller.signal
  })
    .then(function(r) { clearTimeout(timeoutId); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(d) {
      clearTimeout(timeoutId);
      if (d.error) throw new Error(d.error || 'Barang tidak ditemukan');
      SearchHistory.save({k: d.kode || d.Kode, n: d.nama || d.Nama, h: d.harga_jual || d.HJual, b: d.barcode || d.BarcodeAktif || d.Barcode});
      // Handle stocks from live API (format: {"GH":5,"GHA":2}) or QtyAkhir for main stock
      var stk = d.stocks || d.stok_cabang || {};
      var stokKeys = Object.keys(stk);
      var stokTotal = Number(d.QtyAkhir || d.qty_akhir || 0);
      for (var i = 0; i < stokKeys.length; i++) { var r = stk[stokKeys[i]]; stokTotal += (r && typeof r === 'object' ? (r.qty || r.stok || 0) : (r || 0)); }
      
      var stockClass = stokTotal > 0 ? 'avail' : 'empty';
      var stockLabel = stokTotal > 0 ? '✅ Stok: ' + Number(stokTotal).toFixed(0) : '❌ Stok Habis';
      
      var nama = esc(d.nama || d.Nama || '');
      var kod = esc(d.kode || d.Kode || kode);
      var bc = esc(d.barcode || d.BarcodeAktif || d.Barcode || '-');
      var price = Number(d.harga_jual || d.HJual || 0);
      var hb = Number(d.harga_beli || d.HBeli || 0);
      
      // Info grid
      var extras = '<div class="cell"><div class="lbl">Kode</div><div class="val">' + kod + '</div></div>';
      extras += '<div class="cell"><div class="lbl">Barcode</div><div class="val">' + bc + '</div></div>';
      extras += '<div class="cell"><div class="lbl">Satuan</div><div class="val">' + esc(d.satuan || d.Satuan || '-') + '</div></div>';
      if (d.merek || d.Merek) extras += '<div class="cell"><div class="lbl">Merek</div><div class="val">' + esc(d.merek || d.Merek) + '</div></div>';
      if (hb > 0) extras += '<div class="cell"><div class="lbl">Harga Beli</div><div class="val">Rp' + hb.toLocaleString('id-ID') + '</div></div>';
      if (d.harga_jual2 > 0) extras += '<div class="cell"><div class="lbl">HJual 2</div><div class="val">Rp' + Number(d.harga_jual2).toLocaleString('id-ID') + '</div></div>';
      if (d.harga_jual3 > 0) extras += '<div class="cell"><div class="lbl">HJual 3</div><div class="val">Rp' + Number(d.harga_jual3).toLocaleString('id-ID') + '</div></div>';
      
      // Branch stock
      var bsHtml = '';
      if (stokKeys.length > 0) {
        bsHtml += '<div class="detail-title" style="margin-top:12px">📍 Stok Per Cabang</div>';
        var sortedKeys = stokKeys.slice().sort();
        for (var i = 0; i < sortedKeys.length; i++) {
          var out = sortedKeys[i];
          var raw = stk[out];
          var qty = (raw && typeof raw === 'object' ? (raw.qty || raw.stok || 0) : (raw || 0));
          bsHtml += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px"><span>' + esc(out) + '</span><span style="font-weight:700;color:' + (qty > 0 ? 'var(--green)' : 'var(--primary)') + '">' + Number(qty).toFixed(0) + '</span></div>';
        }
      } else {
        bsHtml += '<div style="margin-top:10px;padding:12px;background:var(--bg);border-radius:10px;text-align:center;font-size:13px;color:var(--text2)">Tidak ada data stok cabang</div>';
      }
      
      area.innerHTML =
        '<div style="padding:12px 16px">' +
        '<button class="back-btn" onclick="backToRelayResults()">← Kembali ke hasil</button>' +
        '<div class="result-card show" style="margin:0">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div class="name" style="flex:1">' + nama + '</div><button class="copy-np-btn" data-nama="' + escAttr(d.nama || d.Nama || '') + '" data-harga="' + price.toLocaleString('id-ID') + '" style="flex-shrink:0;background:none;border:none;font-size:20px;cursor:pointer;padding:4px;border-radius:8px;line-height:1" title="Salin nama + harga">📋</button></div>' +
        // Big Price
        '<div class="price-section">' +
          '<div class="price-big"><span class="rp">Rp</span>' + price.toLocaleString('id-ID') + '</div>' +
        '</div>' +
        '<div class="stock-row ' + stockClass + '" style="margin:8px 0">' + stockLabel + '</div>' +
        '<div class="detail-title">📋 Informasi Lengkap (RELAY)</div>' +
        '<div class="info-grid">' + extras + '</div>' +
        bsHtml + '</div></div>';
    })
    .catch(function(err) { clearTimeout(timeoutId);
      area.innerHTML = '<div class="live-error">❌ Gagal: ' + esc(err.message) + '</div>';
    });
}

function backToRelayResults() {
  var q = document.getElementById('searchInput').value;
  if (q && q.trim()) {
    doRelaySearch(q.trim());
  } else {
    document.getElementById('liveArea').innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text2);font-size:14px"><span style="font-size:48px;display:block;margin-bottom:12px">📡</span>Cari barang via relay server<br><span style="font-size:12px">Akses dari mana saja!</span></div>';
  }
}
// Close sync history overlay when tapping outside
document.addEventListener('click', function(e) {
  var overlay = document.getElementById('syncHistOverlay');
  if (overlay && overlay.style.display === 'flex' && e.target === overlay) {
    overlay.style.display = 'none';
  }
});
// Copy nama + harga (from 📋 button)
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.copy-np-btn');
  if (btn) {
    var nama = btn.getAttribute('data-nama');
    var harga = btn.getAttribute('data-harga');
    copyText(nama + ' - Rp' + harga);
    showToast('✅ Tersalin: ' + nama.substring(0, 30) + '... - Rp' + harga);
  }
});

function copyText(str) {
  if (!str) return;
  try {
    // Use native clipboard via AndroidUtils bridge if available
    if (window.AndroidUtils) {
      AndroidUtils.copyToClipboard(str);
      return;
    }
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

// Price click to copy
document.addEventListener('click', function(e) {
  var el = e.target.closest('.price-big');
  if (el) { copyText(el.textContent.trim().replace(/[^0-9,]/g,'')); }
  var el2 = e.target.closest('.sku span:first-child, .sku span:last-child');
  if (el2 && !e.target.closest('.live-tag')) { copyText(el2.textContent.trim()); }
});

// ── OMSET Setting Functions ──

function loadOmsetBulan() {
  var date=document.getElementById("omsetDate").value;
  if(!date) date=new Date().toISOString().slice(0,10);
  var area=document.getElementById("omsetBulanResult");
  area.style.display="block";
  document.getElementById("omsetResult").style.display="none";
  // Tab toggle
  document.getElementById("omsetTabBtn").classList.remove("active");
  document.getElementById("omsetBulanBtn").classList.add("active");
  area.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2);font-size:15px">⏳ Mengambil omset bulan ini...</div>';
  
  var monthStart = date.slice(0,8)+"01";
  
  function fetchBulan(url){
    var timedOut = false;
    var tid = setTimeout(function(){ timedOut = true; }, 20000);
    return fetch(url)
      .then(function(r){ if(timedOut)throw new Error("Timeout"); clearTimeout(tid); return r.json(); })
      .catch(function(err){
        clearTimeout(tid);
        if(timedOut) throw new Error("Server tidak merespon");
        throw err;
      });
  }
  
  fetchBulan(gpApi("omset-bulan", "date="+date))
    .then(function(data){
      var area=document.getElementById("omsetBulanResult");
      if(!data||!data.sales||!data.sales.length){
        area.innerHTML='<div style="text-align:center;padding:12px;color:var(--text2);font-size:15px">\uD83d\udced Tidak ada data bulan ini</div>';
        return;
      }
      var sales=data.sales||[];
      var gr=data.grand_total||0;
      var gt=data.total_trans||0;
      
      // Load lantai setting from localStorage
      var settJson=localStorage.getItem("gp45_omset_v2");
      var sett=settJson?JSON.parse(settJson):{l1_target:4285714,l2_target:3333333,l1_sales:["Brayen","Darren","Raydel","Pricilia","Franklyn","Genio"],l2_sales:["Mario","Johanes","Rivaldo","Moors"],inactive_sales:["Reagen","Yoshua"]};
      if(!sett.l1_sales) sett.l1_sales=[];
      if(!sett.l2_sales) sett.l2_sales=[];
      if(!sett.inactive_sales) sett.inactive_sales=[];
      
      // Build lookup maps
      var l1map={}, l2map={}, inactmap={};
      for(var si=0;si<sett.l1_sales.length;si++) l1map[(sett.l1_sales[si]||"").toLowerCase()]=true;
      for(var si=0;si<sett.l2_sales.length;si++) l2map[(sett.l2_sales[si]||"").toLowerCase()]=true;
      for(var si=0;si<sett.inactive_sales.length;si++) inactmap[(sett.inactive_sales[si]||"").toLowerCase()]=true;
      
      // Divide sales by lantai
      var l1_sales_list=[], l2_sales_list=[], unassigned=[];
      var l1_total=0, l1_trans=0, l2_total=0, l2_trans=0, unk_total=0, unk_trans=0;
      
      for(var i=0;i<sales.length;i++){
        var r=sales[i];
        var nm=(r.sales||"").toLowerCase();
        var j=Number(r.total||0);
        if(j<=0) continue;
        if(inactmap[nm]) continue;
        
        if(l1map[nm]){ l1_sales_list.push(r); l1_total+=j; l1_trans+=Number(r.trans||0); }
        else if(l2map[nm]){ l2_sales_list.push(r); l2_total+=j; l2_trans+=Number(r.trans||0); }
        else{ unassigned.push(r); unk_total+=j; unk_trans+=Number(r.trans||0); }
      }
      
      var curDay = parseInt(date.slice(8,10));
      var monthDays = 30;
      var l1Count = l1_sales_list.length || 1;
      var l2Count = l2_sales_list.length || 1;
      // Target: (target harian * 26 hari kerja) per orang
      var targetPerOrgL1 = Number(sett.l1_target||0)*26;
      var targetPerOrgL2 = Number(sett.l2_target||0)*26;
      var monthTargetTotal = (targetPerOrgL1 * l1Count) + (targetPerOrgL2 * l2Count);
      var monthTargetL1 = targetPerOrgL1 * l1Count;
      var monthTargetL2 = targetPerOrgL2 * l2Count;
      
      var h = '<div style="margin:8px 0 4px;font-size:16px;color:var(--text2);font-weight:700">📅 Bulan Ini: 1-'+date.slice(8,10)+" "+["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][parseInt(date.slice(5,7))-1]+" "+date.slice(0,4)+'</div>';
      
      // Grand total bar
      var monthPct = monthTargetTotal>0 ? ((gr/monthTargetTotal)*100).toFixed(1) : "0";
      h += '<div class="omset-total"><span>💰 Grand Total Bulan Ini</span><span>'+gt+" trans \u2014 Rp"+Number(gr).toLocaleString("id-ID")+'</span></div>';
      if(monthTargetTotal>0){
        var color = parseFloat(monthPct)>=100 ? "#16a34a" : (parseFloat(monthPct)>=80 ? "#f59e0b" : "#dc2626");
        h += '<div style="text-align:right;font-size:13px;color:var(--text2);margin-bottom:8px">'+monthPct+'% dari target Rp '+Number(monthTargetTotal).toLocaleString("id-ID")+'</div>';
      }
      
      // Lantai 1 section
      if(l1_sales_list.length){
        h += '<div class="olantai-section"><div class="olantai-header l1">🔴 Lantai 1 \u2014 Target/org: Rp'+Number(targetPerOrgL1).toLocaleString("id-ID")+' <span>Rp'+Number(l1_total).toLocaleString("id-ID")+'</span></div>';
        for(var i=0;i<l1_sales_list.length;i++){
          var s=l1_sales_list[i];
          var pct=targetPerOrgL1>0 ? ((s.total/targetPerOrgL1)*100).toFixed(1) : "0";
          h += '<div class="olantai-row"><span class="olantai-name">▶ '+esc(s.sales)+'</span><span class="olantai-value">Rp'+Number(s.total).toLocaleString("id-ID")+'</span><span class="olantai-persen">'+pct+'%</span></div>';
        }
        h += '</div>';
      }
      
      // Lantai 2 section
      if(l2_sales_list.length){
        h += '<div class="olantai-section"><div class="olantai-header l2">🟢 Lantai 2 \u2014 Target/org: Rp'+Number(targetPerOrgL2).toLocaleString("id-ID")+' <span>Rp'+Number(l2_total).toLocaleString("id-ID")+'</span></div>';
        for(var i=0;i<l2_sales_list.length;i++){
          var s=l2_sales_list[i];
          var pct=targetPerOrgL2>0 ? ((s.total/targetPerOrgL2)*100).toFixed(1) : "0";
          h += '<div class="olantai-row"><span class="olantai-name">▶ '+esc(s.sales)+'</span><span class="olantai-value">Rp'+Number(s.total).toLocaleString("id-ID")+'</span><span class="olantai-persen">'+pct+'%</span></div>';
        }
        h += '</div>';
      }
      
      // Unassigned
      if(unassigned.length){
        h += '<div class="olantai-section"><div class="olantai-header" style="background:var(--bg);color:var(--text2)">❓ Belum diset <span>Rp'+Number(unk_total).toLocaleString("id-ID")+'</span></div>';
        for(var i=0;i<unassigned.length;i++){
          var s=unassigned[i];
          h += '<div class="olantai-row"><span class="olantai-name">▶ '+esc(s.sales)+'</span><span class="olantai-value">Rp'+Number(s.total).toLocaleString("id-ID")+'</span><span class="olantai-persen">'+Number(s.trans)+' trans</span></div>';
        }
        h += '</div>';
      }
      
      // Target info footer
      h += '<div style="font-size:12px;color:var(--text2);text-align:center;padding:8px;border-top:1px solid var(--border);margin-top:8px">';
      h += 'Target diatur via ⚙ Setting Lantai';
      h += '</div>';
      
      area.innerHTML = h;
    })
    .catch(function(err){
      var area=document.getElementById("omsetBulanResult");
      area.innerHTML='<div style="text-align:center;color:var(--primary);font-size:15px">❌ '+esc(err.message||"Gagal mengambil data")+'</div>';
    });
}

function loadOmsetSetting() {
  var j=localStorage.getItem("gp45_omset_v2");
  var s=j?JSON.parse(j):{l1_target:4285714,l2_target:3333333,l1_sales:[],l2_sales:[],inactive_sales:[]};
  if(!s.l1_target) s.l1_target=4285714;
  if(!s.l2_target) s.l2_target=3333333;
  if(!s.l1_sales) s.l1_sales=[];
  if(!s.l2_sales) s.l2_sales=[];
  if(!s.inactive_sales) s.inactive_sales=[];
  return s;
}
function saveOmsetSetting() {
  var s=loadOmsetSetting();
  var l1v=document.getElementById("osetL1Target").value.replace(/[^0-9]/g,"");
  var l2v=document.getElementById("osetL2Target").value.replace(/[^0-9]/g,"");
  if(l1v) s.l1_target=parseInt(l1v);
  if(l2v) s.l2_target=parseInt(l2v);
  localStorage.setItem("gp45_omset_v2",JSON.stringify(s));
  closeOmsetSetting();
  showToast("✅ Setting lantai tersimpan");
}
function showOmsetSetting() {
  var s=loadOmsetSetting();
  document.getElementById("osetL1Target").value=Number(s.l1_target).toLocaleString("id-ID");
  document.getElementById("osetL2Target").value=Number(s.l2_target).toLocaleString("id-ID");
  document.getElementById("omsetSettingOverlay").classList.add("show");
  loadSalesSuggestion(s);
}
function closeOmsetSetting() {
  document.getElementById("omsetSettingOverlay").classList.remove("show");
}
function loadSalesSuggestion(sett) {
  var list=document.getElementById("osetSalesList");
  list.innerHTML='<div style="text-align:center;padding:12px;color:var(--text2);font-size:13px">⏳ Mengambil daftar sales...</div>';
  fetch(gpApi('omset', 'date='+new Date().toISOString().slice(0,10)))
    .then(function(r){return r.json()})
    .then(function(data){
      if(!data||!data.sales){list.innerHTML='<div style="text-align:center;padding:12px;color:var(--text2);font-size:13px">Tidak ada data sales</div>';return;}
      var sales=data.sales||[];
      var names=[];
      for(var i=0;i<sales.length;i++){
        var nm=sales[i].sales||"";
        if(nm&&names.indexOf(nm)<0) names.push(nm);
      }
      names.sort();
      if(names.length===0){list.innerHTML='<div style="text-align:center;padding:12px;color:var(--text2);font-size:13px">Tidak ada sales</div>';return;}
      var h="";
      for(var i=0;i<names.length;i++){
        var nm=names[i];
        var isL1=sett.l1_sales&&sett.l1_sales.indexOf(nm)>=0;
        var isL2=sett.l2_sales&&sett.l2_sales.indexOf(nm)>=0;
        var isIn=sett.inactive_sales&&sett.inactive_sales.indexOf(nm)>=0;
        if(!isL1&&!isL2&&!isIn) isL1=true;
        h+='<div class="oset-sale-item">'
          +'<span class="oset-name">'+esc(nm)+'</span>'
          +'<div class="oset-btn-group">'
          +'<button class="oset-btn'+(isL1?' al1':'')+'" onclick="event.stopPropagation();setAssign(\''+escAttr(nm)+'\',1)">L1</button>'
          +'<button class="oset-btn'+(isL2?' al2':'')+'" onclick="event.stopPropagation();setAssign(\''+escAttr(nm)+'\',2)">L2</button>'
          +'<button class="oset-btn'+(isIn?' aina':'')+'" onclick="event.stopPropagation();setAssign(\''+escAttr(nm)+'\',0)">\u26d4</button>'
          +'</div></div>';
      }
      list.innerHTML=h;
    })
    .catch(function(err){
      list.innerHTML='<div style="text-align:center;color:var(--primary);font-size:13px">❌ Gagal load sales: '+esc(err.message||"")+'</div>';
    });
}
function setAssign(name,lantai) {
  var s=loadOmsetSetting();
  if(!s.l1_sales) s.l1_sales=[];
  if(!s.l2_sales) s.l2_sales=[];
  if(!s.inactive_sales) s.inactive_sales=[];
  var idx1=s.l1_sales.indexOf(name);if(idx1>=0)s.l1_sales.splice(idx1,1);
  var idx2=s.l2_sales.indexOf(name);if(idx2>=0)s.l2_sales.splice(idx2,1);
  var idxIn=s.inactive_sales.indexOf(name);if(idxIn>=0)s.inactive_sales.splice(idxIn,1);
  if(lantai===1) s.l1_sales.push(name);
  else if(lantai===2) s.l2_sales.push(name);
  else s.inactive_sales.push(name);
  localStorage.setItem("gp45_omset_v2",JSON.stringify(s));
  loadSalesSuggestion(s);
}
function bulkAssign(lantai) {
  var s=loadOmsetSetting();
  var list=document.getElementById("osetSalesList");
  var items=list.querySelectorAll(".oset-sale-item");
  s.l1_sales=[]; s.l2_sales=[]; s.inactive_sales=[];
  for(var i=0;i<items.length;i++){
    var spans=items[i].querySelectorAll("span");
    var nm=spans.length>0?spans[0].textContent.trim():"";
    if(nm){
      if(lantai===1) s.l1_sales.push(nm);
      else if(lantai===2) s.l2_sales.push(nm);
      else s.inactive_sales.push(nm);
    }
  }
  localStorage.setItem("gp45_omset_v2",JSON.stringify(s));
  loadSalesSuggestion(s);
  showToast("✅ Bulk assign selesai");
}

// OMSET detail click delegation
document.getElementById('omsetResult').addEventListener('click', function(e) {
  var row = e.target.closest('.oset-click');
  if (!row) return;
  var sales = row.getAttribute('data-sales');
  var date = row.getAttribute('data-date');
  omsetDetail(sales, date, row);
});

// ════════════════════════════════════════
// BROWSER OVERLAY
// ════════════════════════════════════════
var browserHistory = [];
var browserCurrent = -1;

function showWebVersion() {
  document.getElementById("browserOverlay").classList.add("show");
  document.getElementById("browserLoading").style.display = "block";
  document.getElementById("browserFrame").src = "https://gp45-relay.xmoritzu.workers.dev/";
}


function closeWebVersion() {
  document.getElementById('browserOverlay').classList.remove('show');
  document.getElementById('browserFrame').src = 'about:blank';
  browserHistory = [];
  browserCurrent = -1;
}

function browserGo() {
  var url = document.getElementById('browserUrl').value.trim();
  if (!url) return;
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
    document.getElementById('browserUrl').value = url;
  }
  document.getElementById('browserLoading').style.display = 'block';
  document.getElementById('browserFrame').src = url;
  // Add to history
  if (browserCurrent >= 0 && browserHistory[browserCurrent] === url) {
    // same page, don't duplicate
  } else {
    browserHistory = browserHistory.slice(0, browserCurrent + 1);
    browserHistory.push(url);
    browserCurrent = browserHistory.length - 1;
  }
}

function browserBack() {
  if (browserCurrent > 0) {
    browserCurrent--;
    var url = browserHistory[browserCurrent];
    document.getElementById('browserUrl').value = url;
    document.getElementById('browserLoading').style.display = 'block';
    document.getElementById('browserFrame').src = url;
  }
}

function browserFwd() {
  if (browserCurrent < browserHistory.length - 1) {
    browserCurrent++;
    var url = browserHistory[browserCurrent];
    document.getElementById('browserUrl').value = url;
    document.getElementById('browserLoading').style.display = 'block';
    document.getElementById('browserFrame').src = url;
  }
}

function browserLoaded() {
  document.getElementById('browserLoading').style.display = 'none';
  // Try to update URL from iframe
  try {
    var iframeUrl = document.getElementById('browserFrame').contentWindow.location.href;
    if (iframeUrl && iframeUrl !== 'about:blank') {
      document.getElementById('browserUrl').value = iframeUrl;
    }
  } catch(e) {
    // Cross-origin, can't read URL
  }
}

// Enter key on URL input
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('browserOverlay').classList.contains('show')) {
    var active = document.activeElement;
    if (active && active.id === 'browserUrl') {
      browserGo();
    }
  }
});
