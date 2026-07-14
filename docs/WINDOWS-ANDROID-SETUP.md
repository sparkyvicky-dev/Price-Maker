# Windows — Local PC setup

> **This PC path:** `D:\New folder\price-maker`  
> **Full guide:** [LOCAL-PC-SETUP.md](LOCAL-PC-SETUP.md)  
> **APK (no Expo Go):** [BUILD-APK.md](BUILD-APK.md)

One folder for **both** PC and Android.

## Folder layout

```
D:\New folder\
└── price-maker\              ← ONE project (git repo)
    ├── index.html
    ├── pull-to-local.bat     ← pull/update from GitHub
    ├── setup-apk-pc.bat      ← build installable APK
    ├── build-apk.bat
    ├── price maker.bat
    ├── setup-mobile.bat
    ├── start-mobile.bat
    ├── js\
    ├── css\
    └── mobile\
```

| Part | How to run |
|------|------------|
| **Pull code** | `pull-to-local.bat` |
| **APK** | `setup-apk-pc.bat` |
| **PC web** | `price maker.bat` |

---

## Pull to this PC

```bat
mkdir "D:\New folder"
cd /d "D:\New folder"
git clone https://github.com/sparkyvicky-dev/price-maker.git price-maker
cd price-maker
git fetch origin
git checkout cursor/alternative-apk-build-e99b
```

Or download **`pull-to-local.bat`** from GitHub and double-click it (creates `D:\New folder\price-maker`).

---

## Build APK (no Expo Go)

```bat
cd /d "D:\New folder\price-maker"
setup-apk-pc.bat
```

---

## Node.js + Git required

- Git: https://git-scm.com/download/win  
- Node.js LTS: https://nodejs.org/  
