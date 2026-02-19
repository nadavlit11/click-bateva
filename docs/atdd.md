# Click Bateva - Acceptance Test-Driven Development (ATDD)

## 1. Introduction

This document outlines the key features and their acceptance criteria for the Minimum Viable Product (MVP) of the Click Bateva tourism application. It serves to align stakeholders on the core functionalities before development commences. The MVP focuses on a map-based display of points of interest (POIs) with filtering, detailed views, and administrative/business management capabilities.

## 2. Core Features & Acceptance Criteria

### 2.1. User-Facing Map Application (Web)

#### Feature: Display Points of Interest (POIs) on a Map

**Scenario: User views the map of Israel.**
- Given the user navigates to the application.
- When the map loads successfully.
- Then a Google Map of Israel is displayed, centered appropriately.
- And all active Points of Interest (POIs) are visible as markers on the map.

#### Feature: Filter POIs by Category and Tags

**Scenario: User filters POIs to find hotels.**
- Given the map is displayed with multiple POIs.
- And filter options for Categories (e.g., "Hotels") and Tags (e.g., "Kosher") are available.
- When the user selects "Hotels" from the category filter.
- Then only POIs categorized as "Hotels" remain visible on the map.
- And POIs not categorized as "Hotels" are hidden.

**Scenario: User refines search with tags.**
- Given the map is displayed with filtered POIs (e.g., "Hotels").
- When the user additionally selects "Kosher" from the tags filter.
- Then only "Hotels" that also have the "Kosher" tag remain visible.

#### Feature: View Detailed POI Information

**Scenario: User clicks on a POI marker.**
- Given a POI marker is visible on the map.
- When the user clicks on the POI marker.
- Then a small popup (info window/modal) appears near the marker.
- And the popup displays the POI's Name, Description, Images/Videos, Phone, Email, and Website Link.
- And the click is registered for tracking purposes.

#### Feature: Conversations with Businesses (Cross-Device Sync)

**Scenario: Authenticated user starts a conversation about a POI.**
- Given the user is logged in to their account.
- And the user is viewing a POI detail popup.
- When the user clicks "Message Business" and sends a message.
- Then a new conversation document is created in Firestore under the `conversations` collection.
- And the message is stored in the `conversations/{id}/messages` subcollection.
- And the conversation is immediately visible in the user's conversation list.

**Scenario: User sees the same conversations on mobile that they started on desktop.**
- Given the user is logged in with the same account on both desktop and mobile.
- And the user previously created a conversation on desktop.
- When the user opens the conversations list on mobile.
- Then the same conversation thread is visible, including all messages sent from desktop.
- And the messages are in the correct chronological order.

**Scenario: User sees the same conversations on desktop that they started on mobile.**
- Given the user is logged in with the same account on both mobile and desktop.
- And the user previously created a conversation on mobile.
- When the user opens the conversations list on desktop.
- Then the same conversation thread is visible, including all messages sent from mobile.

**Scenario: Messages update in real time across devices.**
- Given the user has a conversation open on desktop.
- When a new message is sent from mobile on the same conversation.
- Then the new message appears on the desktop view without requiring a page refresh.

**Scenario: Unauthenticated user cannot access conversations.**
- Given the user is not logged in.
- When the user attempts to view or send a message.
- Then the user is prompted to log in first.
- And no conversation data is accessible.

---

### 2.2. Admin Dashboard (Web)

#### Feature: Admin Login and Logout

**Scenario: Admin successfully logs in.**
- Given the admin navigates to the Admin Dashboard login page.
- When the admin enters valid admin credentials (email/password).
- And clicks the "Login" button.
- Then the admin is authenticated and redirected to the Admin Dashboard home page.

**Scenario: Admin successfully logs out.**
- Given the admin is logged into the Admin Dashboard.
- When the admin clicks the "Logout" button.
- Then the admin is logged out and redirected to the Admin Dashboard login page.

#### Feature: Manage Points of Interest (CRUD)

**Scenario: Admin adds a new POI.**
- Given the admin is logged into the Admin Dashboard.
- When the admin navigates to the "Manage POIs" section and clicks "Add New POI".
- And fills in all required fields (Name, Description, Coordinates, Category, Tags, optional Images/Videos, Phone, Email, Website).
- When the admin submits the new POI.
- Then the new POI is successfully saved to the database.
- And the new POI becomes visible on the user-facing map application.

**Scenario: Admin edits an existing POI.**
- Given the admin is logged into the Admin Dashboard.
- When the admin selects an existing POI for editing.
- And modifies its Name, Description, Category, Tags, or other details.
- When the admin saves the changes.
- Then the POI's details are updated in the database.
- And the updated details are immediately reflected on the user-facing map application.

**Scenario: Admin deletes a POI.**
- Given the admin is logged into the Admin Dashboard.
- When the admin selects an existing POI and confirms deletion.
- Then the POI is removed from the database.
- And the POI is no longer visible on the user-facing map application.

#### Feature: Manage Categories and Tags (CRUD)

**Scenario: Admin adds a new Category.**
- Given the admin is logged into the Admin Dashboard.
- When the admin navigates to the "Manage Categories" section and adds a new category name.
- Then the new category is saved and available for selection when creating/editing POIs.

**Scenario: Admin adds a new Tag.**
- Given the admin is logged into the Admin Dashboard.
- When the admin navigates to the "Manage Tags" section and adds a new tag name.
- Then the new tag is saved and available for selection when creating/editing POIs.

#### Feature: Track POI Click Analytics

**Scenario: Admin views POI click report.**
- Given the admin is logged into the Admin Dashboard.
- When the admin navigates to the "Click Tracking" page.
- Then a list of all POIs is displayed.
- And for each POI, its total click count is visible.
- And the timestamp of each click is also available for review.

#### Feature: Create New Business Account

**Scenario: Admin successfully creates a new business account.**
- Given the admin is logged into the Admin Dashboard.
- When the admin navigates to the "Manage Businesses" section.
- And clicks "Add New Business Account".
- And enters required business details (e.g., Business Name, Contact Email, initial user credentials).
- When the admin submits the form.
- Then a new business record is created in the database.
- And an associated business user account is created in Firebase Authentication.
- And the new business is available to be linked to POIs.

---

### 2.3. Business Dashboard (Web)

#### Feature: Business Login and Logout

**Scenario: Business user successfully logs in.**
- Given the business user navigates to the Business Dashboard login page.
- When the business user enters valid business credentials (email/password).
- And clicks the "Login" button.
- Then the business user is authenticated and redirected to their Business Dashboard.

**Scenario: Business user successfully logs out.**
- Given the business user is logged into the Business Dashboard.
- When the business user clicks the "Logout" button.
- Then the business user is logged out and redirected to the Business Dashboard login page.

#### Feature: Business Edits Their Assigned POIs

**Scenario: Authenticated business user edits their POI.**
- Given a business user is logged into the Business Dashboard.
- When the business user navigates to their assigned POI(s).
- And modifies editable fields (e.g., Description, Images, Phone, Email, Website).
- When the business user saves the changes.
- Then the POI's details are updated in the database.
- And the updated details are immediately reflected on the user-facing map application.
- And the business user cannot edit POIs not assigned to them.
