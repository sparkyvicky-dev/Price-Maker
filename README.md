# Sparky Mobiles Price Manager

A professional, offline-first web application for mobile shop owners to manage daily phone prices and share WhatsApp messages with dealers.

## Features

- **Upload** Excel (.xls, .xlsx) and PDF price lists with automatic brand detection
- **Brand cards** with collapsible groups, drag-to-reorder, and favorites
- **Inline price editing** with undo support and change highlighting
- **WhatsApp preview** and one-click copy (per brand or full list)
- **Daily snapshots** stored in IndexedDB (never overwrites history)
- **History, compare, model history, and calendar** views
- **Export** to PDF, Excel, and JSON backup
- **Settings** for theme, currency, store info, and more
- **Bonus**: autosave, keyboard shortcuts, bulk edit, price alerts, print support

## Quick Start

### Option 1: Open directly
Open `index.html` in a modern browser (Chrome, Edge, Firefox).

> Note: CDN libraries (SheetJS, PDF.js) require internet on first load. After that, the app works fully offline for all data operations.

### Option 2: Local server (recommended)
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then visit `http://localhost:8080`

### Option 3: VPS (phone + PC from anywhere)
See **[docs/VPS-DEPLOY.md](docs/VPS-DEPLOY.md)** for full Nginx + HTTPS deployment steps.

### Option 4: Android app
See **[mobile/README.md](mobile/README.md)** to run **Price Maker** on Android via Expo Go.

Planning doc: **[docs/ANDROID-APP.md](docs/ANDROID-APP.md)**

## Project Structure

```
index.html          Main application shell
css/style.css       Styles (dark/light themes)
js/
  app.js            Main application controller
  db.js             IndexedDB layer
  excel.js          SheetJS Excel parsing
  pdf.js            PDF.js text extraction
  history.js        History page
  compare.js        Date comparison & model history
  preview.js        WhatsApp message generation
  clipboard.js      Copy to clipboard
  settings.js       LocalStorage settings
  export.js         PDF/Excel/JSON export
  import.js         JSON restore
  utils.js          Shared utilities
assets/             Store logos and static files
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save snapshot |
| Ctrl+Z | Undo last price edit |
| Ctrl+F | Focus search |
| Ctrl+K | Copy full price list |
| ? | Show shortcuts help |
| Esc | Close modal |

## Data Storage

- **IndexedDB**: Products, snapshots, history, metadata
- **LocalStorage**: Settings only (theme, store info, preferences)

## Excel Format

Expected columns (flexible header matching):

| Brand | Model | RAM | Storage | Price |
|-------|-------|-----|---------|-------|
| Vivo | T4 Lite | 4GB | 64GB | 10400 |

## License

MIT — Free for commercial use.
