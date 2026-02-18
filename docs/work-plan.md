# Click Bateva - Work Plan (MVP)

**Project Goal:** Map-based web application displaying POIs in Israel, with admin and business management dashboards.

**Key Technologies:** React (Web), Firebase (Firestore, Auth, Storage, Functions, Hosting, Analytics), Google Maps Platform.

## Monorepo Structure

```
click-bateva/
├── apps/
│   ├── user-web/        # User-facing map app (React)
│   ├── admin/           # Admin dashboard (React)
│   └── business/        # Business dashboard (React)
├── functions/           # Cloud Functions
├── shared/              # Shared utils, types, Firebase config
├── firestore.rules
├── storage.rules
└── firebase.json
```

---

## Phase 0: Project Foundation & Setup (1-2 Weeks)

- **0.1** Review & finalize ATDD and HLD docs ✅ *(done)*
- **0.2** Development environment setup:
  - Node.js, npm, VS Code + extensions
  - Firebase CLI
  - React dev environment
- **0.3** Version control setup:
  - Initialize Git repository (`git init`) in the project root
  - Create `.gitignore` (Node, Firebase, env files)
  - Make initial commit
  - Establish branching strategy (`main`, `develop`, `feature/*`)
  - Set up remote repository (GitHub/GitLab) and push
- **0.4** Firebase project initialization:
  - Verify existing Firebase project (`click-bateva`)
  - Enable: Auth, Firestore, Cloud Storage, Hosting, Functions
  - Link Google Analytics
- **0.5** Google Maps API setup:
  - Enable Maps JavaScript API in Google Cloud Console
  - Enable Geocoding API in Google Cloud Console
  - Set up API key with appropriate HTTP referrer restrictions
  - Verify billing is enabled and set budget alerts
- **0.6** Claude skills discovery:
  - Search for premade Claude skills relevant to the project (e.g. React, Firebase, testing, git workflows)
  - Evaluate and shortlist useful skills
  - Document chosen skills and their intended use

---

## Phase 1: Backend & Core Services (2-3 Weeks)

*(LLD + Implementation combined)*

- **1.1** Finalize Firestore schema — exact fields, types, indexes for all collections
- **1.2** Write & deploy Firebase Security Rules (Firestore + Storage) — covering public read, admin full access, business scoped access
- **1.3** Configure Cloud Storage bucket structure and rules
- **1.4** Firebase Auth setup — Email/Password provider, custom claims for roles (`admin`, `business_user`)
- **1.5** Implement click tracking — client-side direct write to `clicks` subcollection
- **1.6** Test all security rules using Firebase Emulator Suite

---

## Phase 2: Admin Dashboard (3-4 Weeks)

*(LLD + Implementation combined)*

- **2.1** Project scaffold — React app under `apps/admin`, routing, auth guards, basic layout
- **2.2** Auth — Login/logout UI, Firebase Auth integration, role-based redirect
- **2.3** Icon management — Upload icons to Cloud Storage, list and delete from icon library; icons stored as metadata in `icons` Firestore collection
- **2.4** Categories & Tags management — List, add, edit, delete (CRUD → Firestore); category form includes icon dropdown populated from icon library
- **2.5** POI management — List, add, edit, delete; image/video upload to Cloud Storage; location selection via:
  - Click on embedded map to place pin → auto-populate coordinates
  - Type address → Geocoding API resolves to coordinates → pin placed on map
- **2.6** Business account management — Create business records in Firestore + Firebase Auth user creation
- **2.7** Click analytics page — Display per-POI click counts from `clicks` subcollection

---

## Phase 3: Business Dashboard (2-3 Weeks)

*(LLD + Implementation combined)*

- **3.1** Project scaffold — React app under `apps/business`, routing, auth guards
- **3.2** Auth — Login/logout UI, Firebase Auth integration, business role redirect
- **3.3** POI editing — List only assigned POIs, edit allowed fields (description, images, phone, email, website), save to Firestore

---

## Phase 4: User-Facing Web App (3-4 Weeks)

*(LLD + Implementation combined)*

- **4.1** Project scaffold — React app under `apps/user-web`
- **4.2** Map view — Google Maps integration, display all active POIs as markers
- **4.3** Filtering — Category and tag filters, dynamic POI visibility on map
- **4.4** POI detail popup — Info window/modal with name, description, images/videos, phone, email, website link
- **4.5** Click tracking — Write to `clicks` subcollection on POI marker click

---

## Phase 5: Testing & Refinement (2-3 Weeks)

- **5.1** Unit & integration tests for critical components
- **5.2** Comprehensive Security Rules testing (Emulator Suite + Rules Playground) — all roles and scenarios
- **5.3** ATDD acceptance testing — execute all scenarios from the ATDD doc
- **5.4** Performance testing — load times, responsiveness, simulate 100 concurrent users
- **5.5** UI/UX refinement based on feedback

---

## Phase 6: Deployment & Monitoring (1 Week)

- **6.1** Deploy all 3 web apps to Firebase Hosting
- **6.2** Verify Google Analytics, set up Performance Monitoring and alerts

---

## Beyond MVP (Future Phases)

- **Phase 7:** Mobile app (React Native — iOS & Android)
- **Phase 8:** Trip Planning Module
- **Phase 9:** AI integration for trip suggestions (Cloud Functions, GenKit)
- **Phase 10:** Scale testing and optimization for 1000+ concurrent users
