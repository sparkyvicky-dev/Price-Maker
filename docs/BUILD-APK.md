# Build Price Maker APK with Android Studio (local)

**No Expo Go. No expo.dev cloud.**  
Build the `.apk` on this PC with Android Studio / Gradle.

**Folder:** `D:\New folder\price-maker`

---

## What you need once

| Tool | Why |
|------|-----|
| [Git](https://git-scm.com/download/win) | Pull code |
| [Node.js LTS](https://nodejs.org/) | Generate Android project |
| [Android Studio](https://developer.android.com/studio) | SDK + build APK |

During Android Studio setup, install the **Android SDK** (default options are fine).

---

## On the PC you are switching to

### 1. Pull code (if not already done)

```bat
mkdir "D:\New folder"
cd /d "D:\New folder"
git clone https://github.com/sparkyvicky-dev/price-maker.git
cd price-maker
git fetch origin
git checkout cursor/alternative-apk-build-e99b
```

If the folder already exists:

```bat
cd /d "D:\New folder\price-maker"
git pull origin cursor/alternative-apk-build-e99b
```

### 2. Build APK locally

```bat
cd /d "D:\New folder\price-maker"
setup-apk-pc.bat
```

Or:

```bat
build-apk.bat
```

Choose **`1`** → generate Android project + Gradle build.

### 3. Or open in Android Studio yourself

```bat
cd /d "D:\New folder\price-maker"
build-apk.bat
```

Choose **`2`** (generate only), then in Android Studio:

1. **File → Open** → `D:\New folder\price-maker\mobile\android`  
2. Wait for Gradle sync / SDK download  
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**  

### 4. Install on phone

APK path:

```
D:\New folder\price-maker\mobile\android\app\build\outputs\apk\release\app-release.apk
```

Copy to phone → open → Install. Open **Price Maker** from the app list.

---

## Why not expo.dev?

That site is only Expo’s optional cloud builders.  
With Android Studio everything stays on your PC.

---

## Update code later

```bat
cd /d "D:\New folder\price-maker"
git pull
build-apk.bat
```

Choose **1** again to rebuild the APK after changes.
