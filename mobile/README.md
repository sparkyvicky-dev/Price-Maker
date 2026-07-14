# Price Maker — Android (Expo)

Offline price list app for mobile dealers. Same Excel formats and WhatsApp message style as the web app.

## Quick start (test on your phone)

### Windows — `D:\New folder\price-maker`

1. Install **Node.js** (LTS): https://nodejs.org  
2. Install **Git**: https://git-scm.com/download/win  
3. Double-click **`pull-to-local.bat`** (pulls to `D:\New folder\price-maker`)  
4. For APK (no Expo Go): double-click **`setup-apk-pc.bat`**  
5. For live reload only: **`setup-mobile.bat`** then **`start-mobile.bat`**

```bat
cd /d "D:\New folder\price-maker\mobile"
npm start
```

> **Daily use:** build a standalone APK with **`setup-apk-pc.bat`** — see **[docs/BUILD-APK.md](../docs/BUILD-APK.md)**.  
> Expo Go is optional for development only.

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

## Build APK (Android Studio — no Expo Go)

For daily use, build a **standalone APK on this PC**.

**Folder:** `D:\New folder\price-maker`

```bat
cd /d "D:\New folder\price-maker"
build-apk.bat
```

Choose **1** (Gradle) or **2** (open in Android Studio).

APK output:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

Full guide: **[docs/BUILD-APK.md](../docs/BUILD-APK.md)**

Needs: Node.js + [Android Studio](https://developer.android.com/studio).  
Does **not** need Expo Go or expo.dev.
