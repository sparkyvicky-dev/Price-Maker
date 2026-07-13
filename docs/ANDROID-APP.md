# Price Maker — Android App Plan

Planning document for the native Android app. **No code yet** — this lists what we will build, how data works, and how we will test it.

**App name on phone:** **Price Maker**

---

## Goal

Give shop owners the **same daily price-list workflow** as the web app, optimized for phone use:

- Upload **Excel** price lists (PDF later)
- Edit prices, organize by brand, copy/send WhatsApp messages
- **New on Android:** dealer **Contacts** in the sidebar — import from phone or add manually — tap WhatsApp icon → Android opens **WhatsApp** or **WhatsApp Business** (you pick the app) with the message ready; you tap Send yourself

**Offline-first:** all data lives on the phone. Internet only needed for first-time library load (if any) — not for daily use.

---

## What stays the same as the web app

### 1. File upload & parsing

| Feature | Details |
|--------|---------|
| Upload Excel | `.xls`, `.xlsx` from phone storage / file picker |
| Upload PDF | **Not in v1** — Excel only for now; PDF in a later phase |
| Auto format detection | Same parsers as web — no manual format selection |
| Supported Excel types | **Sparky Stock Report**, **PakkaBill Stock Summary**, **Stock Summary Report** (names-only), **generic** (Brand / Model / RAM / Storage / Price columns) |
| Brand detection | Vivo, Samsung, Apple, Oppo, Realme, OnePlus, Motorola, etc. |
| Missing prices | Import allowed; show warning count like web |
| Duplicate handling | Merge/dedupe same model rows |

### 2. Dashboard & price editing

| Feature | Details |
|--------|---------|
| Brand cards | Collapsible groups, favorites, drag-to-reorder |
| Custom headings | Add headings, assign products, reorder sections |
| Inline price edit | Tap price → edit → save |
| Undo | Undo last price change(s) |
| Search & filter | Search models; filter favorites |
| Select models | Tick models for partial copy |
| Stats | Total brands, models, today’s changes |
| Autosave | Optional auto-save snapshot |

### 3. WhatsApp message building (same text rules)

| Feature | Details |
|--------|---------|
| Header | Store name, location, date, title, validity (bold + emojis) |
| Brand blocks | Brand emoji + bold heading, model lines with bold prices |
| Footer | 3 footer lines |
| Templates | Title / validity / footer template dropdowns (5 defaults each) |
| Copy actions | Copy brand, copy selected, copy full list |
| Preview | Read message before sending |

**Message format must match web exactly** so dealers see the same style whether you send from PC or phone.

### 4. History & tools

| Feature | Details |
|--------|---------|
| Save snapshot | Daily snapshot — never overwrites old days |
| History | Browse past snapshots by date |
| Compare | Compare two dates side by side |
| Model history | Price trend for one model |
| Calendar | See which days have saved data |

### 5. Export & backup

| Feature | Details |
|--------|---------|
| Export PDF | Printable price list |
| Export Excel | Current list as spreadsheet |
| Export JSON | Full backup file |
| Import JSON | Restore from backup |

### 6. Settings

| Feature | Details |
|--------|---------|
| Store name & location | Editable header fields |
| Theme | Dark / light |
| Currency | Default ₹ |
| Date format | e.g. dd/mm/yyyy |
| Logo | Optional store logo |
| Brand order & favorites | Persisted locally |

---

## New — Android-only features

### 1. Contacts (left sidebar)

New nav item: **Contacts**

| Action | Behavior |
|--------|----------|
| **Import from phone** | Pick contacts from Android address book (permission prompt); import name + number |
| Add contact manually | Name + phone number (with country code, e.g. +91…) |
| Edit / delete | Long-press or swipe to edit/remove |
| Search contacts | Quick filter by name |
| Optional fields (later) | Notes, tags (e.g. “Wholesale”, “Retail”), favorite pin |

Imported contacts are copied into the app database — edits in Price Maker do not change your phone’s main contacts app.

Contacts are stored **only on the device** (local database).

### 2. Send via WhatsApp (per contact)

On each contact row:

```
[ Name ]  [ +91 98765 43210 ]  [ WA icon ]
```

**Tap WA icon:**

1. App builds the message (brand copy, selected models, or full list — same as Copy)
2. Android **share/intent** opens with pre-filled text and phone number
3. System shows app chooser: **WhatsApp** or **WhatsApp Business** (if both installed)
4. Chosen app opens chat with message in the input box
5. **You tap Send** — app does not auto-send (by design)

**Where WA icon appears (planned):**

- Contacts list — send **full list** or last-used message type
- Brand card — send **that brand only** to a chosen contact (pick contact sheet)
- After “Copy Selected” — optional “Send to contact…” button

### 3. Phone-friendly UI

| Item | Approach |
|------|----------|
| Navigation | Bottom tabs or left drawer (Dashboard, History, Contacts, Settings) |
| File pick | Android document picker / share-in from Files or WhatsApp |
| Large tap targets | Copy and WA buttons easy to hit |
| Haptic feedback | On copy success / save |

---

## Data storage — offline on phone

Everything important is stored locally. No account or server required for normal use.

| Data | Storage |
|------|---------|
| Products (today’s list) | Local DB |
| Snapshots & history | Local DB |
| Settings & templates | Local DB or secure storage |
| Contacts | Local DB |
| Logo image | App files directory |

**Works without internet** after install (Excel parsing libraries bundled in the app).

### Sync across devices — **TBD (decide later)**

| Option | Pros | Cons |
|--------|------|------|
| **A. JSON export/import** | Simple; matches web backup; no server | Manual — export on one device, import on another |
| **B. Google Drive / folder sync** | Automatic file backup | Still not real-time sync |
| **C. Firebase / Supabase** | Same data on phone + PC + web instantly | Needs internet, account, backend cost, more work |
| **D. Same Wi‑Fi LAN sync** | No cloud; shop PC ↔ phone on same network | Harder to build; both devices must be on |

**v1 plan:** Ship **fully offline** with **JSON backup/restore** (same format as web). You can move data between phone and PC manually until we pick a sync approach.

---

## Tech approach (for discussion)

### Recommended: **Expo (React Native)**

Good fit for fast testing and iteration:

| Why Expo | Notes |
|----------|-------|
| Test on your phone quickly | **Expo Go** app — scan QR, see changes in seconds |
| One codebase | Can share message-building logic with web (JavaScript) |
| File picker | `expo-document-picker` for Excel |
| Phone contacts | `expo-contacts` — import name + number with permission |
| WhatsApp | `Linking.openURL('whatsapp://send?phone=...&text=...')` or `expo-intent-launcher` on Android |
| Local DB | `expo-sqlite` or WatermelonDB |
| Build APK | EAS Build when ready for install without Expo Go |

**Excel parsing:** Port existing `excel.js` logic (SheetJS works in RN with polyfills) or use same SheetJS build.

**PDF parsing:** Deferred — **Excel only in v1**.

### Alternative: **Capacitor** (wrap web app)

| Pros | Cons |
|------|------|
| Reuse almost all current HTML/JS | Contacts + WhatsApp intents need plugins |
| Fastest path to “something on phone” | Feels more like website than native app |

### Alternative: **Kotlin native**

Best long-term Android feel; slowest to build and test.

**Suggestion:** Start with **Expo** for prototyping and daily testing on your Android phone.

---

## App screens (planned)

```
┌─────────────────────────────────────┐
│  ☰  Price Maker                     │
├──────────┬──────────────────────────┤
│ Dashboard│  [Upload Excel]          │
│ History  │  Stats…                  │
│ Compare  │  Brand cards…            │
│ Contacts │  [Copy] [WA → contact]   │
│ Settings │                          │
└──────────┴──────────────────────────┘
```

1. **Dashboard** — upload, brands, edit, copy
2. **History** — past snapshots
3. **Compare** — two-date diff
4. **Model history** — single model chart/list
5. **Calendar** — days with data
6. **Contacts** — list + add/edit + WA send
7. **Settings** — store, theme, templates, backup

---

## Build phases

### Phase 1 — Core (MVP)

- [ ] Expo project + Android test via Expo Go
- [ ] Local database (products, settings, contacts)
- [ ] Excel upload + all format parsers (port from web)
- [ ] Brand cards, price edit, undo
- [ ] WhatsApp message builder (port from `preview.js` + `utils.js`)
- [ ] Copy to clipboard
- [ ] Contacts: manual add + **import from phone contacts**
- [ ] WA icon → WhatsApp / WhatsApp Business chooser with pre-filled message
- [ ] Save snapshot + basic history list
- [ ] JSON export/import backup (manual device sync)

### Phase 2 — Parity

- [ ] PDF upload
- [ ] Custom headings, drag reorder
- [ ] Compare, model history, calendar
- [ ] Export PDF / Excel / JSON
- [ ] Import JSON backup (from web or another phone)
- [ ] Favorites, templates, logo

### Phase 3 — Polish & optional sync

- [ ] Standalone APK (EAS Build)
- [ ] Onboarding (first-run tips)
- [ ] Send brand to contact from brand card
- [ ] **Decide sync approach** (JSON only vs Drive vs cloud) and implement if needed
- [ ] Play Store release (if wanted)

---

## Decisions locked

| Question | Decision |
|----------|----------|
| Excel vs PDF in v1 | **Excel only** — PDF in a later phase |
| Contacts | **Import from phone contacts** + manual add/edit |
| Multi-device sync | **TBD** — v1 uses JSON backup/restore; pick auto-sync later if needed |
| App name | **Price Maker** |
| Login | **None** — local-only data on phone |

---

## WhatsApp technical note (Android)

We will use Android intents, not auto-send:

```
whatsapp://send?phone=919876543210&text=ENCODED_MESSAGE
```

If both WhatsApp and WhatsApp Business are installed, Android shows **“Open with”** — you choose each time (or set default).

Message body uses the same `*bold*` formatting WhatsApp understands.

---

## Summary checklist — what we are going to do

| # | Item |
|---|------|
| 1 | **Price Maker** Android app (Expo) with offline local storage |
| 2 | **Excel only** in v1 — all current format types |
| 3 | Same brand-wise list, edit, copy, preview as web |
| 4 | Contacts: **import from phone** + manual add; WA send |
| 5 | WA icon opens WhatsApp / WhatsApp Business; you send manually |
| 6 | History, snapshots (compare/calendar in Phase 2) |
| 7 | JSON backup/restore; auto sync **TBD for later** |
| 8 | Test on real Android phone via Expo Go before APK |

---

**Next step:** run the app — `cd mobile && npm start` — and test on your phone with Expo Go.

**Price Maker** — Android plan v0.2 · Expo app in `/mobile`
