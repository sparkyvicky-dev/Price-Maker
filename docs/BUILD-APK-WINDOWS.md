# Build Price Maker APK on Windows (no Expo Go)

You get a normal `.apk` file to install on any Android phone.  
**Expo Go is not needed** after this.

---

## What you need to install (one time)

| Tool | Download | Notes |
|------|----------|-------|
| **Node.js LTS** | https://nodejs.org | Required |
| **Git** | https://git-scm.com/download/win | Required |
| **JDK 17** | https://adoptium.net/temurin/releases/?version=17 | **Must be 17 (or 21).** Java 22+ / 25 will fail Gradle |
| **Android Studio** | https://developer.android.com/studio | Install SDK during setup |

### Android Studio setup

1. Open Android Studio → **More Actions** → **SDK Manager**
2. **SDK Platforms**: tick **Android 14 (API 34)** or newer
3. **SDK Tools**: tick
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android SDK Command-line Tools
   - NDK (Side by side) — if offered
4. Accept licenses and apply

### Set environment variables (Windows)

1. Search **Environment Variables** → **Edit the system environment variables**
2. Add / edit:

```
ANDROID_HOME = C:\Users\YOURNAME\AppData\Local\Android\Sdk
```

3. Edit **Path**, add:

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
%ANDROID_HOME%\emulator
```

4. Also set **JAVA_HOME** to your JDK 17 folder, e.g.:

```
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.0.14+7-hotspot
```

5. **Open a new Command Prompt** after changing env vars

Check Java version (should say 17 or 21, **not 25**):

```bat
java -version
```

---

## Step 1 — Get the project

```bat
cd /d "F:\New folder"
git clone https://github.com/sparkyvicky-dev/Price-Maker.git Price-Maker
cd Price-Maker
```

If folder already exists:

```bat
cd /d "F:\New folder\Price-Maker"
git pull origin main
```

---

## Step 2 — Build the APK (easiest)

Double-click:

```
F:\New folder\Price-Maker\build-apk.bat
```

Or in Command Prompt:

```bat
cd /d "F:\New folder\Price-Maker"
build-apk.bat
```

This will:
1. `npm install`
2. Generate the native `android/` folder
3. Build a **release APK** with Gradle

When finished, Windows Explorer opens the APK folder:

```
mobile\android\app\build\outputs\apk\release\
```

File name is usually:

```
app-release.apk
```

---

## Step 3 — Install on phone

### Option A — USB cable (best)

1. Phone: **Settings → About phone → tap Build number 7 times** (Developer options)
2. Enable **USB debugging**
3. Plug phone into PC
4. Run:

```bat
adb install -r "F:\New folder\Price-Maker\mobile\android\app\build\outputs\apk\release\app-release.apk"
```

### Option B — copy file

1. Copy `app-release.apk` to phone (WhatsApp / USB / Drive)
2. Open the file on phone → **Install**
3. Allow install from unknown sources if asked

---

## Manual commands (if you prefer)

```bat
cd /d "F:\New folder\Price-Maker\mobile"
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease
```

APK path:

```
F:\New folder\Price-Maker\mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## After you change app code

```bat
cd /d "F:\New folder\Price-Maker"
git pull
build-apk.bat
```

Then reinstall the new APK on the phone.

---

## Common errors

| Error | Fix |
|-------|-----|
| `Unsupported class file major version 69` | You are on **Java 25**. Run **`fix-java17.bat`** once, close CMD, open new CMD, rebuild |
| `ANDROID_HOME not set` | Set env var (see above), open **new** CMD |
| `Java not found` / wrong Java | Install **JDK 17**, not only JRE |
| `SDK location not found` | Open Android Studio once; install SDK Platforms |
| `gradlew failed` | Open `mobile\android` in Android Studio → let it sync → retry |
| Phone won't install APK | Enable **Install unknown apps** for Files/Chrome |
| Old app conflicts | Uninstall old Price Maker / Expo Go build first |

---

## PC web app vs Android APK

| | PC | Android APK |
|--|----|-------------|
| Location | `Price-Maker\` root | `mobile\` |
| Start | `price maker.bat` | Install `app-release.apk` |
| Needs Expo Go? | No | **No** (after APK build) |

---

## Optional later (Play Store)

For Google Play you usually need an **AAB** (not only APK) and a signing key.  
For shop use / dealer phones, **release APK** is enough.

---

**Sparky Mobiles / Price Maker** — local APK build guide
