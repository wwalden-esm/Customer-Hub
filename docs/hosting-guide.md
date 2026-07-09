# ESM Customer Hub — Technical Hosting Guide

This document describes the architecture of the Customer Hub application and what is required to host it for production use within the company.

---

## Architecture overview

The Customer Hub is a **Next.js 14** application (App Router) built with TypeScript. It runs as a single Node.js process that serves both the ESM staff dashboard and the customer-facing portal.

```
                    ┌─────────────────────┐
                    │   Customer Hub      │
                    │   (Next.js 14)      │
                    │   Node.js 20+       │
                    └────┬───┬───┬───┬────┘
                         │   │   │   │
              ┌──────────┘   │   │   └──────────┐
              ▼              ▼   ▼              ▼
        Smartsheet       HubSpot  Claude AI   Resend
        (project data)   (intake) (doc gen)   (email)
                                                │
                                          ┌─────┘
                                          ▼
                                    SharePoint
                                    (optional)
```

### Key characteristics

- **No database.** All persistent data lives in Smartsheet and HubSpot. Project configuration is stored in JSON files on disk.
- **Stateless requests.** Each page load fetches fresh data from external APIs. No in-memory cache between requests.
- **File-based config.** Three JSON config files in the `config/` directory define projects, users, and settings.
- **JWT-based auth.** Sessions are stored as signed JWTs in cookies — no server-side session store required.

---

## Cost analysis

ESM's existing Smartsheet Enterprise and HubSpot subscriptions cover the primary data sources. The new costs are the Anthropic API, a lightweight email service, and Azure hosting.

### Already covered

| Service | ESM status | Notes |
|---|---|---|
| **Smartsheet** | Covered | Enterprise plan includes full API access. No additional cost. |
| **HubSpot** | Covered | Uses a private app token against the existing account. Low-volume read-only API calls. |

### New costs

> **Important:** The Anthropic Team plan covers claude.ai chat seats. The hub uses the **Anthropic API**, which is billed separately by token usage through the Anthropic Console (console.anthropic.com). This requires a separate API account with a payment method.

| Service | What it does | Estimated monthly cost |
|---|---|---|
| **Anthropic API** | AI document generation and file extraction. Each call uses ~2k-8k input + 1k-4k output tokens. | ~$15-50 at moderate usage (20 projects, 3-5 docs/week). Scales with volume. Claude Sonnet is the most cost-effective model. |
| **Resend** | Magic link emails. One email per customer login. | $0 (free tier: 100/day, 3,000/mo). Paid $20/mo if needed. |
| **Azure App Service** | Hosting the Node.js app. 1 GB RAM is sufficient. | B1: ~$13/mo. B2: ~$26/mo (recommended). |

### Monthly cost summary

| Item | Cost |
|---|---|
| Smartsheet (Enterprise) | Already covered |
| HubSpot | Already covered |
| Anthropic API (usage-based) | ~$15-50 |
| Resend (email) | $0 |
| Azure App Service (B1/B2) | $13-26 |
| **Estimated new monthly cost** | **$28-76** |

*API cost estimates are approximate and based on published pricing as of early 2025. Actual costs depend on document volume, complexity, and model choice.*

---

## System requirements

| Component | Requirement |
|---|---|
| **Node.js** | v20.x or later (LTS recommended) |
| **npm** | v10+ (ships with Node 20) |
| **OS** | Windows Server, Linux, or macOS |
| **RAM** | 1 GB minimum, 2 GB recommended |
| **Disk** | 500 MB for application + dependencies |
| **Network** | Outbound HTTPS to Smartsheet, HubSpot, Anthropic, Resend, and optionally SharePoint APIs |

---

## External service dependencies

The application requires API credentials for these services:

| Service | Purpose | Required? |
|---|---|---|
| **Smartsheet** | Project plans, milestones, action items, RAID logs, meeting tracking, document storage | Yes |
| **HubSpot** | Customer intake/onboarding data | Yes |
| **Anthropic (Claude AI)** | AI-powered document generation and file extraction | Yes |
| **Resend** | Transactional email for customer magic links | Yes |
| **Microsoft SharePoint** | Customer folder creation and document storage | No (optional) |

---

## Environment variables

The application requires the following environment variables. Create a `.env` file in the project root or set them in your hosting platform.

### Required

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Full base URL of the application (e.g., `https://hub.esmsolutions.com`) |
| `NEXTAUTH_SECRET` | Random 32+ character string for NextAuth JWT signing. Generate with `openssl rand -base64 32`. |
| `MAGIC_LINK_SECRET` | Separate random string for customer magic link JWT signing. Generate the same way. |
| `SMARTSHEET_API_TOKEN` | Smartsheet API access token with read/write permissions |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI document generation |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `EMAIL_FROM` | Sender email address for magic links (e.g., `hub@esmsolutions.com`) |
| `HUBSPOT_API_KEY` | HubSpot private app access token |

### Optional

| Variable | Description |
|---|---|
| `HUBSPOT_OBJECT_TYPE` | Custom object type ID in HubSpot (default: `2-65056886`) |
| `SHAREPOINT_TENANT_ID` | Azure AD tenant ID for SharePoint integration |
| `SHAREPOINT_CLIENT_ID` | Azure AD app registration client ID |
| `SHAREPOINT_CLIENT_SECRET` | Azure AD app registration client secret |
| `SHAREPOINT_SITE_ID` | SharePoint site ID for document storage |
| `SHAREPOINT_DRIVE_ID` | SharePoint document library drive ID |
| `SHAREPOINT_BASE_FOLDER` | Root folder path in SharePoint |

---

## Configuration files

Three JSON files in `config/` control the application:

### `config/projects.json`

Defines all customer projects. Each key is a project slug used in URLs.

```
{
  "project-slug": {
    "customerName": "...",
    "projectName": "...",
    "products": ["..."],
    "scName": "...",
    "scEmail": "...",
    "pmName": "...",
    "pmEmail": "...",
    "goLiveDate": "YYYY-MM-DD",
    "currentPhase": "...",
    "status": "ON_TRACK | AT_RISK | OFF_TRACK",
    "branding": { "accentColor": "#hex" },
    "contacts": [
      { "name": "...", "email": "...", "role": "..." }
    ],
    "smartsheetConfig": {
      "workspaceId": "...",
      "portfolioSheetId": "...",
      "projectPlanSheetId": "...",
      "actionItemsSheetId": "...",
      "raidLogSheetId": "...",
      "meetingTrackerSheetId": "..."
    },
    "hubspotConfig": { "objectId": "..." }
  }
}
```

### `config/esm-users.json`

ESM staff credentials. Passwords are stored as bcrypt hashes.

```
[
  {
    "name": "...",
    "email": "...",
    "passwordHash": "$2b$...",
    "role": "ADMIN | SC | PM"
  }
]
```

### `config/settings.json`

Application-wide settings (document types enabled, feature flags, etc.).

---

## Build and deployment

### Building the application

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start the production server
npm start
```

The build step compiles TypeScript and creates an optimized production bundle in `.next/`. The `npm start` command runs the Next.js production server on port 3000 by default.

To change the port:
```bash
PORT=8080 npm start
```

### Deployment options

#### Recommended: Azure App Service

Since ESM already has an Azure subscription, App Service is the simplest path — managed Node.js hosting with built-in SSL, scaling, and deployment pipelines.

1. **Create an App Service** — Node.js 20 LTS, Linux plan, B1 or B2 tier (~$13-26/mo).
2. **Set environment variables** in App Service Configuration > Application settings. Add all required env vars.
3. **Deploy** via one of:
   - **Azure DevOps pipeline** — CI/CD from your Git repo (recommended for ongoing updates)
   - **GitHub Actions** — if the repo is on GitHub
   - **ZIP deploy** — `az webapp deploy --resource-group <rg> --name <app> --src-path app.zip`
   - **Local Git** — push directly to an Azure remote
4. **Config files** — store `config/` contents either bundled with the deployment (simplest) or mounted from an Azure File Share (update without redeploy).
5. **Custom domain** — add your domain in Custom domains, enable managed SSL certificate (free with App Service).
6. **Startup command** — set to `npm start` in Configuration > General settings.

#### Alternative: Windows Server with IIS reverse proxy

If you prefer to use an existing Windows server with available capacity.

1. **Install Node.js 20 LTS** on the server.
2. **Clone the repository** to a directory like `C:\Apps\customer-hub`.
3. **Set environment variables** in the system environment or a `.env` file.
4. **Copy config files** (`projects.json`, `esm-users.json`, `settings.json`) to the `config/` directory.
5. **Build and test:**
   ```
   npm install
   npm run build
   npm start
   ```
6. **Install as a Windows Service** using PM2:
   ```
   npm install -g pm2
   pm2 start npm --name "customer-hub" -- start
   pm2 save
   pm2 startup
   ```
7. **Configure IIS as a reverse proxy:**
   - Install the URL Rewrite and Application Request Routing (ARR) modules.
   - Create a new site with reverse proxy rule to `http://localhost:3000`.
   - Configure SSL/TLS certificate on IIS.

#### Alternative: Docker container

For containerized deployments or Kubernetes.

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/config ./config

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t customer-hub .
docker run -p 3000:3000 --env-file .env customer-hub
```

---

## Security considerations

The following items should be addressed before production deployment:

### Authentication

- **ESM user passwords** are stored as bcrypt hashes in `config/esm-users.json`. This file must be readable only by the application process. On Windows, restrict NTFS permissions; on Linux, `chmod 600`.
- **Customer sessions** use signed JWTs with a 30-day expiry. The `MAGIC_LINK_SECRET` must be a strong random value.
- **Magic link tokens** expire after 24 hours and are single-use.
- Consider integrating with **Azure AD / SSO** for ESM staff authentication in a future iteration to eliminate local password management.

### Network security

- **HTTPS is required.** The application itself does not terminate TLS — use a reverse proxy (IIS, nginx, Azure App Gateway) to handle SSL.
- **API keys** in the `.env` file grant access to Smartsheet, HubSpot, Anthropic, and Resend. Restrict file permissions and never commit this file to version control.
- The application makes **outbound HTTPS calls** to external APIs. No inbound connections are needed beyond the web server port.

### Hardening for production

The current codebase is built for internal/demo use. Before exposing to customers:

| Item | Current state | Recommendation |
|---|---|---|
| **Rate limiting** | None | Add rate limiting middleware (e.g., `express-rate-limit` or Cloudflare) to prevent abuse of magic link and API endpoints |
| **CORS** | Default Next.js behavior | Configure explicit allowed origins if the API will be called cross-origin |
| **CSP headers** | Not configured | Add Content-Security-Policy headers via `next.config.js` |
| **Logging** | Console output only | Add structured logging (e.g., Pino or Winston) with log rotation and forwarding to a central log system |
| **Error handling** | Errors shown in dev mode | Set `NODE_ENV=production` to suppress stack traces in error responses |
| **Monitoring** | None | Add health check endpoint and uptime monitoring |
| **Backups** | Config files on disk | Back up `config/` directory regularly; Smartsheet and HubSpot handle their own data persistence |

### Data flow and privacy

- **No customer data is stored in the application.** All project data lives in Smartsheet and HubSpot. The hub reads it on demand.
- **Uploaded files** are processed in memory or OS temp storage and cleaned up after document generation. No permanent local file storage.
- **Generated documents** are uploaded to Smartsheet and served via temporary download URLs.
- **Magic link emails** contain a one-time JWT — no customer credentials are stored.

---

## Maintenance

### Updating the application

If using Azure App Service with CI/CD, push to your main branch and the pipeline handles the rest. For manual updates:

```bash
git pull
npm install
npm run build
az webapp restart --name <app> --resource-group <rg>
```

### Adding a new project

1. Edit `config/projects.json` to add the project entry.
2. Set up the corresponding Smartsheet workspace and sheets.
3. Create the HubSpot record and note the object ID.
4. Restart the application (or it will pick up config changes on next request, depending on caching).

### Adding a new ESM user

1. Generate a bcrypt hash for the password:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('thepassword', 10).then(h => console.log(h))"
   ```
2. Add the user to `config/esm-users.json`.
3. No restart required — the file is read on each login attempt.

### Rotating API keys

Update the relevant environment variable and restart the application. No code changes needed.

---

## Architecture details

### Request flow

```
Browser → [Reverse Proxy / TLS] → Next.js Server → API Routes
                                         │
                                         ├─ Smartsheet API (project data)
                                         ├─ HubSpot API (intake data)
                                         ├─ Anthropic API (AI generation)
                                         ├─ Resend API (email)
                                         └─ SharePoint API (optional)
```

### Directory structure

```
esm-customer-hub/
├── config/                    # Project, user, and settings config (JSON)
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── api/               # REST API endpoints
│   │   ├── dashboard/         # ESM staff pages
│   │   ├── hub/               # Customer portal pages
│   │   └── login/             # Authentication pages
│   ├── components/            # React components
│   │   ├── dashboard/         # ESM staff components
│   │   ├── hub/               # Customer portal components
│   │   └── intake/            # Intake form components
│   ├── lib/                   # Core libraries
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── smartsheet.ts      # Smartsheet API client
│   │   ├── smartsheet-data.ts # Smartsheet data layer
│   │   ├── hubspot.ts         # HubSpot API client
│   │   ├── magic-link.ts      # Customer session management
│   │   ├── hub-data.ts        # Hub data aggregation
│   │   └── documents/         # Document generators
│   └── types/                 # TypeScript type definitions
└── templates/                 # Document templates (XLSX, DOCX)
```

### API routes

The application exposes these API endpoints (all prefixed with `/api/`):

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth authentication |
| `/api/auth/customer` | POST | Customer magic link login |
| `/api/magic-link/send` | POST | Send magic link email |
| `/api/magic-link/verify` | GET | Verify magic link token |
| `/api/projects/[id]/documents/[type]` | POST | Generate a document |
| `/api/projects/[id]/documents/[docId]/download` | GET | Download a document |
| `/api/projects/[id]/uploads` | POST | Upload customer files |
| `/api/projects/[id]/sections/[key]` | PATCH | Update intake section |
| `/api/projects/[id]/milestones` | GET | Get project milestones |
| `/api/projects/[id]/action-items` | GET | Get action items |
| `/api/projects/[id]/raid-log` | GET | Get RAID log entries |
| `/api/projects/[id]/meetings` | GET | Get meeting records |
| `/api/projects/[id]/recordings` | GET | Get meeting recordings |
| `/api/projects/[id]/activity` | GET | Get activity feed |
| `/api/projects/[id]/health` | GET | Get project health data |
| `/api/hubspot/sync` | POST | Sync HubSpot intake data |
| `/api/esm-users` | GET/POST/PUT/DELETE | Manage ESM staff accounts |
| `/api/settings` | GET/PUT | Application settings |

### Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Runtime | Node.js 20+ |
| Auth (ESM staff) | NextAuth v5, credentials provider, JWT sessions |
| Auth (customers) | Custom magic link flow with `jose` JWTs |
| Styling | Tailwind CSS |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Email | Resend (`resend` npm package) |
| Spreadsheets | `exceljs` (XLSX generation) |
| Documents | `docx` (DOCX generation) |
| File parsing | `pdf-parse`, `mammoth` (PDF/DOCX text extraction) |
