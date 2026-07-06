# Sparky Mobiles Price Manager — VPS Deployment Guide

Use this guide when deploying to a VPS so you can open the app from **any PC or mobile** via a URL (e.g. `https://prices.sparkymobiles.com`).

This is a **static site** (HTML/CSS/JS only). No Node, PHP, or database server is required on the VPS.

---

## What you need

| Item | Example |
|------|---------|
| VPS | DigitalOcean, Hetzner, AWS Lightsail, Contabo |
| OS | Ubuntu 22.04 or 24.04 LTS |
| Domain (optional) | `prices.yourshop.com` |
| SSH access | `root@YOUR_VPS_IP` |

**Minimum VPS:** 1 CPU, 512MB–1GB RAM (this app is very light).

---

## Plan overview

```
Your PC  ──upload──►  VPS (/var/www/sparky)
                           │
                           ▼
                      Nginx (port 80/443)
                           │
                           ▼
              Browser on phone / PC / tablet
```

Data stays **in each browser** (IndexedDB + localStorage). The VPS only hosts files.

---

## Step 1 — Prepare project on your PC

Project folder:

```
C:\Users\12vic\sparky-mobiles-price-manager
```

Zip it (or use Git):

```powershell
cd C:\Users\12vic
Compress-Archive -Path sparky-mobiles-price-manager -DestinationPath sparky-mobiles.zip
```

Or push to GitHub (private repo recommended) and clone on VPS.

---

## Step 2 — Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

Create a non-root user (recommended):

```bash
adduser sparky
usermod -aG sudo sparky
su - sparky
```

---

## Step 3 — Upload files to VPS

### Option A — SCP from Windows (PowerShell)

```powershell
scp -r C:\Users\12vic\sparky-mobiles-price-manager sparky@YOUR_VPS_IP:/home/sparky/
```

### Option B — SFTP (FileZilla / WinSCP)

- Host: `YOUR_VPS_IP`
- Upload folder to: `/home/sparky/sparky-mobiles-price-manager`

### Option C — Git on VPS

```bash
cd ~
git clone https://github.com/YOUR_USER/sparky-mobiles-price-manager.git
```

---

## Step 4 — Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

Copy app to web root:

```bash
sudo mkdir -p /var/www/sparky
sudo cp -r ~/sparky-mobiles-price-manager/* /var/www/sparky/
sudo chown -R www-data:www-data /var/www/sparky
sudo chmod -R 755 /var/www/sparky
```

---

## Step 5 — Nginx site config

```bash
sudo nano /etc/nginx/sites-available/sparky
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name YOUR_VPS_IP prices.yourdomain.com;

    root /var/www/sparky;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/sparky /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Open in browser: `http://YOUR_VPS_IP`

---

## Step 6 — HTTPS with Let's Encrypt (recommended)

Requires a domain pointing to your VPS IP (A record).

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d prices.yourdomain.com
```

Follow prompts. Certbot auto-renews.

Access: `https://prices.yourdomain.com`

**Why HTTPS matters:** Clipboard copy works best on secure origins (`https://`).

---

## Step 7 — Self-host JS libraries (optional but recommended)

Currently `index.html` loads SheetJS and PDF.js from CDN. For full offline use on VPS, download them once:

```bash
cd /var/www/sparky
sudo mkdir -p assets/vendor

# SheetJS
sudo curl -L -o assets/vendor/xlsx.full.min.js \
  https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js

# PDF.js
sudo curl -L -o assets/vendor/pdf.min.js \
  https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
sudo curl -L -o assets/vendor/pdf.worker.min.js \
  https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
```

Then edit `/var/www/sparky/index.html` — replace CDN lines with:

```html
<script src="assets/vendor/xlsx.full.min.js"></script>
<script src="assets/vendor/pdf.min.js"></script>
<script>
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
  }
</script>
```

---

## Step 8 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Step 9 — Access from mobile

1. Open Chrome / Safari on phone
2. Go to `https://prices.yourdomain.com`
3. **Add to Home Screen** (works like an app)
4. Bookmark on PC browsers

Each device keeps its **own data** unless you export/import JSON backup.

---

## Updating the app after changes

### From PC (SCP)

```powershell
scp -r C:\Users\12vic\sparky-mobiles-price-manager\* sparky@YOUR_VPS_IP:/var/www/sparky/
```

### On VPS (Git)

```bash
cd ~/sparky-mobiles-price-manager
git pull
sudo cp -r * /var/www/sparky/
sudo systemctl reload nginx
```

**Tip:** After updates, hard-refresh browsers: `Ctrl+Shift+R` or clear cache on mobile.

---

## Quick checklist

- [ ] Files in `/var/www/sparky`
- [ ] `index.html` loads at `http://VPS_IP`
- [ ] Nginx `nginx -t` passes
- [ ] HTTPS enabled (if using domain)
- [ ] Upload Excel works
- [ ] Copy / Preview works on mobile
- [ ] Optional: vendor JS files self-hosted

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 / blank page | `sudo systemctl status nginx` — restart: `sudo systemctl restart nginx` |
| 403 Forbidden | `sudo chown -R www-data:www-data /var/www/sparky` |
| Excel upload fails | Check browser console; ensure SheetJS loads (CDN or local vendor) |
| Copy not working | Use HTTPS, not `http://` |
| Old version showing | Hard refresh or clear cache |
| Module errors | Must serve via Nginx/http — not `file://` |

---

## Using another Cursor chat on VPS

When you SSH into the VPS and open Cursor there, paste this to the AI:

```
Project: Sparky Mobiles Price Manager (static web app)
Path on VPS: /var/www/sparky
Stack: HTML, CSS, vanilla JS, IndexedDB, Nginx
Goal: [deploy / fix nginx / add HTTPS / update files]
Read: /var/www/sparky/docs/VPS-DEPLOY.md
```

---

## Optional next steps (later)

- Subdomain: `prices.sparkymobiles.com`
- Basic auth (password protect URL in Nginx)
- Automated deploy script (`deploy.sh`)
- Cloudflare in front of VPS (free SSL + CDN)
- PWA manifest for installable app icon

---

## File structure on VPS

```
/var/www/sparky/
├── index.html
├── css/style.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── excel.js
│   └── ...
├── assets/
│   └── vendor/          ← optional self-hosted libs
└── docs/
    └── VPS-DEPLOY.md    ← this file
```

---

**Sparky Mobiles** — static deploy, no backend, data stays in browser.
