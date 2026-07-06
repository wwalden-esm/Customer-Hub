# ESM Customer Hub

Full-lifecycle customer implementation portal for ESM Solutions. Replaces the separate welcome portal (intake forms) and workflow customizer (doc generation) with a unified hub.

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL + Prisma v6
- **Auth:** NextAuth v5 (ESM staff, credentials) + jose magic links (customers)
- **Email:** Resend
- **Smartsheet:** Native REST API v2 with HMAC-SHA256 webhooks
- **Styling:** Tailwind CSS with ESM brand tokens

## Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Push schema to database and seed demo data
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session encryption for ESM staff auth |
| `MAGIC_LINK_SECRET` | JWT signing for customer magic links |
| `RESEND_API_KEY` | Transactional email via Resend |
| `SMARTSHEET_API_TOKEN` | Smartsheet REST API access |
| `SMARTSHEET_WEBHOOK_SECRET` | HMAC-SHA256 webhook verification |
| `ANTHROPIC_API_KEY` | Claude API key for document generation + data extraction |
| `APP_URL` | Public URL for email links |

## Auth

Two separate auth systems:

1. **ESM Staff** (`/login` -> `/dashboard/*`): NextAuth v5 with credentials provider, JWT sessions (8hr maxAge)
2. **Customers** (`/hub/login` -> `/hub/*`): Magic link via email, jose JWT cookie (30-day expiry)

Customer access is controlled by `CustomerContact` records linked to projects.

## Smartsheet Integration

- **Inbound sync:** Smartsheet webhook fires -> fetch updated sheet -> compare with local DB -> apply or create `SyncConflict`
- **Outbound sync:** Hub data changes -> Smartsheet write with 3x exponential backoff
- **Webhook setup:** Register a webhook pointing to `{APP_URL}/api/webhooks/smartsheet` with the shared secret

## Key Routes

### ESM Staff
- `/dashboard` — Project list with portfolio analytics
- `/dashboard/[id]` — Project detail
- `/dashboard/[id]/config` — Section visibility, branding, contacts
- `/dashboard/[id]/conflicts` — Sync conflict resolution
- `/dashboard/[id]/audit` — Audit log
- `/dashboard/[id]/documents` — Document generation + upload management
- `/dashboard/templates` — Document template management (admin)

### Customer Hub
- `/hub` — Dashboard with health banner, metrics, milestones, action items
- `/hub/intake` — 23-section intake form with auto-save
- `/hub/documents` — Document library with uploads, generation, and downloads
- `/hub/notifications` — Notification history

### API
- `POST /api/projects` — Create hub
- `PATCH /api/projects/[id]/sections/[key]` — Save intake section
- `POST /api/projects/[id]/sync` — Trigger Smartsheet sync
- `GET /api/projects/[id]/documents/intake-export` — Download intake DOCX
- `POST /api/projects/[id]/uploads` — Upload customer file
- `POST /api/projects/[id]/uploads/[uploadId]/process` — Process upload with Claude
- `POST /api/projects/[id]/documents/workflow-xlsx` — Generate workflow XLSX
- `POST /api/projects/[id]/documents/workflow-docx` — Generate workflow DOCX
- `POST /api/projects/[id]/documents/project-charter` — Generate project charter/SOW
- `POST /api/projects/[id]/documents/training-guide` — Generate training guide
- `POST /api/projects/[id]/documents/go-live-checklist` — Generate go-live checklist
- `GET /api/projects/[id]/documents/[docId]/download` — Download generated document
- `GET/POST /api/templates` — List/upload document templates
- `GET /api/portfolio` — Portfolio analytics data
