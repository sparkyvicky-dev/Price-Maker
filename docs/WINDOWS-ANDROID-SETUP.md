# Windows — Local PC setup

> **This PC path:** `D:\New folder\price-maker`  
> **APK guide:** [BUILD-APK.md](BUILD-APK.md) (Android Studio — no Expo Go)  
> **Full workflow:** [LOCAL-PC-SETUP.md](LOCAL-PC-SETUP.md)

One folder for **both** PC web app and Android app.

## Folder layout

```
D:\New folder\
└── price-maker\
    ├── index.html
    ├── pull-to-local.bat
    ├── setup-apk-pc.bat
    ├── build-apk.bat
    ├── price maker.bat
    ├── setup-mobile.bat
    ├── start-mobile.bat
    ├── docs\
    │   ├── BUILD-APK.md
    │   └── README.md
    └── mobile\
```

| Goal | Run |
|------|-----|
| Pull / update | `pull-to-local.bat` |
| Build APK | `build-apk.bat` or `setup-apk-pc.bat` |
| PC web app | `price maker.bat` |

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

---

## Build APK (Android Studio)

```bat
cd /d "D:\New folder\price-maker"
build-apk.bat
```

Needs **Android Studio** installed: https://developer.android.com/studio

---

## Tools required

- Git: https://git-scm.com/download/win  
- Node.js LTS: https://nodejs.org/  
- Android Studio (for APK): https://developer.android.com/studio  
