# 📋 TODO: Update grand.php — Sync & HK

## 1. Yang perlu ditambah di grand.php

### A. Endpoint `action=sync` — include field HK
```sql
-- Pastikan query sync ambil field HK juga
SELECT 
  Kode, Nama, Barcode, Barcode2, 
  Satuan, Merek, 
  HJual, HBeli, Stok,
  HK -- <<< TAMBAHKAN INI
FROM barang
WHERE aktif = 1
```

### B. Endpoint `action=detail` — include data HK lengkap
```sql
-- Tambahkan info HK di response detail:
-- hk_id, hk_price, hk_start, hk_end, hk_operator
SELECT 
  b.*,
  hk.id as hk_id,
  hk.harga as hk_harga,
  hk.tgl_mulai as hk_mulai,
  hk.tgl_akhir as hk_akhir,
  hk.operator as hk_operator
FROM barang b
LEFT JOIN harga_khusus hk ON hk.kode = b.Kode 
  AND hk.tgl_akhir >= CURDATE()
  AND hk.tgl_mulai <= CURDATE()
WHERE b.Kode = ?
```

### C. Tambah endpoint `action=hk_list` (optional)
```
?key=123&action=hk_list&kode=...
→ return array of all HK for that item (active + expired)
```

## 2. Format response sync

Current response:
```json
[
  {"Kode":"...","Nama":"...","HJual":...,"HK":...},
  ...
]
```

Saran: bungkus pake wrapper:
```json
{
  "success": true,
  "total": 45667,
  "time": "1.2 detik",
  "data": [ ... items ... ]
}
```

## 3. Format response outlet stock

Current: langsung JSON object
```json
{"1008020040114": {"GH": -6, "GP": 1}, ...}
```

Saran: bungkus:
```json
{
  "success": true,
  "count": 35405,
  "data": { ... stocks ... }
}
```

---

## 📅 Tanggal: 06 Juli 2026
## 👤 Yang ngerjain: _____
## ✅ Status: [ ] Belum [ ] Selesai
