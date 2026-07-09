# ESM Customer Hub — Project Manager Guide

This guide covers the day-to-day use of the Customer Hub from a PM's perspective: how to set up new customer projects, manage the portal your customers see, and use the internal dashboard to stay on top of your implementations.

---

## What the Customer Hub does

The Customer Hub is a single web application with two sides:

1. **ESM Staff Dashboard** (`/dashboard`) — Where you manage projects, generate documents, configure settings, and monitor implementation progress across all your accounts.
2. **Customer Portal** (`/hub`) — A branded, read-only portal your customers access via magic link. They see their project timeline, milestones, action items, documents, meeting recordings, and intake forms.

Data flows from **Smartsheet** (project plans, milestones, action items) and **HubSpot** (intake/onboarding data) into the hub automatically. You don't enter data into the hub directly — you work in Smartsheet and HubSpot as usual, and the hub reflects it.

---

## Getting started

### Logging in

1. Navigate to the hub URL (ask your admin for the address).
2. Click **Sign in** and enter your ESM email and password.
3. You'll land on the ESM Staff Dashboard showing all projects assigned to you.

Admin users see every project. SC and PM users see only projects where their email matches the SC or PM field in the configuration.

### Understanding the dashboard

The dashboard shows a table of all your projects with:

- **Customer name** and **project name**
- **Status** (On Track, At Risk, Off Track)
- **Current phase** (derived from Smartsheet milestones)
- **Go-live date** and **days remaining**
- **SC and PM** assignments

Click any project row to open the project detail view.

---

## Setting up a new customer project

New projects are created automatically from HubSpot. No manual configuration is needed.

### Step 1: Set up the customer in HubSpot

Create the customer's intake record in HubSpot and fill in the key fields:

| HubSpot field | What it maps to |
|---|---|
| **Customer** / **Institution Legal Name** | Customer name in the hub |
| **Implementation Project Name** | Project name |
| **Modules in Scope** | Product list (semicolon-separated) |
| **ESM Solution Consultant** | SC assignment (resolved from HubSpot owner ID) |
| **Target Go-Live** | Go-live date |
| **Project Template** | Determines which Smartsheet template sheets are copied |

### Step 2: Set "Create Customer Hub" to Yes

When the **Create Customer Hub** field on the HubSpot record is set to **Yes**, the hub automatically:

1. Creates the project in the hub with all HubSpot data pulled in
2. Copies the appropriate Smartsheet template sheets into a new customer folder
3. Seeds the Project Info sheet with customer details and the portal URL/password
4. Sets default dates on the Project Plan based on the start date
5. Populates links in the Document Repository sheet
6. Creates a SharePoint folder for the customer (if SharePoint is configured)
7. Generates a customer portal password automatically

This happens either instantly via HubSpot webhook, or when you click the **Sync HubSpot** button on the dashboard. Both trigger the same provisioning process.

### Step 3: Verify in the dashboard

After syncing, the new project appears in your dashboard. Click into it to verify:

- Customer and project name are correct
- Smartsheet sheets are linked (timeline, action items, RAID log should populate)
- The portal password is recorded in the Smartsheet Project Info sheet

### Step 4: Add customer contacts

To give customers access to their portal, add their contacts from the project's settings in the dashboard. Each contact needs a name, email, and role. Only listed contacts can request magic links to log in.

---

## Managing projects day-to-day

### Viewing project details

From the dashboard, click a project to see:

- **Health banner** — Overall project health with a summary
- **Milestone timeline** — Visual Gantt-style chart of milestones from Smartsheet
- **Key metrics** — Days to go-live, intake completion percentage, open items count
- **Open items** — Action items pulled from Smartsheet, filterable by owner
- **Decision log** — Decisions and their status from the RAID log
- **Activity feed** — Recent changes across the project

### Generating documents

Navigate to the **Documents** tab in the project detail view. You can generate:

| Document | What it contains |
|---|---|
| **Workflow Data Template** (XLSX) | Structured workflow data extracted from customer uploads |
| **Workflow Guide** (DOCX) | Narrative guide for the customer's procurement workflows |
| **UAT Tracker** | Testing tracker spreadsheet |
| **UAT Completion Guide** | Instructions for customer UAT |
| **Project Charter** | SOW/charter document with project scope and timeline |
| **Training Guide** | End-user training materials |
| **Go-Live Checklist** | Pre-go-live verification checklist |

Click **Generate** next to any document type. The hub uses AI to assemble the document from your project's Smartsheet data and intake information. Generation typically takes 10-30 seconds.

Once generated, click **Download** to get the file. You can **Regenerate** at any time to get an updated version.

### Processing customer uploads

Customers can upload procurement workflow documents (PDFs, Word docs) through the portal. When they do:

1. The file is automatically processed by AI to extract workflow data.
2. The extracted data populates the Workflow Data Template (XLSX) and Workflow Guide (DOCX).
3. Generated documents appear in the Documents section.

You can also upload files on behalf of a customer from the ESM Documents view using the **Customer Uploads** section.

### Monitoring intake progress

The **Intake** tab shows the customer's onboarding form data pulled from HubSpot. This is read-only — changes happen in HubSpot. The progress bar at the top shows how much of the intake form has been completed.

---

## The customer portal

### What customers see

When a customer accesses their portal, they see:

1. **Team contact strip** — Their SC and PM with email and meeting request buttons, prominently displayed at the top
2. **Project health banner** — Current status and a plain-language summary
3. **Milestone timeline** — Visual timeline of their implementation
4. **Key metrics cards** — Days to go-live, intake progress, open items
5. **Open action items** — Items assigned to the customer with due dates
6. **Quick links** — Links to their Smartsheet workspace, intake form, and other resources
7. **Document library** — Generated documents available for download
8. **Meeting recordings** — Links to recorded implementation meetings
9. **RAID log** — Risks, issues, and decisions (read-only view)

### How customers log in

Customers log in via **magic link**:

1. They visit the portal URL and enter their email address.
2. The hub sends a one-time login link to their email (valid for 24 hours).
3. Clicking the link creates a session that lasts 30 days.

Only email addresses listed in the project's `contacts` array can request magic links.

### Sharing the portal with customers

When you're ready to share the portal with a customer:

1. Confirm their contacts are set up in the project config.
2. Send them the portal URL.
3. They'll enter their email, receive the magic link, and access their hub.

The portal is branded with the customer's accent color if configured.

---

## Settings and configuration

### Application settings

Navigate to **Settings** from the dashboard header. Available settings include:

- **Resend email integration** — For sending magic link emails
- **SharePoint integration** — For optional customer folder creation
- **Document generation defaults** — Default enabled document types

### Managing ESM users

Navigate to **Manage Users** from the dashboard header. Here you can:

- View all ESM staff accounts
- Add new users (name, email, password, role)
- Edit existing users
- Set roles: `ADMIN` (sees everything), `SC` (sees assigned projects), `PM` (sees assigned projects)

---

## Tips and troubleshooting

**Dates look wrong (off by one day)?**
This was a known bug that has been fixed. If you still see it, try a hard refresh (Ctrl+Shift+R).

**Project data isn't updating?**
The hub reads from Smartsheet on each page load. If you just made changes in Smartsheet, refresh the page. There's no sync delay — data is fetched live.

**Customer can't log in?**
Check that their email is in the project's `contacts` array (exact match, case-insensitive). Also verify the Resend API is configured for sending magic link emails.

**Document generation fails?**
Ensure the project has Smartsheet sheets linked and that there's data in those sheets. The AI needs source data to generate documents.

**I don't see a project on my dashboard?**
You'll only see projects where your email matches the SC or PM field. Ask an admin to verify the assignment or use an admin account.
