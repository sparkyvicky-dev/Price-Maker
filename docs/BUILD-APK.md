# Build Price Maker APK with Android Studio (local)

**No Expo Go. No expo.dev cloud.**  
Build the `.apk` on this PC with Android Studio / Gradle.

**Folder on this PC:** `D:\New folder\price-maker`

---

## What you need once

| Tool | Download | Why |
|------|----------|-----|
| Git | https://git-scm.com/download/win | Pull code |
| Node.js LTS | https://nodejs.org/ | Generate `android\` project |
| Android Studio | https://developer.android.com/studio | SDK + build APK |

In Android Studio setup, keep the default **Android SDK** options.

---

## Step 1 — Get code

```bat
mkdir "D:\New folder"
cd /d "D:\New folder"
git clone https://github.com/sparkyvicky-dev/price-maker.git
cd price-maker
git fetch origin
git checkout cursor/alternative-apk-build-e99b
```

Already cloned?

```bat
cd /d "D:\New folder\price-maker"
git pull origin cursor/alternative-apk-build-e99b
```

Or double-click **`pull-to-local.bat`**.

---

## Step 2 — Build APK

```bat
cd /d "D:\New folder\price-maker"
build-apk.bat
```

| Choice | What happens |
|--------|----------------|
| **1** | Generate `mobile\android` + Gradle `assembleRelease` |
| **2** | Generate project only → you open it in Android Studio |
| **3** | Optional cloud (skip — we use Android Studio) |

Or full setup + build:

```bat
setup-apk-pc.bat
```

---

## Step 3 — Android Studio (if you chose 2, or Gradle failed)

1. Open **Android Studio**  
2. **File → Open** → `D:\New folder\price-maker\mobile\android`  
3. Wait for Gradle sync / SDK downloads  
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**  

---

## Step 4 — Install on phone

APK file:

```
D:\New folder\price-maker\mobile\android\app\build\outputs\apk\release\app-release.apk
```

1. Copy to phone (USB, Drive, WhatsApp to yourself)  
2. Open the file → **Install** (allow unknown apps if asked)  
3. Open **Price Maker** from the app drawer  

No Expo Go. No QR code. No same Wi‑Fi needed.

---

## Update after code changes

```bat
cd /d "D:\New folder\price-maker"
git pull
build-apk.bat
```

Choose **1** again.

---

## Scripts reference

| File | Role |
|------|------|
| `pull-to-local.bat` | Clone/update into `D:\New folder\price-maker` |
| `setup-apk-pc.bat` | Pull + `npm install` + start APK builder |
| `build-apk.bat` | Local prebuild + Gradle / Android Studio |
| `setup-mobile.bat` | Dev deps only |
| `start-mobile.bat` | Expo Go live reload (**dev only**) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `node` not found | Install Node.js LTS, open a **new** Command Prompt |
| Gradle / SDK errors | Open `mobile\android` in Android Studio once; let it install SDK |
| Phone blocks install | Settings → Install unknown apps → allow Files |
| Wrong folder | Always use `D:\New folder\price-maker` |