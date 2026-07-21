# ESM Customer Hub — VM Installation Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- A reverse proxy (nginx, IIS, etc.) if exposing on port 80/443

## 1. Clone the repo

```bash
git clone https://github.com/wwalden-esm/Customer-Hub.git esm-customer-hub
cd esm-customer-hub
```

## 2. Install dependencies

```bash
npm install
```

## 3. Set up the `.env` file

Copy the `.env` file from Whitney's local machine directly into the project root. Then update these two values to the VM's public-facing URL:

```
APP_URL="https://<vm-url>"
NEXTAUTH_URL="https://<vm-url>"
```

All other values (API keys, auth secrets) work as-is — no changes needed.

## 4. Build and run

```bash
npm run build
npm start
```

The app runs on port 3000 by default. To change the port:

```bash
PORT=3002 npm start
```

## 5. Run as a service (optional)

Use PM2 to keep the process running:

```bash
npm install -g pm2
pm2 start npm --name "esm-hub" -- start
pm2 save
pm2 startup
```

## Architecture notes

- **No database** — Smartsheet is the sole data store. The `config/` directory holds local JSON files for staff users, project config, FAQs, and activity logs.
- **Next.js 14** App Router with TypeScript and Tailwind CSS
- **Two portals** — staff dashboard at `/dashboard` (email/password auth) and customer hub at `/hub` (project ID + password auth)
- **Document generation** — XLSX and DOCX files generated server-side, stored as Smartsheet attachments
- **AI extraction** — customer uploads processed by Claude API to extract workflow data
- **Email** — sent via Resend API (password resets, notifications)

## Config files

Located in the `config/` directory (copied with the repo):

- `esm-users.json` — staff login credentials (bcrypt-hashed passwords)
- `projects.json` — customer project definitions and Smartsheet sheet IDs
- `faqs.json`, `meeting-templates.json`, `settings.json` — hub configuration
