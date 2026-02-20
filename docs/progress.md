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
| 1.5 | Implement click tracking — client-side write to `clicks` collection | ✅ | `handlePoiClick` in user-web App.tsx; addDoc to top-level `clicks`; fire-and-forget with console.error |
| 1.6 | Test security rules using Firebase Emulator Suite | ✅ | 40 tests in `firestore-tests/`; all pass; covers clicks, POIs, businesses, icons |

---

## Phase 2: Admin Dashboard

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 2.1 | Project scaffold — `apps/admin`, routing, auth guards, layout | ✅ | Vite+React+TS+Tailwind; LoginPage, AuthGuard (role-gated), Layout + Sidebar; deployed to click-bateva.web.app |
| 2.2 | Auth — Login/logout UI, Firebase Auth integration, role-based redirect | ✅ | signInWithEmailAndPassword; onAuthStateChanged + getIdTokenResult() for role check; signOut; set-admin bootstrap script |
| 2.3 | Icon management — upload, list, delete; `icons` Firestore collection | ✅ | IconsPage: upload to Storage + Firestore doc; list with delete; Storage rules use custom claims |
| 2.4 | Categories & Tags management — CRUD + icon dropdown | ✅ | CategoryModal + TagModal; icon picker from Firestore; color picker; tags are simple name-only |
| 2.5 | POI management — CRUD, media upload, map-click + geocoding location | ✅ | PoiDrawer: full CRUD; Cloud Storage image upload; MapPicker (Leaflet + Nominatim) replaces bare lat/lng inputs |
| 2.6 | Business account management — Firestore records + Auth user creation | ✅ | `createBusinessUser` callable fn; sets `role` + `businessRef` custom claims; `businesses/{uid}` with `associatedUserIds: [uid]`; BusinessesPage + BusinessModal in admin |
| 2.7 | Click analytics — total, per-category, per-POI clicks | ✅ | AnalyticsPage: getDocs from clicks, aggregate by poiId + categoryId; top-5 POIs table + by-category table |

---

## Phase 3: Business Dashboard

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 3.1 | Project scaffold — `apps/business`, routing, auth guards | ✅ | Vite+React+TS+Tailwind v4; BrowserRouter + AuthGuard + AppLayout; click-bateva-biz hosting target added |
| 3.2 | Auth — Login/logout, business role redirect | ✅ | AuthGuard: role check → businessRef claim → getDoc businesses/{id} → BusinessContext; LoginPage; TopBar with signOut |
| 3.3 | POI list — assigned POIs by businessId | ✅ | PoisListPage: onSnapshot with where('businessId','==',businessId); PoiCard with active badge |
| 3.4 | POI edit — restricted fields + image upload | ✅ | PoiEditPage: edits PoiEditableFields; ImageUploader to poi-media/; storage.rules updated for business_user |

---

## Phase 4: User-Facing Web App

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 4.1 | Project scaffold — `apps/user-web` | ✅ | Vite + React 18 + TS + Tailwind v4 + @vis.gl/react-google-maps; design-1-light; RTL; Rubik font; LLD saved to docs/lld-user-web.md |
| 4.2 | Map view — Google Maps, active POI markers | ✅ | Teardrop AdvancedMarkers + name labels; usePois/useCategories/useTags Firestore hooks wired; deployed to click-bateva-app.web.app |
| 4.3 | Filtering — category and tag filters | ✅ | filterPois() wired (category + tag + search); UI chips/pills toggle correctly; 11 unit tests pass |
| 4.4 | POI detail popup — info window with all fields | ✅ | PoiDetailPanel: image carousel (RTL arrows, direction:ltr fix for bidi mirroring), placeholder, phone/website/tags; Poi type extended with images[], phone, website |
| 4.5 | Click tracking — write to `clicks` on marker click | ✅ | Implemented with 1.5 |
| 4.6 | Mobile bottom sheet layout | ✅ | BottomSheet.tsx; h-dvh; hidden md:flex / md:hidden; colorUtils.ts extracted from 3 files |

---

## Phase 5: Testing & Refinement

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 5.1 | Unit & integration tests | ✅ | Cloud Function unit tests (auth.ts, business.ts); 11 filterPois unit tests; 40 security rules integration tests |
| 5.2 | Comprehensive Security Rules testing (Emulator + Rules Playground) | ✅ | `firestore-tests/` package; 40 tests across all collections; all pass; found + fixed businessRef string/path type mismatch bug |
| 5.3 | ATDD acceptance testing | ⏭ | Skipped — manual verification against ATDD doc sufficient at this scale |
| 5.4 | Performance testing — 100 concurrent users | ⏭ | Skipped — Firebase auto-scales; revisit if user load warrants it |
| 5.5 | UI/UX refinement | ✅ | Loading overlay on map; aria-labels on carousel buttons; missing empty/loading states in business dashboard verified present |

---

## Phase 6: Deployment & Monitoring

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 6.1 | Deploy all 3 apps to Firebase Hosting | ✅ | Admin: click-bateva.web.app; User: click-bateva-app.web.app; Business: click-bateva-biz.web.app |
| 6.2 | Google Analytics, Performance Monitoring, alerts | ✅ | getAnalytics + getPerformance added to user-web firebase.ts; production-only (DEV guard) |

---

## Known Deviations from Work Plan

- `clicks` in the work plan referenced "subcollection" in 1.5 and 4.5 — implemented as **flat top-level collection** as designed
- Firestore `businesses` read rule had a string/path type mismatch bug (comparison always returned false); fixed in testing phase by using string concatenation instead of path literal
- Google Maps API key HTTP referrer restrictions deferred until hosting domain is set up
- Firestore rules use `request.auth.token.role` (custom claims) instead of `get()` on users collection — safer, avoids failures when user doc doesn't exist
- `onUserCreated` Cloud Function stuck at old trigger type (`beforeUserCreated`) in production — needs manual delete from Firebase Console to redeploy as Gen1 `auth.user().onCreate`
- Phase 6.1 all 3 apps now fully deployed: admin, user-web, business dashboard
- Phase 3 split work-plan 3.3 into 3.3 (POI list) + 3.4 (POI edit) — LLD makes this clearer
- Phase 4 gains step 4.6 (mobile bottom sheet) — not in original work plan; Design א chosen from prototype
