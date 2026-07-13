# Price Maker — Android (Expo)

Offline price list app for mobile dealers. Same Excel formats and WhatsApp message style as the web app.

## Quick start (test on your phone)

1. Install **Expo Go** from Play Store
2. On your PC (in this folder):

```bash
cd mobile
npm install --legacy-peer-deps
npm start
```

3. Scan the QR code with Expo Go (Android)

## Minimal copy / share UX

| Action | How |
|--------|-----|
| Copy or send one brand | **Long-press** a brand heading → Share sheet |
| Copy or send selected models | Tick models → **Share N** bar at bottom |
| Copy or send full list | **⋮ menu** → Share full list |
| Send to a dealer | Contacts tab → **green WA icon** (opens WhatsApp / WA Business) |
| Import Excel | **Document icon** on Prices tab |

No separate Copy / Preview / Open WhatsApp buttons on every card — one **Share** flow handles copy + WhatsApp.

## Features (v1)

- Excel upload (Sparky, PakkaBill, Stock Summary, generic)
- Brand cards, inline price edit, undo
- Contacts: import from phone + manual add
- WhatsApp intent with pre-filled message
- Snapshots & history (load past day)
- Settings, JSON backup/import
- Model history search & snapshot compare (More tab)

## Data

All data is stored locally in SQLite on the device. No account required.

## Build APK (later)

```bash
npx eas build -p android --profile preview
```

Requires Expo account and EAS CLI.
