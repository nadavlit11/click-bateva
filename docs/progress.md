# Click Bateva - Progress Tracker

Tracks completion status of each work-plan step. Update this file as work is done.

**Statuses:** ✅ Done · 🔄 In Progress · ⬜ Todo · ⏭ Skipped

---

## Phase 0: Project Foundation & Setup

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 0.1 | Review & finalize ATDD and HLD docs | ✅ | Docs updated: clicks flat collection, content_manager role, icon system, geocoding |
| 0.2 | Development environment setup | ✅ | Node, VS Code, Firebase CLI, gh CLI installed |
| 0.3 | Version control setup | ✅ | Git init, .gitignore, initial commit, main/develop branches, pushed to GitHub |
| 0.4 | Firebase project initialization | ✅ | Auth, Firestore (me-west1), Storage, Functions (TypeScript), Hosting enabled |
| 0.5 | Google Maps API setup | ✅ | Maps JS API + Geocoding API enabled; key saved to .env (gitignored); HTTP referrer restrictions deferred until domain is known |
| 0.6 | Claude skills discovery | ✅ | Created custom skills: `update-docs`, `review-rules`, `new-collection` |

---

## Phase 1: Backend & Core Services

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1.1 | Finalize Firestore schema | ✅ | All collections defined; `clicks` flat (not subcollection); `icons.path`; `categories` has `color`, `iconId`, `iconUrl` |
| 1.2 | Write & deploy Firestore Security Rules | ✅ | `firestore.rules` written and committed; all roles and collections covered |
| 1.3 | Configure Cloud Storage bucket structure and rules | ✅ | `storage.rules` written; `poi-media/`, `icons/` structure defined; uses custom claims |
| 1.4 | Firebase Auth setup — Email/Password, custom claims Cloud Function | ✅ | `onUserCreated` trigger + `setUserRole` callable fn; firebase-admin v13 modular imports; emulator on port 8081 (Tomcat holds 8080) |
| 1.5 | Implement click tracking — client-side write to `clicks` collection | ⬜ | Note: work-plan still says "subcollection" — it's a flat collection |
| 1.6 | Test security rules using Firebase Emulator Suite | ⬜ | |

---

## Phase 2: Admin Dashboard

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 2.1 | Project scaffold — `apps/admin`, routing, auth guards, layout | ⬜ | |
| 2.2 | Auth — Login/logout UI, Firebase Auth integration, role-based redirect | ⬜ | |
| 2.3 | Icon management — upload, list, delete; `icons` Firestore collection | ⬜ | |
| 2.4 | Categories & Tags management — CRUD + icon dropdown | ⬜ | |
| 2.5 | POI management — CRUD, media upload, map-click + geocoding location | ⬜ | |
| 2.6 | Business account management — Firestore records + Auth user creation | ⬜ | |
| 2.7 | Click analytics — total, per-category, per-POI clicks | ⬜ | |

---

## Phase 3: Business Dashboard

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 3.1 | Project scaffold — `apps/business`, routing, auth guards | ⬜ | |
| 3.2 | Auth — Login/logout, business role redirect | ⬜ | |
| 3.3 | POI editing — assigned POIs only, restricted fields | ⬜ | |

---

## Phase 4: User-Facing Web App

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 4.1 | Project scaffold — `apps/user-web` | ⬜ | |
| 4.2 | Map view — Google Maps, active POI markers | ⬜ | |
| 4.3 | Filtering — category and tag filters | ⬜ | |
| 4.4 | POI detail popup — info window with all fields | ⬜ | |
| 4.5 | Click tracking — write to `clicks` on marker click | ⬜ | |

---

## Phase 5: Testing & Refinement

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 5.1 | Unit & integration tests | ⬜ | |
| 5.2 | Comprehensive Security Rules testing (Emulator + Rules Playground) | ⬜ | |
| 5.3 | ATDD acceptance testing | ⬜ | |
| 5.4 | Performance testing — 100 concurrent users | ⬜ | |
| 5.5 | UI/UX refinement | ⬜ | |

---

## Phase 6: Deployment & Monitoring

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 6.1 | Deploy all 3 apps to Firebase Hosting | ⬜ | |
| 6.2 | Google Analytics, Performance Monitoring, alerts | ⬜ | |

---

## Known Deviations from Work Plan

- `clicks` in the work plan still references "subcollection" in 1.5 and 4.5 — it is actually a **flat top-level collection**
- Google Maps API key HTTP referrer restrictions deferred until hosting domain is set up
