# UI Pages & Screens Checklist

Tracking list for applying the Glass Pro UI across the app **one screen at a time**.  
**Current focus:** Dashboard only. Everything else stays as-is until its turn.

Source design (local): `c:\Users\12vic\Documents\billing-app\pakka-glass-pro.html`  
Target in this repo: app entry / dashboard shell (see `docs/GLASS-PRO-DASHBOARD.md`).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Glass Pro UI applied |
| **Next** | Current / immediate work |
| **Todo** | Scheduled for later, 1-by-1 |
| **N/A** | Shared chrome / no separate page |

---

## A. Web app (`index.html` SPA)

Entry: `index.html` · Styles: `css/style.css` · Logic: `js/*.js`

### Shell / shared chrome

| # | Screen / region | Location | Status | Notes |
|---|-----------------|----------|--------|-------|
| A0 | App shell (layout) | `index.html` `.app-shell` | **Next** | Wrapped by Glass Pro dashboard integration |
| A1 | Left sidebar | `#sidebar` | **Next** | Must be 68px → 252px on hover; company details at bottom when expanded |
| A2 | Top bar / menu toggle | `.top-bar`, `#menu-toggle` | Todo | Mobile drawer; keep after dashboard |
| A3 | Loading overlay | `#loading-overlay` | Todo | |
| A4 | Toasts | `#toast-container` | Todo | |
| A5 | Network status | `#network-status` | Todo | |
| A6 | Floating save (FAB) | `#fab-save` | Todo | |

### Primary views (nav)

| # | Screen | DOM / files | Status | Notes |
|---|--------|-------------|--------|-------|
| A7 | **Dashboard** | `#view-dashboard` | **Next** | Stats, upload, export, header/footer editors, search/filters, brand cards |
| A8 | History | `#view-history` · `js/history.js` | Todo | Snapshot list, detail, pagination |
| A9 | Compare | `#view-compare` · `js/compare.js` | Todo | Date A/B compare results |
| A10 | Model History | `#view-model-history` · `js/compare.js` | Todo | Model price over time |
| A11 | Calendar | `#view-calendar` · `js/history.js` | Todo | Month grid + day snapshot |
| A12 | Settings | `#view-settings` · `js/settings.js` | Todo | Theme, currency, store, alerts, favorites |

### Dashboard sub-areas (preserve all features)

| # | Area | IDs / hooks | Status |
|---|------|-------------|--------|
| A7a | Stats row | `#stat-brands`, `#stat-models`, `#stat-history`, `#stat-changes` | **Next** |
| A7b | Action bar | upload Excel/PDF, save, export PDF/Excel/JSON, import JSON, print, duplicate | **Next** |
| A7c | Header editor | `#edit-title`, `#edit-validity`, template selects | **Next** |
| A7d | Search & filters | `#search-input`, `.chip` filters, select-all, clear/undo/bulk, copy/preview | **Next** |
| A7e | Brand cards | `#brand-cards`, `#empty-state` | **Next** |
| A7f | Recently edited | `#recently-edited` | **Next** |
| A7g | Footer editor | `#edit-footer-1/2/3`, footer templates | **Next** |

### Modals / dialogs

| # | Screen | DOM | Status |
|---|--------|-----|--------|
| A13 | WhatsApp preview | `#preview-modal` | Todo |
| A14 | New heading | `#heading-name-dialog` | Todo |
| A15 | Bulk price edit | `#bulk-edit-modal` | Todo |
| A16 | Keyboard shortcuts | `#shortcuts-modal` | Todo |

---

## B. Mobile app (Expo)

Entry: `mobile/app/(tabs)/` · Shared: `mobile/src/components/*`

### Tab screens

| # | Screen | File | Status | Notes |
|---|--------|------|--------|-------|
| B1 | Prices (Dashboard) | `mobile/app/(tabs)/index.tsx` | Todo | After web dashboard is stable |
| B2 | Contacts | `mobile/app/(tabs)/contacts.tsx` | Todo | |
| B3 | History | `mobile/app/(tabs)/history.tsx` | Todo | Date + model modes |
| B4 | More / Tools | `mobile/app/(tabs)/tools.tsx` | Todo | List settings, templates, lookup/compare |

### Overlays & sheets

| # | Screen | File | Status |
|---|--------|------|--------|
| B5 | Price edit sheet | `mobile/src/components/PriceEditSheet.tsx` | Todo |
| B6 | Price history modal | `mobile/src/components/PriceHistoryModal.tsx` | Todo |
| B7 | Share sheet | `mobile/src/components/ShareSheet.tsx` | Todo |
| B8 | Selection bar | `mobile/src/components/SelectionBar.tsx` | Todo |
| B9 | Brand card | `mobile/src/components/BrandCard.tsx` | Todo |
| B10 | Screen chrome | `mobile/src/components/Screen.tsx` | Todo |
| B11 | Feedback / loading | `mobile/src/components/Feedback.tsx` | Todo |

---

## C. Suggested order (1 by 1)

1. **Dashboard + sidebar** (this pass) — web only  
2. History  
3. Compare  
4. Model History  
5. Calendar  
6. Settings  
7. Shared modals (preview, bulk edit, heading, shortcuts)  
8. Mobile Prices tab  
9. Mobile History → Contacts → More  
10. Mobile sheets/modals  

---

## D. Sidebar contract (must match Glass Pro)

Applies when Glass Pro dashboard is integrated:

- **Default:** collapsed **68px** (icons only)  
- **Hover:** expand to **252px** (labels visible)  
- **Mouse leave:** collapse back to **68px**  
- **Expanded:** company details visible at bottom  

---

## E. Change log

| Date | Item | Change |
|------|------|--------|
| 2026-07-15 | Checklist | Document created; dashboard marked **Next**; other screens **Todo** |
| 2026-07-15 | Dashboard | Blocked on adding `pakka-glass-pro.html` into this workspace (see `GLASS-PRO-DASHBOARD.md`) |
