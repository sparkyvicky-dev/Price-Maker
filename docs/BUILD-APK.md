# Build Price Maker APK — NO Expo Go

You get a normal **`.apk`** file. Install it on the phone like any app.

**Do not use Expo Go.** That app is only for developers scanning a QR code. Skip it.

---

## This PC has no `D:\Github projects` — use Documents

Default folder on any Windows PC:

```
C:\Users\<you>\Documents\price-maker
```

### Step A — Install once

1. **Git** → https://git-scm.com/download/win  
2. **Node.js LTS** → https://nodejs.org/  

Close Command Prompt and open a **new** one.

### Step B — Copy–paste these lines

```bat
git clone https://github.com/sparkyvicky-dev/price-maker.git "%USERPROFILE%\Documents\price-maker"
cd /d "%USERPROFILE%\Documents\price-maker"
git fetch origin
git checkout cursor/alternative-apk-build-e99b
setup-apk-pc.bat
```

Or only:

```bat
cd /d "%USERPROFILE%\Documents\price-maker"
build-apk.bat cloud
```

(if the folder is already cloned)

### Step C — After the build finishes

1. Open the link shown in the terminal (or https://expo.dev → Builds)  
2. Download the **`.apk`**  
3. Send it to your phone (USB, Drive, WhatsApp to yourself)  
4. Open the file → **Install**  
5. Open **Price Maker** from the app drawer  

Done. No Expo Go. No QR code. No same Wi‑Fi requirement.

---

## Why a free “Expo account”?

That login is only for Expo’s **cloud build servers** (they compile the APK).

| Thing | Needed? |
|-------|---------|
| Expo Go (Play Store app) | **No** |
| Expo website account | Yes, free, once |
| Android Studio | No (cloud path) |
| `D:\Github projects` | **No** — we use Documents |

First cloud build often takes **10–20 minutes**. After that you just use the installed app.

---

## Commands (Documents path)

```bat
cd /d "%USERPROFILE%\Documents\price-maker\mobile"
npm install --legacy-peer-deps
npx eas-cli login
npx eas-cli build -p android --profile apk
```

---

## Local build (optional)

Only if you already have Android Studio:

```bat
cd /d "%USERPROFILE%\Documents\price-maker"
build-apk.bat local
```

APK output:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No D: drive | Use Documents path above — do not use `D:\Github projects` |
| Git / Node missing | Install, then open a **new** Command Prompt |
| Phone blocks install | Settings → Install unknown apps → allow Files/Chrome |
| Waiting a long time | Normal for first cloud build; watch Builds on expo.dev |