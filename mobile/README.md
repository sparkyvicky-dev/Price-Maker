# Price Maker — Android (Expo)

Offline price list app for mobile dealers. Same Excel formats and WhatsApp message style as the web app.

## Quick start (test on your phone)

### Windows — `F:\New folder\price-maker`

1. Install **Node.js** (LTS): https://nodejs.org  
2. Install **Git**: https://git-scm.com/download/win  
3. Install **Expo Go** on your Android phone (Play Store) — must be up to date  
4. Double-click **`setup-mobile.bat`** in the project root  
   - Installs/updates **`F:\New folder\price-maker`**  
   - Downloads `mobile\` if missing (`git pull`)  
   - Runs `npm install` inside `mobile\`  
5. Double-click **`start-mobile.bat`** or press **Y** when setup asks  

```bat
cd /d "F:\New folder\price-maker\mobile"
npm start
```

6. Scan the QR code with **Expo Go**

> **Expo Go mismatch?** This app uses **Expo SDK 52** (works with Play Store Expo Go).  
> After `git pull`, run `setup-mobile.bat` again to reinstall dependencies.

**Not sure if files exist?** Run **`check-folders.bat`**

### Manual (any OS)

```bash
cd mobile
npm install --legacy-peer-deps
npm start
```

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
