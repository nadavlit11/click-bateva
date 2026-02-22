# Click Bateva - High-Level Design (HLD)

## 1. Introduction

This document provides a high-level architectural overview and design decisions for the Click Bateva tourism application. The application aims to provide a map-based platform for discovering points of interest (POIs) in Israel, with administrative and business management capabilities. The design prioritizes scalability, security, and developer efficiency, leveraging Google's Firebase platform.

## 2. Architecture Overview

The application adopts a modern client-server architecture, with the frontend implemented using React and the entire backend powered by Firebase services. This approach minimizes infrastructure management overhead and provides inherent scalability.

```
+-------------------+
|   User Web App    |
|     (React)       |
+---------+---------+
          |
          | HTTPS/Websockets
          V
+-------------------------------------------------+
|               Firebase Platform                 |
|                                                 |
|  +---------------------+   +------------------+ |
|  |   Firebase Hosting  |   | Firebase Auth    | |
|  | (Static Assets, CDN)|   | (User Mgmt, SSO) | |
|  +---------------------+   +------------------+ |
|             |                     |             |
|             V                     V             |
|  +---------------------------------------------+ |
|  |             Cloud Firestore                 | |
|  | (NoSQL Database: POIs, Categories,            | |
|  |  Subcategories, Users, Businesses, Clicks)  | |
|  +---------------------------------------------+ |
|             ^                     ^             |
|             |                     |             |
|  +----------+----------+  +------+------------+ |
|  | Cloud Storage for   |  | Cloud Functions   | |
|  |    Firebase         |  | (Data Validation) | |
|  | (Images, Videos)    |  |                   | |
|  +---------------------+  +-------------------+ |
|                                                 |
|  +---------------------+   +------------------+ |
|  | Firebase Analytics  |   | Google Maps API  | |
|  | (Usage, Events)     |   | (Map Display)    | |
|  +---------------------+   +------------------+ |
|                                                 |
+-------------------------------------------------+
          ^        ^
          |        |
+---------+--------+---------+
|   Admin Dashboard (React)  |
+----------------------------+
| Business Dashboard (React) |
+----------------------------+
```

## 3. System Components

### 3.1. Frontend Applications

**User-Facing Web App (React):**
- Technology: React, JavaScript/TypeScript, Google Maps JavaScript API
- Purpose: Primary interface for end-users to browse POIs, filter, and view details
- Deployment: Firebase Hosting

**Admin Dashboard (React Web App):**
- Technology: React, JavaScript/TypeScript (with a UI component library e.g. Material-UI)
- Purpose: Secure interface for administrators to manage all POI data, categories, subcategories, businesses, and review analytics
- Deployment: Firebase Hosting

**Business Dashboard (React Web App):**
- Technology: React, JavaScript/TypeScript
- Purpose: Secure interface for registered businesses to edit details of their associated POIs
- Deployment: Firebase Hosting

### 3.2. Monorepo Structure

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

### 3.3. Backend Services (Firebase)

**Cloud Firestore (NoSQL Database):**
- Role: Primary data store for all application data
- Collections:
  - `points_of_interest`: Stores all POI details
  - `categories`: Manages dynamically created categories (each with an optional icon reference)
  - `icons`: Stores metadata for uploaded icons (name, Cloud Storage URL)
  - `users`: Stores user profiles and roles
  - `businesses`: Stores registered business profiles
  - `clicks`: Top-level collection tracking click events (poiId + categoryId + timestamp, written client-side)
  - `subcategories`: Per-category refinement filters (categoryId + name + group); shown in user-web filter UI, scoped to selected category

**Cloud Storage for Firebase:**
- Role: Scalable object storage for images, videos, and category icons
- Integration: Stores URLs/paths referenced within Firestore documents
- Bucket structure:
  - `poi-media/` — images and videos for POIs
  - `icons/` — category icons uploaded via the icon management page

**Firebase Authentication:**
- Role: User identity management for general users, administrators, and business users
- Provider: Email/Password
- Role management via Firebase Custom Claims (`admin`, `content_manager`, `business_user`)

**Cloud Functions for Firebase:**
- Role: Serverless backend logic for data validation and any server-side processing
- Note: Click tracking is handled client-side for MVP simplicity

**Firebase Hosting:**
- Role: Fast, secure hosting for all web applications via a global CDN

**Google Maps Platform:**
- Maps JavaScript API — map display in user web app and POI location picker in admin dashboard
- Geocoding API — converts addresses to coordinates (GeoPoint) when creating/editing POIs

**Google Analytics for Firebase:**
- Role: Usage statistics, user engagement, and custom event tracking

**Firebase Security Rules:**
- Role: Enforces data access control on Firestore and Cloud Storage
- Granularity:
  - Public read for active POI data
  - Authenticated read/write for user-specific data
  - Admin read/write access to all collections
  - Business users limited to read/write their own assigned POIs

## 4. High-Level Data Model (Firestore)

### `points_of_interest` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | |
| description | string | |
| location | GeoPoint | latitude, longitude |
| mainImage | string | URL to Cloud Storage |
| images | array\<string\> | Gallery URLs |
| videos | array\<string\> | Gallery URLs |
| phone | string | |
| email | string | |
| website | string | |
| openingHours | map \| string \| null | Structured per-day hours, `'by_appointment'`, or null |
| price | string \| null | Free-text price info |
| kashrutCertUrl | string \| null | Kashrut certificate image URL (restaurants only) |
| menuUrl | string \| null | Menu image URL (restaurants only) |
| facebook | string \| null | Facebook page URL |
| categoryId | string | Reference to `categories` |
| subcategoryIds | array\<string\> | Reference to `subcategories` for per-category filters |
| businessId | string \| null | Reference to `businesses` |
| active | boolean | |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

### `clicks` Collection

Top-level collection (not a subcollection) to enable efficient analytics queries across all POIs and categories.

| Field | Type | Notes |
|---|---|---|
| poiId | string | Reference to `points_of_interest` |
| categoryId | string | Denormalized from POI for fast category analytics |
| timestamp | Timestamp | |

### `icons` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | Display label for the icon |
| path | string | Cloud Storage path e.g. `icons/hotel.png` — URL derived at runtime |
| createdAt | Timestamp | |

### `categories` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | e.g. "Hotels", "Restaurants" |
| color | string | Hex color e.g. `#FF5733` |
| iconId | string \| null | Reference to `icons` collection |
| iconUrl | string \| null | Denormalized icon URL for fast reads |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

### `subcategories` Collection

Per-category refinement filters. AND-across-groups, OR-within-group, scoped to the POI's category.

| Field | Type | Notes |
|---|---|---|
| categoryId | string | Reference to `categories` |
| name | string | e.g. "כשר", "זול", "בוטיק" |
| group | string \| null | Free-text group name (e.g. "כשרות", "מחיר"); enables AND-across-groups logic; null = ungrouped |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

### `businesses` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | |
| contactEmail | string | |
| associatedUserIds | array\<string\> | Firebase Auth UIDs |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

### `users` Collection

| Field | Type | Notes |
|---|---|---|
| email | string | |
| displayName | string \| null | |
| role | string | "admin", "content_manager", "business_user", "standard_user" |
| businessRef | DocumentReference \| null | Reference to `businesses` if business user |
| createdAt | Timestamp | |
| lastLoginAt | Timestamp | |

## 5. Key Data Flows

- Frontend fetches active POIs from Firestore and displays them on Google Maps. No POIs are shown until at least one category is selected. Client-side filtering applies: category (required), per-category subcategory filters (AND-across-groups, OR-within-group), and text search. When a user clicks a POI, details are displayed and a click document is written to the top-level `clicks` collection client-side.
- Admin dashboard authenticates via Firebase Auth. CRUD operations on POIs, categories, subcategories, and businesses are performed directly on Firestore, with Security Rules enforcing admin privileges.
- Business dashboard authenticates via Firebase Auth. Security Rules ensure a business user can only read/write POIs where their UID is referenced in `businessId`.

## 6. Scalability & Security

- All core Firebase services scale automatically with demand, supporting growth from 100 to 1000+ concurrent users without manual intervention.
- **Authentication:** Firebase Authentication provides robust user identity management.
- **Authorization:** Firebase Security Rules enforce granular access control across all roles.
- **Network:** All communication secured via HTTPS.

## 7. Future Enhancements

- React Native mobile app (iOS & Android)
- Trip Planning Module
- AI-powered trip suggestions (via Cloud Functions, potentially GenKit)
- Scale testing and optimization for 1000+ concurrent users
