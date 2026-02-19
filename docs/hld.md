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
|  | (NoSQL Database: POIs, Categories, Tags,    | |
|  |  Users, Businesses, Clicks)                 | |
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
- Purpose: Secure interface for administrators to manage all POI data, categories, tags, businesses, and review analytics
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
  - `categories`: Manages dynamically created categories
  - `tags`: Manages dynamically created tags
  - `users`: Stores user profiles and roles
  - `businesses`: Stores registered business profiles
  - `conversations`: Stores messaging threads between users and businesses
  - `points_of_interest/{poiId}/clicks`: Subcollection tracking click events (written client-side)
  - `conversations/{conversationId}/messages`: Subcollection of messages within a thread

**Cloud Storage for Firebase:**
- Role: Scalable object storage for images and videos associated with POIs
- Integration: Stores URLs/paths referenced within Firestore documents

**Firebase Authentication:**
- Role: User identity management for general users, administrators, and business users
- Provider: Email/Password
- Role management via Firebase Custom Claims (`admin`, `business_user`)

**Cloud Functions for Firebase:**
- Role: Serverless backend logic for data validation and any server-side processing
- Note: Click tracking is handled client-side for MVP simplicity

**Firebase Hosting:**
- Role: Fast, secure hosting for all web applications via a global CDN

**Google Analytics for Firebase:**
- Role: Usage statistics, user engagement, and custom event tracking

**Firebase Security Rules:**
- Role: Enforces data access control on Firestore and Cloud Storage
- Granularity:
  - Public read for active POI data
  - Authenticated read/write for user-specific data
  - Admin read/write access to all collections
  - Business users limited to read/write their own assigned POIs
  - Conversations: read/write limited to authenticated users listed in `participants`; messages within a conversation readable only by participants

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
| categoryId | string | Reference to `categories` |
| tags | array\<string\> | Tag IDs or names |
| businessId | string \| null | Reference to `businesses` |
| active | boolean | |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

**Subcollection: `points_of_interest/{poiId}/clicks`**

| Field | Type | Notes |
|---|---|---|
| timestamp | Timestamp | |
| userId | string \| null | Firebase Auth UID if authenticated |

### `categories` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | e.g. "Hotels", "Restaurants" |
| icon | string | Optional, URL or icon identifier |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |

### `tags` Collection

| Field | Type | Notes |
|---|---|---|
| name | string | e.g. "Kosher", "Open at Night" |
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
| role | string | "admin", "business_user", "standard_user" |
| businessRef | DocumentReference \| null | Reference to `businesses` if business user |
| createdAt | Timestamp | |
| lastLoginAt | Timestamp | |

### `conversations` Collection

Stores messaging threads between authenticated users and businesses about specific POIs.

| Field | Type | Notes |
|---|---|---|
| participants | array\<string\> | Firebase Auth UIDs of all participants |
| poiId | string \| null | Reference to `points_of_interest` if POI-specific |
| businessId | string \| null | Reference to `businesses` if business conversation |
| createdAt | Timestamp | |
| updatedAt | Timestamp | Updated on each new message |
| lastMessagePreview | string | Truncated preview of last message |

**Subcollection: `conversations/{conversationId}/messages`**

| Field | Type | Notes |
|---|---|---|
| senderId | string | Firebase Auth UID |
| text | string | Message content |
| timestamp | Timestamp | |
| readBy | array\<string\> | UIDs that have read this message |

## 5. Key Data Flows

- Frontend fetches active POIs (optionally filtered by category/tags) from Firestore and displays them on Google Maps. When a user clicks a POI, details are displayed and a click document is written directly to the `clicks` subcollection client-side.
- Admin dashboard authenticates via Firebase Auth. CRUD operations on POIs, categories, tags, and businesses are performed directly on Firestore, with Security Rules enforcing admin privileges.
- Business dashboard authenticates via Firebase Auth. Security Rules ensure a business user can only read/write POIs where their UID is referenced in `businessId`.
- **Conversations**: Authenticated users initiate conversations tied to a POI or business. Messages are written to the `conversations/{id}/messages` subcollection in Firestore. Because all clients (web and future mobile) share the same Firestore backend and use real-time listeners (`onSnapshot`), conversations are **automatically synchronized across all devices** where the user is logged in. A user who starts a conversation on desktop will see the same thread on mobile and vice versa.

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
