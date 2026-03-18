# CRM App

Standalone app at `crm/` (NOT inside `app/src/admin/`). Deployed to `click-bateva-crm.web.app`.

## Key Files

- `crm/src/App.tsx` — root with BrowserRouter, AuthGuard, CrmLayout
- `crm/src/components/Layout/CrmLayout.tsx` — flex layout with collapsible sidebar + hamburger (mobile responsive)
- `crm/src/components/Layout/Sidebar.tsx` — desktop: fixed `w-64` sidebar; mobile: overlay with backdrop. 2 nav items: משימות, אנשי קשר (+ משתמשי CRM for admins).
- `crm/src/components/AuthGuard.tsx` — gates on `admin | crm_user` roles
- `crm/src/components/ChangePasswordModal.tsx` — password change modal
- `crm/src/components/PasswordInput.tsx` — password input with show/hide toggle
- `crm/src/hooks/useAuth.ts` — auth context hook (same pattern as main app)
- `crm/src/lib/firebase.ts` — Firebase config + emulator connection (Auth, Firestore, Storage, Functions)
- `crm/src/lib/errorReporting.ts` — error reporting utility
- `crm/src/lib/passwordStrength.ts` — password validation utilities
- `crm/src/types/index.ts` — CrmContact, CrmTask, ActivityLogEntry, CrmAttachment, TaskPriority types

### Pages
- `crm/src/pages/ContactsPage.tsx` — contact list with search (all fields), sorted by businessName, desktop table + mobile cards
- `crm/src/pages/ContactDetailPage.tsx` — contact info + notes + attachments + linked tasks + WhatsApp/email buttons (grid-cols-1 lg:grid-cols-2)
- `crm/src/pages/TasksPage.tsx` — unified tasks page with assignee + date range filters, active/completed tabs, grouped by day
- `crm/src/pages/CrmUsersPage.tsx` — admin user management, desktop table + mobile cards
- `crm/src/pages/LoginPage.tsx` — login form

### CRM Components
- `crm/src/components/crm/crmUtils.ts` — PRIORITY_LABELS/COLORS, formatDate/DateTime, toggleTaskFollow/Complete
- `crm/src/components/crm/ContactModal.tsx` — create/edit contact (name, businessName, nameInMap, phone, phone2, email)
- `crm/src/components/crm/ExcelImportModal.tsx` — xlsx import with Hebrew header support, batch write
- `crm/src/components/crm/TaskModal.tsx` — create/edit task with contact/assignee pickers, comments section, vivid color palette
- `crm/src/components/crm/TaskCard.tsx` — compact 1-line card: date, business name (link to contact), phone, title, priority badge, close/follow buttons
- `crm/src/components/crm/TaskComments.tsx` — task comment thread
- `crm/src/components/crm/ContactNotes.tsx` — per-contact notes with add/edit/delete (uses `activity_log` subcollection)
- `crm/src/components/crm/EmailComposer.tsx` — in-app email composer with file attachment upload

## Component / Data Flow

```
App.tsx (BrowserRouter, root)
  └─ AuthGuard (gates on admin | crm_user)
      └─ CrmLayout (collapsible sidebar + main content)
          ├─ TasksPage (default route /tasks) → TaskModal, TaskCard
          │   └─ Filters: assignee dropdown, date range buttons, search, priority
          ├─ ContactsPage (/contacts) → ContactModal, ExcelImportModal
          ├─ ContactDetailPage (/contacts/:id) → ContactNotes, EmailComposer, TaskModal
          │   └─ WhatsApp + email buttons, attachments display
          └─ CrmUsersPage (/users, admin-only)

Sidebar: 2 nav items (+ admin-only CRM Users)
         Mobile: hamburger button opens overlay sidebar
```

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS v4.2 (via `@tailwindcss/vite`)
- Firebase (Auth, Firestore, Storage, Functions)
- `xlsx` library for Excel import
- RTL layout (`dir="rtl"`)

## Patterns & Conventions
- Color scheme: green-600/700 primary, gray secondary
- Modals: `fixed inset-0 bg-black/50 z-50`, `max-h-[90vh] overflow-y-auto`
- Responsive: `md:` breakpoint for table/card toggle, `sm:` for form layout
- Page padding: `p-4 md:p-6`
- Priority colors in `crmUtils.ts` (red=high, yellow=medium, green=low)
- Task colors: vivid/bright palette in TaskModal TASK_COLORS array

## Gotchas
- **Tailwind v4 RTL positioning:** `left-*`/`right-*` are LOGICAL in v4. In RTL: `right-3` = physical LEFT, `left-3` = physical RIGHT. Use `right-*` for physical left placement (e.g., hamburger button on the left side in RTL).
- **Firestore collections:** `crm_contacts` (with `activity_log` and `attachments` subcollections), `crm_tasks` (with `comments` subcollection), `users` (queried for assignee/contact pickers)
- **CRM contact fields:** `name`, `businessName`, `nameInMap?`, `phone`, `phone2?`, `email`, `createdBy`, `createdByEmail`, `createdAt`, `updatedAt`. When adding fields: update type, ContactModal, ContactDetailPage, ContactsPage, ExcelImportModal, `firestore.rules` allowlists (create + update), and rules test `mkContactData`.
- **CRM task denormalized fields:** `contactBusinessName`, `contactPhone` are copied from the contact when creating/editing a task. Existing tasks may not have these fields — handle undefined gracefully.
- **Cloud Functions:** `createCrmUser`, `deleteCrmUser`, `sendContactEmail` callables
- **Subcollection cascade delete:** When deleting a `crm_contacts` doc, must first batch-delete all `activity_log` AND `attachments` subcollection docs
- **New roles need `users` read access:** `crm_user` role needs explicit read rule on `users` collection for pickers
- **Email sending:** Requires SMTP_USER and SMTP_PASS env vars configured in Cloud Functions (Gmail SMTP via nodemailer)
- **Storage:** `crm-attachments/{contactId}/` path for email file attachments, gated by `isCrmAuthorized()` in storage.rules
