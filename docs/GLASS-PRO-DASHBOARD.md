# Glass Pro Dashboard Integration

## Goal

Use the complete Glass Pro design as this app’s dashboard (home).

## Source file (your PC)

```
c:\Users\12vic\Documents\billing-app\pakka-glass-pro.html
```

## Target in this repo

This repo does **not** currently have `home.html`. The live app entry is:

- `index.html` — full SPA (dashboard + history + compare + …)

**Intended integration (when the Glass Pro file is available here):**

1. Copy `pakka-glass-pro.html` into the repo root (or paste contents).
2. Overwrite / save as **`home.html`** *or* replace **`index.html`** if that file is the full app shell with the same IDs/scripts wired.
3. Keep **all** dashboard features and IDs so existing `js/app.js` keep working.
4. Sidebar must stay:
   - Default **68px** (icon-only)
   - Hover **252px** (labels)
   - Leave → **68px**
   - Company details at bottom when expanded

## Why not done yet

This cloud workspace cannot read paths on your Windows machine.  
`pakka-glass-pro.html` is **not** in the GitHub `price-maker` repo and is not attached here.

## How to unblock (pick one)

1. **Paste / upload** `pakka-glass-pro.html` into the agent chat, **or**
2. **Commit the file** to this branch at the repo root:
   ```bat
   copy "c:\Users\12vic\Documents\billing-app\pakka-glass-pro.html" "D:\Github projects\price-maker\pakka-glass-pro.html"
   cd /d "D:\Github projects\price-maker"
   git checkout cursor/glass-pro-dashboard-4a03
   git add pakka-glass-pro.html
   git commit -m "Add Glass Pro dashboard source"
   git push -u origin cursor/glass-pro-dashboard-4a03
   ```
   Then ask the agent to finish: rename/overwrite → `home.html` (and wire entry if needed).

## Scope this pass

- **In scope:** Dashboard (Glass Pro) only  
- **Out of scope:** Other pages — tracked in `docs/UI-PAGES-CHECKLIST.md`
