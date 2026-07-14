# Build Price Maker APK (no Expo Go)

Use this when **Expo Go fails**, is **too slow**, or you want a normal installable app on the phone.

**Result:** an `.apk` file you copy to the phone and install like any other app.  
**No Expo Go** is required after install.

---

## Fastest path (recommended) — Cloud EAS

Works on any Windows PC with Node.js. No Android Studio needed.

### One-click

1. Double-click **`build-apk.bat`** in the project root  
2. Choose **`1` Cloud build**  
3. Log in with a free [Expo account](https://expo.dev/signup)  
4. Wait for the build link  
5. Download the `.apk` → open it on your Android phone → Install  

### Manual commands

```bat
cd /d "D:\Github projects\price-maker\mobile"
npm install --legacy-peer-deps
npx eas-cli login
npx eas-cli build -p android --profile apk
```

When finished:

1. Open the build page URL printed in the terminal  
2. Or go to [expo.dev](https://expo.dev) → your project → **Builds**  
3. Download **APK** → install on phone  

Allow **Install unknown apps** for Files / Chrome if Android asks.

---

## Alternative — Local build (no Expo cloud queue)

Use this if EAS cloud is slow/queued and you already have **Android Studio**.

### Requirements

- [Node.js LTS](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio) with Android SDK  
- JDK 17 (Android Studio usually installs this)

### One-click

1. Double-click **`build-apk.bat`**  
2. Choose **`2` Local build**  
3. When it finishes, the APK is at:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

### Manual commands

```bat
cd /d "D:\Github projects\price-maker\mobile"
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease
```

APK path:

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

Or open `mobile\android` in Android Studio → **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

---

## After install — how to use

| Item | Notes |
|------|--------|
| App name | **Price Maker** |
| Expo Go | **Not needed** |
| Internet | Only for first download of the APK; daily use stays offline |
| Updates | Rebuild APK and reinstall, or later use EAS Update |

---

## Profiles (in `mobile/eas.json`)

| Profile | Output | Use |
|---------|--------|-----|
| **`apk`** | `.apk` | Install on your phone / share to staff (default for `build-apk.bat`) |
| **`preview`** | `.apk` | Same as `apk` (alias) |
| **`production`** | `.aab` | Play Store upload later |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `eas: command not found` | Use `npx eas-cli` (the bat file already does this) |
| Login / project errors | Run `npx eas-cli login` then `npx eas-cli build:configure` inside `mobile\` |
| Phone blocks install | Settings → Apps → Special access → Install unknown apps → allow Files/Chrome |
| Local Gradle fails | Open Android Studio once, install SDK/cmdline-tools, set `ANDROID_HOME` |
| Still want live reload | Use `start-mobile.bat` + Expo Go for *dev only*; use APK for *real daily use* |

---

## Why not Expo Go for daily use?

| Expo Go | Standalone APK |
|---------|----------------|
| Needs QR + same Wi‑Fi as PC | Install once, open anytime |
| Breaks when SDK / Expo Go versions mismatch | Independent of Expo Go |
| Slow / flaky on some networks | Instant cold start |

For shop use, **always prefer the APK**.
