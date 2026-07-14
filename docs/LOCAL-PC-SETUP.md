# Local PC Setup — `D:\New folder`

Work on your Windows PC, edit files locally, and **push to GitHub when you are ready**. This guide explains how to get the project onto your machine, run it, and sync changes back.

---

## What you are setting up

| Item | Details |
|------|---------|
| **Project** | Sparky Mobiles Price Manager |
| **GitHub repo** | https://github.com/sparkyvicky-dev/price-maker |
| **Local folder** | `D:\New folder\price-maker` |
| **PC app** | Web app in the project root (`index.html`) |
| **Android app** | Expo app in `mobile\` subfolder |

One folder holds **both** the PC web app and the Android mobile app. You do not need two separate projects.

---

## Before you pull — what you need

Install these once on your PC:

| Tool | Why | Download |
|------|-----|----------|
| **Git** | Clone, pull, and push code | https://git-scm.com/download/win |
| **Node.js LTS** | Android app (`mobile\`) only | https://nodejs.org/ |
| **Python** (optional) | Desktop launcher uses it for a local web server | https://python.org/ or Microsoft Store |

After installing Git, open a **new** Command Prompt and check:

```bat
git --version
node --version
```

---

## Folder layout (after pull)

```
D:\New folder\
└── price-maker\                 ← git repo (this project)
    ├── index.html               ← PC web app entry
    ├── setup.bat                ← PC: create desktop shortcut (run once)
    ├── price maker.bat          ← PC: start in browser
    ├── pull-to-local.bat        ← clone or update this folder
    ├── setup-apk-pc.bat         ← pull + prepare local APK build
    ├── build-apk.bat            ← Android Studio / Gradle APK (recommended)
    ├── setup-mobile.bat         ← Android: install deps (run once)
    ├── start-mobile.bat         ← Android: start Expo on phone (dev only)
    ├── js\                      ← PC app code
    ├── css\
    ├── docs\                    ← guides (this file, VPS, Android, etc.)
    └── mobile\                  ← Android app (Expo / React Native)
        ├── package.json
        └── app\
```

---

## Step 1 — Pull the project to your PC

### Option A: Automatic (recommended)

1. Create the parent folder if it does not exist:

```bat
mkdir "D:\New folder"
```

2. Download **only** `pull-to-local.bat` from GitHub, or clone once manually (Option B below).

3. Double-click **`pull-to-local.bat`**, or run:

```bat
cd /d "D:\New folder"
pull-to-local.bat
```

The script will:

- Create `D:\New folder` if missing
- **Clone** the repo if `price-maker` is not there yet
- **Pull** latest `main` if the folder already exists

### Option B: Manual clone (first time)

```bat
mkdir "D:\New folder"
cd /d "D:\New folder"
git clone https://github.com/sparkyvicky-dev/price-maker.git price-maker
cd price-maker
```

### Option C: Manual pull (folder already exists)

```bat
cd /d "D:\New folder\price-maker"
git pull origin main
```

---

## Step 2 — Run the PC web app

### Quick test

Double-click `index.html`, or open it in Chrome / Edge.

### Recommended (local server + desktop shortcut)

```bat
cd /d "D:\New folder\price-maker"
setup.bat
```

Then double-click **`price maker.bat`** on your Desktop. It opens `http://localhost:8080`.

---

## Step 3 — Android app (optional)

One-time setup:

```bat
cd /d "D:\New folder\price-maker"
setup-mobile.bat
```

Start on phone (Expo Go app required):

```bat
start-mobile.bat
```

Scan the QR code on the same Wi‑Fi as your PC. See [WINDOWS-ANDROID-SETUP.md](WINDOWS-ANDROID-SETUP.md) for details.

---

## Daily workflow — edit locally, push when ready

All work happens on your PC. Push only when you want changes on GitHub.

```
  ┌─────────────────┐     git pull      ┌──────────────────┐
  │  GitHub (main)  │ ◄──────────────── │  Your local PC   │
  └─────────────────┘                   │  D:\New folder\  │
          ▲                             │  price-maker     │
          │         git push            │                  │
          └─────────────────────────────└──────────────────┘
                    (when you are ready)
```

### 1. Start your session — get latest code

```bat
cd /d "D:\New folder\price-maker"
git pull origin main
```

Or run `pull-to-local.bat`.

### 2. Edit files

Use Cursor, VS Code, or any editor. Main areas:

| What you change | Where |
|-----------------|-------|
| PC web UI / logic | `index.html`, `js\`, `css\` |
| Android app | `mobile\app\`, `mobile\src\` |
| Docs / scripts | `docs\`, `*.bat` |

### 3. Test locally

- **PC:** `price maker.bat` or open `index.html`
- **Android:** `start-mobile.bat`

### 4. Save your work to GitHub

```bat
cd /d "D:\New folder\price-maker"
git status
git add .
git commit -m "Describe what you changed"
git push origin main
```

**Tip:** Use a feature branch if you prefer not to push directly to `main`:

```bat
git checkout -b my-feature
git add .
git commit -m "Add my feature"
git push -u origin my-feature
```

Then open a Pull Request on GitHub.

---

## Check that everything is in the right place

Run from the project folder:

```bat
check-folders.bat
```

You should see `[FOUND] D:\New folder\price-maker` with web app, and mobile if you ran `setup-mobile.bat`.

---

## Troubleshooting

### `git` is not recognized

Install Git and **open a new** Command Prompt: https://git-scm.com/download/win

### `node` is not recognized

Install Node.js LTS: https://nodejs.org/

### `mobile` folder missing

```bat
cd /d "D:\New folder\price-maker"
git pull origin main
```

If still missing, clone fresh:

```bat
cd /d "D:\New folder"
ren price-maker price-maker-old
git clone https://github.com/sparkyvicky-dev/price-maker.git price-maker
```

### Wrong folder — ran `npm start` in the wrong place

```bat
C:\Users\You> npm start    ← WRONG (no package.json here)
```

Always use:

```bat
D:\New folder\price-maker\start-mobile.bat
```

### Git push asks for login

Use a **Personal Access Token** as the password, or sign in with GitHub Desktop / `gh auth login`.  
Docs: https://docs.github.com/en/authentication

### Merge conflicts after pull

```bat
git status
```

Edit conflicted files, then:

```bat
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

---

## Other guides

| Guide | Purpose |
|-------|---------|
| [README.md](../README.md) | Features, shortcuts, Excel format |
| [WINDOWS-ANDROID-SETUP.md](WINDOWS-ANDROID-SETUP.md) | Android / Expo on Windows |
| [ANDROID-APP.md](ANDROID-APP.md) | Mobile app architecture |
| [VPS-DEPLOY.md](VPS-DEPLOY.md) | Host online for phone + PC |

---

## Quick reference

| Task | Command |
|------|---------|
| First-time setup | `pull-to-local.bat` |
| Get latest code | `git pull origin main` |
| Start PC app | `price maker.bat` |
| Setup Android (once) | `setup-mobile.bat` |
| Start Android | `start-mobile.bat` |
| Push your changes | `git add .` → `git commit -m "..."` → `git push origin main` |
