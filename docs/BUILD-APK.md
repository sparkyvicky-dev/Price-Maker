# Build Price Maker APK — NO Expo Go

You get a normal **`.apk`** file. Install it on the phone like any app.

**Do not use Expo Go.**

**This PC folder:** `D:\New folder\price-maker`

---

## Pull + build on this PC

### 1. Install once

| Tool | Download |
|------|----------|
| Git | https://git-scm.com/download/win |
| Node.js LTS | https://nodejs.org/ |

### 2. Copy–paste in Command Prompt

```bat
mkdir "D:\New folder"
cd /d "D:\New folder"
git clone https://github.com/sparkyvicky-dev/price-maker.git
cd price-maker
git fetch origin
git checkout cursor/alternative-apk-build-e99b
```

### 3. Build APK

```bat
cd /d "D:\New folder\price-maker"
setup-apk-pc.bat
```

Or:

```bat
cd /d "D:\New folder\price-maker"
build-apk.bat cloud
```

### 4. Install on phone

1. Open the build link (or https://expo.dev → Builds)  
2. Download `.apk`  
3. Open on phone → Install  
4. Open **Price Maker** — no Expo Go  

---

## Update code later

```bat
cd /d "D:\New folder\price-maker"
git pull
```

Or double-click **`pull-to-local.bat`**.

---

## Why a free Expo account?

Only to run the **cloud APK build** (not Expo Go).

| Thing | Needed? |
|-------|---------|
| Expo Go phone app | **No** |
| Expo website login | Yes (free, once) |
| Folder | **`D:\New folder\price-maker`** |

First cloud build ~10–20 minutes. After that just use the installed app.
