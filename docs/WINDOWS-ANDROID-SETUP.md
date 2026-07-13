# Windows — Local PC setup

> **Recommended path:** `D:\Github projects\price-maker`  
> **Full guide:** [LOCAL-PC-SETUP.md](LOCAL-PC-SETUP.md) — clone, daily workflow, and push to GitHub.

One folder for **both** PC and Android. You do **not** need two separate projects.

## Folder layout (what you should have)

```
D:\Github projects\
└── price-maker\              ← ONE project (git repo)
    ├── index.html            ← PC web app
    ├── setup.bat             ← PC: desktop launcher
    ├── price maker.bat       ← PC: start in browser
    ├── setup-mobile.bat      ← Android: install dependencies (run once)
    ├── start-mobile.bat      ← Android: start Expo for phone
    ├── js\                   ← PC app code
    ├── css\
    └── mobile\               ← Android app (Expo)
        ├── package.json
        └── app\
```

| Part | Folder | How to run |
|------|--------|------------|
| **PC** | `price-maker\` (root) | `price maker.bat` or open `index.html` |
| **Android** | `price-maker\mobile\` | `start-mobile.bat` → Expo Go on phone |

---

## Step 1 — Check what is on your PC

Open **Command Prompt** and run:

```bat
dir "D:\Github projects"
dir "D:\Github projects\price-maker"
dir "D:\Github projects\price-maker\mobile"
```

**If you see `index.html`** → PC app is there.  
**If you see `mobile\package.json`** → Android app is there too.  
**If `mobile` is missing** → pull latest code (Step 2).

---

## Step 2 — Get latest code (if mobile folder missing)

```bat
cd /d "D:\Github projects\price-maker"
git pull
```

If you don't have git or the folder is old, clone fresh:

```bat
cd /d "D:\Github projects"
git clone https://github.com/sparkyvicky-dev/price-maker.git price-maker
```

---

## Step 3 — Android setup (one time)

```bat
cd /d "D:\Github projects\price-maker"
setup-mobile.bat
```

Or double-click **setup-mobile.bat** in File Explorer.

---

## Step 4 — Test on phone

1. Install **Expo Go** on Android (Play Store)
2. Run:

```bat
cd /d "D:\Github projects\price-maker"
start-mobile.bat
```

3. Scan QR code with Expo Go (same Wi‑Fi as PC)

---

## Common mistake

```bat
C:\Users\12vic> npm start    ← WRONG (no package.json here)
```

Always use:

```bat
D:\Github projects\price-maker\start-mobile.bat
```

Or:

```bat
cd /d "D:\Github projects\price-maker\mobile"
npm install --legacy-peer-deps
npx expo start
```

---

## Node.js required

If you see `'node' is not recognized`, install Node.js LTS: https://nodejs.org/
