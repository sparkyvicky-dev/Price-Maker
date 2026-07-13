# Windows — F:\New folder\price-maker

One folder for **both** PC and Android. You do **not** need two separate projects.

## Folder layout (what you should have)

```
F:\New folder\
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
dir "F:\New folder"
dir "F:\New folder\price-maker"
dir "F:\New folder\price-maker\mobile"
```

**If you see `index.html`** → PC app is there.  
**If you see `mobile\package.json`** → Android app is there too.  
**If `mobile` is missing** → pull latest code (Step 2).

---

## Step 2 — Get latest code (if mobile folder missing)

```bat
cd /d "F:\New folder\price-maker"
git pull
```

If you don't have git or the folder is old, clone fresh:

```bat
cd /d "F:\New folder"
git clone https://github.com/sparkyvicky-dev/Price-Maker.git price-maker
```

---

## Step 3 — Android setup (one time)

```bat
cd /d "F:\New folder\price-maker"
setup-mobile.bat
```

Or double-click **setup-mobile.bat** in File Explorer.

---

## Step 4 — Test on phone

1. Install **Expo Go** on Android (Play Store)
2. Run:

```bat
cd /d "F:\New folder\price-maker"
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
F:\New folder\Price-Maker\start-mobile.bat
```

Or:

```bat
cd /d "F:\New folder\Price-Maker\mobile"
npm install --legacy-peer-deps
npx expo start
```

---

## Node.js required

If you see `'node' is not recognized`, install Node.js LTS: https://nodejs.org/
