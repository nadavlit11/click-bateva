# CRM App

Standalone app at `crm/` (NOT inside `app/src/admin/`). Deployed to `click-bateva-crm.web.app`.

## Key Files

- `crm/src/App.tsx` — root with BrowserRouter, AuthGuard, CrmLayout
- `crm/src/components/Layout/CrmLayout.tsx` — flex layout with collapsible sidebar + hamburger (mobile responsive)
- `crm/src/components/Layout/Sidebar.tsx` — desktop: fixed `w-64` sidebar; mobile: overlay with backdrop. Props: `open`, `onClose`. Nav links close sidebar on click.
- `crm/src/components/AuthGuard.tsx` — gates on `admin | crm_user` roles
- `crm/src/components/ChangePasswordModal.tsx` — password change modal
- `crm/src/components/PasswordInput.tsx` — password input with show/hide toggle
- `crm/src/hooks/useAuth.ts` — auth context hook (same pattern as main app)
- `crm/src/lib/firebase.ts` — Firebase config + emulator connection
- `crm/src/lib/errorReporting.ts` — error reporting utility
- `crm/src/lib/passwordStrength.ts` — password validation utilities
- `crm/src/types/index.ts` — CrmContact, CrmTask, ActivityLogEntry, TaskPriority types

### Pages
- `crm/src/pages/ContactsPage.tsx` — contact list with search, desktop table + mobile cards
- `crm/src/pages/ContactDetailPage.tsx` — contact info + activity timeline + linked tasks (grid-cols-1 lg:grid-cols-2)
- `crm/src/pages/TasksPage.tsx` — all tasks, active/completed tabs, grouped by day
- `crm/src/pages/MyTasksPage.tsx` — user's tasks: overdue + today + completed
- `crm/src/pages/CrmUsersPage.tsx` — admin user management, desktop table + mobile cards
- `crm/src/pages/LoginPage.tsx` — login form

### CRM Components
- `crm/src/components/crm/crmUtils.ts` — PRIORITY_LABELS/COLORS, formatDate/DateTime, toggleTaskFollow
- `crm/src/components/crm/ContactModal.tsx` — create/edit contact
- `crm/src/components/crm/ExcelImportModal.tsx` — xlsx import with Hebrew header support, batch write
- `crm/src/components/crm/TaskModal.tsx` — create/edit task with contact/assignee pickers, comments section
- `crm/src/components/crm/TaskCard.tsx` — card with colored border, priority badge, follow/done/delete
- `crm/src/components/crm/TaskComments.tsx` — task comment thread
- `crm/src/components/crm/ActivityTimeline.tsx` — real-time activity log subcollection

## Component / Data Flow

```
App.tsx (BrowserRouter, root)
  └─ AuthGuard (gates on admin | crm_user)
      └─ CrmLayout (collapsible sidebar + main content)
          ├─ MyTasksPage (default route /my-tasks)
          ├─ ContactsPage (/contacts) → ContactModal, ExcelImportModal
          ├─ ContactDetailPage (/contacts/:id) → ActivityTimeline
          ├─ TasksPage (/tasks) → TaskModal, TaskCard
          └─ CrmUsersPage (/users, admin-only)

Sidebar: 4 nav items, "לוח ניהול" link (admin only → main admin app)
         Mobile: hamburger button opens overlay sidebar
```

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS v4.2 (via `@tailwindcss/vite`)
- Firebase (Auth, Firestore, Functions)
- `xlsx` library for Excel import
- RTL layout (`dir="rtl"`)

## Patterns & Conventions
- Color scheme: green-600/700 primary, gray secondary
- Modals: `fixed inset-0 bg-black/50 z-50`, `max-h-[90vh] overflow-y-auto`
- Responsive: `md:` breakpoint for table/card toggle, `sm:` for form layout
- Page padding: `p-4 md:p-6`
- Priority colors in `crmUtils.ts` (blue=high, amber=medium, gray=low)

## Gotchas
- **Tailwind v4 RTL positioning:** `left-*`/`right-*` are LOGICAL in v4. In RTL: `right-3` = physical LEFT, `left-3` = physical RIGHT. Use `right-*` for physical left placement (e.g., hamburger button on the left side in RTL).
- **Firestore collections:** `crm_contacts` (with `activity_log` subcollection), `crm_tasks`, `users` (queried for assignee/contact pickers)
- **Cloud Functions:** `createCrmUser`, `deleteCrmUser` callables
- **Subcollection cascade delete:** When deleting a `crm_contacts` doc, must first batch-delete all `activity_log` subcollection docs
- **New roles need `users` read access:** `crm_user` role needs explicit read rule on `users` collection for pickers
