# GP45 Checker - App Design & UI Overview

## 🎨 Visual Layout

### Screen 1: Home / Search Screen
```
┌──────────────────────────────┐
│  📷  GPx45 CHECKER   ☰      │  <- RED header (DC2626)
│     OFFLINE STOCK LOOKUP     │
├──────────────────────────────┤
│ 📋 OFFLINE | 🌐 ONLINE      │  <- Mode buttons (removed RELAY)
├──────────────────────────────┤
│ 🟢 41,158 items [offline]    │  <- Status bar
├──────────────────────────────┤
│ 📦 Database: 41,158          │  <- Sync info
│ 🕐 Update: 23 Jun 2026       │
├──────────────────────────────┤
│  [  Ketuk untuk mencari...  ] ✕  │  <- Search input
├──────────────────────────────┤
│ 📦 Barang 1                  │
│ Barcode: 123456              │
│ Rp 50,000  ✓ Stok: 10       │
│                              │
│ 📦 Barang 2                  │
│ Barcode: 654321              │  <- Suggestion list
│ Rp 75,000  ✓ Stok: 5        │
│                              │
│ 📦 Barang 3                  │
│ Barcode: 111111              │
│ Rp 25,000  ❌ Stok Habis     │
└──────────────────────────────┘
```

### Screen 2: Product Detail Card
```
┌──────────────────────────────┐
│ Barang Contoh          [📋] │  <- Copy button
├──────────────────────────────┤
│                              │
│       Rp 50,000            │  <- BIG PRICE (52px, bold)
│       (per piece)           │
│                              │
├──────────────────────────────┤
│ ✅ Stok: 150 PCS            │  <- Stock status (green/red)
├──────────────────────────────┤
│ 📋 OFFLINE                   │
├──────────────────────────────┤
│ Kode    │ ABC123             │
│ Barcode │ 987654321          │  <- Info grid (2 columns)
│ Satuan  │ PCS                │
│ Merek   │ Brand Name         │
│ Harga B │ Rp 35,000          │
├──────────────────────────────┤
│ Stok Cabang                  │
│ 📦 OFFLINE │ 📍 ONLINE       │  <- Branch stock (2 sources)
│ 150 pcs    │ 200 pcs         │
└──────────────────────────────┘
```

### Screen 3: Menu Dropdown
```
┌─────────────────────┐
│ 🔄 Sync Data        │
│ 💰 Price Card       │
│ 📈 OMSET            │  <- Menu items
│ ℹ About             │
│ 📖 Manual           │
│ 🎨 Dark Mode        │
│ ⚙️ Setting Server   │
└─────────────────────┘
```

---

## 🔴 Color Scheme

**Light Mode:**
- Header: `#DC2626` (Red)
- Background: `#F1F3F6` (Light gray)
- Card: `#FFFFFF` (White)
- Text: `#1A1A2E` (Dark)
- Primary: `#DC2626` (Red - prices, active)
- Success: `#16A34A` (Green - stock available)
- Accent: `#2563EB` (Blue - settings)

**Dark Mode:**
- Background: `#0F172A` (Very dark)
- Card: `#1E293B` (Dark gray)
- Text: `#F1F5F9` (Light)
- Primary: `#EF4444` (Lighter red)

---

## 📱 Key UI Elements

### Header
- **Left:** Scanner button (📷) with app icon
- **Center:** Title "GPx45 CHECKER" + subtitle
- **Right:** Menu button (☰)
- **Background:** Red (#DC2626)
- **Height:** 64px

### Mode Bar
- **Buttons:** 📋 OFFLINE | 🌐 ONLINE
- **RELAY BUTTON REMOVED** ✅
- Active button: Red bg + white text
- Inactive: Gray bg + gray text
- **Height:** 48px

### Search Bar
- **Rounded input:** 18px border-radius
- **Placeholder:** "Ketuk untuk mencari..."
- **Clear button (✕):** Appears when text is entered
- **Suggestions dropdown:** Shows up to 50 results

### Result Card
- **Big Price:** 52px font, bold (900), red color
- **Stock Row:** 
  - Green bg + text if stok > 0
  - Red bg + text if stok = 0
- **Info Grid:** 2 columns, compact cells
- **Copy Button:** 📋 emoji, top-right

### Tabs (Bottom of card)
- **OFFLINE only:** Shows bundled data
- **ONLINE only:** Shows server 200 data
- Sync info auto-hides on mode switch

---

## 🚀 Features Visible in UI

✅ **OFFLINE Mode**
- 41,158 items bundled
- Instant search (no internet)
- Search history below card
- Sync button in menu

✅ **ONLINE Mode**
- Search from server 200
- Connection status indicator
- Ping indicator
- Live results

✅ **Menu Items**
- 🔄 Sync Data - Update database
- 💰 Price Card - Create price lists
- 📈 OMSET - Sales tracking
- ℹ About - App info & changelog
- 📖 Manual - Quick guide
- 🎨 Dark Mode - Theme toggle
- ⚙️ Setting Server - IP configuration

✅ **Barcode Scanner**
- Camera button in header
- Full-screen overlay
- Torch/flashlight toggle
- Auto-detection

✅ **Search History**
- Auto-saved searches
- Shows below results (OFFLINE)
- Quick re-open previous items
- "View All" option
- Clear all history

---

## 📊 Font Sizes

| Element | Size | Weight |
|---------|------|--------|
| Header Title | 20px | 800 |
| Price (Big) | 52px | 900 |
| Item Name | 16px | 600 |
| Price (list) | 16px | 700 |
| Subtitle | 12px | 500 |
| Label | 12px | 600 |
| Info Grid | 12px | 500 |
| Button | 13px | 600 |

---

## 🎯 User Flow

1. **App Opens** → Loads 41k items in chunks (3-5 sec)
2. **Default OFFLINE mode** → Can search instantly
3. **User types search** → Shows suggestions (max 50)
4. **User taps item** → Full detail card shows
5. **User can:**
   - Copy name + price (📋)
   - Switch to ONLINE mode
   - Open menu for other options
   - Use barcode scanner

---

## 📐 Changes Made

✅ **RELAY tab HIDDEN**
- Mode bar now: `📋 OFFLINE | 🌐 ONLINE`
- Relay code still in JS (not executed)
- Mode switching logic simplified

✅ **Updated Manual**
- "OFFLINE · ONLINE" (removed RELAY)
- Simplified instructions

✅ **About Screen**
- Mode info updated
- Version 1.1.0 notes

---

## 🎭 Dark Mode

Click "🎨 Dark Mode" to toggle:
- Background changes to `#0F172A`
- Card text becomes light
- All text inverted but readable
- Auto-saved in localStorage

---

## 📦 App Size

- **Base APK:** ~8.6 MB
- **With bundled data:** ~10-11 MB (includes 5x data_*.json + outlet stock)
- **Installable size:** ~20-25 MB (extracted)

---

**Version:** 1.1.0  
**RELAY Removed:** ✅  
**UI Status:** Ready for build 🚀
