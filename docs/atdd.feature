# Click Bateva - Acceptance Tests (Gherkin)

# =============================================================================
# 2.1. User-Facing Map Application (Web)
# =============================================================================

Feature: Display Points of Interest on a Map
  As a user
  I want to see a map of Israel
  So that I can explore tourism points of interest

  Scenario: User views the map of Israel
    Given the user navigates to the application
    When the map loads successfully
    Then a Google Map of Israel is displayed, centered appropriately
    And no POI markers are visible on the map until a category is selected

Feature: Filter POIs by Category
  As a user
  I want to filter POIs by category
  So that I can find relevant points of interest

  Scenario: No POIs shown until a category is selected
    Given the user navigates to the application
    When the map loads successfully
    Then no POI markers are visible on the map
    And the sidebar/bottom sheet shows the category grid for selection

  Scenario: User filters POIs to find hotels
    Given the map is displayed with no POIs (no category selected yet)
    And filter options for Categories are available in the sidebar/bottom sheet
    When the user selects "מלונות" from the category grid
    Then only POIs categorized as "מלונות" become visible on the map
    And POIs not categorized as "מלונות" remain hidden

Feature: Filter POIs by Subcategory (Per-Category Refinements)
  As a user
  I want to refine my POI search with subcategory filters
  So that I can narrow down results within a category

  Scenario: Subcategory filter is hidden when no category is selected
    Given the user has not selected any category
    Then the subcategory filter section is not displayed in the sidebar

  Scenario: Subcategory section auto-expands for a single selected category
    Given the map is displayed and no category is selected
    When the user selects exactly one category (e.g., "מסעדות")
    Then the "סינון מפורט" section auto-expands and shows subcategory pills for that category

  Scenario: Subcategory sections are collapsed when multiple categories are selected
    Given the user has selected two categories (e.g., "מסעדות" and "מלונות")
    Then the "סינון מפורט" section shows both category names collapsed
    When the user clicks a category name header
    Then that category's subcategory pills expand

  Scenario: Subcategory filter is scoped to each POI's category
    Given the user has selected "מסעדות" and "טיולים" from the category grid
    And the user has selected "כשר" subcategory under "מסעדות"
    Then all POIs categorized as "טיולים" remain visible regardless of kashrut subcategory
    And only "מסעדות" POIs with the "כשר" subcategory remain visible

  Scenario: AND-across-groups, OR-within-group subcategory logic
    Given the user has selected "מסעדות"
    And the "כשרות" group has options "כשר" and "כשר למהדרין"
    And the "מחיר" group has options "זול" and "בינוני"
    When the user selects "כשר" from "כשרות" and "זול" from "מחיר"
    Then only "מסעדות" POIs that match both (כשר OR כשר למהדרין) AND (זול) remain visible

  Scenario: Deselecting a category clears its subcategory selections
    Given the user has selected "מסעדות" and chosen "כשר" as a subcategory
    When the user deselects "מסעדות" from the category grid
    Then the "כשר" subcategory is automatically cleared from the active filter

Feature: View Detailed POI Information
  As a user
  I want to view details about a point of interest
  So that I can learn more and plan my visit

  Scenario: User clicks on a POI marker
    Given a POI marker is visible on the map
    When the user clicks on the POI marker
    Then a detail panel appears with the POI's information
    And the panel displays the POI's Name, Description, Images/Videos, Phone, Email, and Website Link
    And the click is registered for tracking purposes

# =============================================================================
# 2.2. Admin Dashboard (Web)
# =============================================================================

Feature: Admin Login and Logout
  As an admin
  I want to securely access the admin dashboard
  So that I can manage the application

  Scenario: Admin successfully logs in
    Given the admin navigates to the Admin Dashboard login page
    When the admin enters valid admin credentials (email/password)
    And clicks the "Login" button
    Then the admin is authenticated and redirected to the Admin Dashboard home page

  Scenario: Admin successfully logs out
    Given the admin is logged into the Admin Dashboard
    When the admin clicks the "Logout" button
    Then the admin is logged out and redirected to the Admin Dashboard login page

Feature: Manage Points of Interest (CRUD)
  As an admin
  I want to create, edit, and delete POIs
  So that I can maintain the tourism content

  Scenario: Admin adds a new POI by clicking on the map
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Manage POIs" section and clicks "Add New POI"
    And the POI form displays an interactive map
    When the admin clicks a location on the map
    Then a pin is placed at the clicked location
    And the coordinates are automatically populated
    When the admin fills in all required fields and submits
    Then the new POI is successfully saved to the database with the selected coordinates
    And the new POI becomes visible on the user-facing map application

  Scenario: Admin adds a new POI by entering an address
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Manage POIs" section and clicks "Add New POI"
    And the POI form displays an interactive map and an address input field
    When the admin types an address into the address field
    Then the map automatically pans to the resolved location and places a pin
    And the coordinates are automatically populated
    When the admin fills in all required fields and submits
    Then the new POI is successfully saved to the database with the geocoded coordinates
    And the new POI becomes visible on the user-facing map application

  Scenario: Admin edits an existing POI
    Given the admin is logged into the Admin Dashboard
    When the admin selects an existing POI for editing
    And modifies its Name, Description, Category, Subcategories, or other details
    And the admin saves the changes
    Then the POI's details are updated in the database
    And the updated details are immediately reflected on the user-facing map application

  Scenario: Admin deletes a POI
    Given the admin is logged into the Admin Dashboard
    When the admin selects an existing POI and confirms deletion
    Then the POI is removed from the database
    And the POI is no longer visible on the user-facing map application

Feature: Manage Icons
  As an admin
  I want to upload and manage icons
  So that I can assign them to categories

  Scenario: Admin uploads a new icon
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Manage Icons" page
    And uploads an image file as a new icon with an optional name
    Then the icon is stored in Cloud Storage
    And the icon appears in the icon library for category assignment

  Scenario: Admin deletes an icon
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Manage Icons" page
    And deletes an existing icon
    Then the icon is removed from Cloud Storage
    And the icon is no longer available in the icon selection dropdown

Feature: Manage Categories (CRUD)
  As an admin
  I want to create and manage POI categories
  So that POIs can be organized and filtered

  Scenario: Admin adds a new Category with an icon
    Given the admin is logged into the Admin Dashboard
    And at least one icon exists in the icon library
    When the admin navigates to the "Manage Categories" section and adds a new category name
    And selects an icon from the icon dropdown
    Then the new category is saved with the selected icon
    And it is available for selection when creating or editing POIs

  Scenario: Admin adds a new Category without an icon
    Given the admin is logged into the Admin Dashboard
    When the admin adds a new category name without selecting an icon
    Then the new category is saved and available for selection when creating or editing POIs

Feature: Manage Subcategories (CRUD)
  As an admin
  I want to create and manage subcategories
  So that users can filter POIs with finer granularity

  Scenario: Admin adds a new subcategory for a category
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Subcategories" section
    And clicks "Add New Subcategory"
    And selects a category and enters a subcategory name
    And optionally types a group name with autocomplete from existing groups
    Then the subcategory is saved and linked to that category
    And it appears as a filter pill in the user-facing app when that category is selected

  Scenario: Admin edits a subcategory
    Given the admin is on the Subcategories page
    When the admin clicks edit on an existing subcategory and changes its name or group
    Then the updated subcategory is saved and reflected in the user-facing filter

  Scenario: Admin deletes a subcategory
    Given the admin is on the Subcategories page
    When the admin clicks delete on a subcategory and confirms
    Then the subcategory is removed from Firestore
    And it no longer appears in the user-facing filter or POI edit form

  Scenario: Admin assigns subcategories to a POI
    Given the admin is editing a POI with category "מסעדות"
    When the POI edit drawer opens
    Then subcategory checkboxes for "מסעדות" are shown
    When the admin checks "כשר" and saves
    Then the POI's subcategoryIds field is updated in Firestore
    And the POI appears when a user filters by "כשר" under "מסעדות"

  Scenario: Subcategory checkboxes change when category changes
    Given the admin is editing a POI
    When the admin changes the category from "מסעדות" to "מלונות"
    Then the subcategory checkboxes update to show "מלונות" subcategories
    And previously selected "מסעדות" subcategory IDs are cleared

Feature: Track POI Click Analytics
  As an admin
  I want to view click analytics for POIs
  So that I can understand user engagement

  Scenario: Admin views POI click report
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Click Tracking" page
    Then a list of all POIs is displayed
    And for each POI, its total click count is visible
    And the timestamp of each click is also available for review

Feature: Create New Business Account
  As an admin
  I want to create business accounts
  So that business owners can manage their own POIs

  Scenario: Admin successfully creates a new business account
    Given the admin is logged into the Admin Dashboard
    When the admin navigates to the "Manage Businesses" section
    And clicks "Add New Business Account"
    And enters required business details (Business Name, Contact Email, initial user credentials)
    And the admin submits the form
    Then a new business record is created in the database
    And an associated business user account is created in Firebase Authentication
    And the new business is available to be linked to POIs

# =============================================================================
# 2.3. Business Dashboard (Web)
# =============================================================================

Feature: Business Login and Logout
  As a business user
  I want to securely access my business dashboard
  So that I can manage my assigned POIs

  Scenario: Business user successfully logs in
    Given the business user navigates to the Business Dashboard login page
    When the business user enters valid business credentials (email/password)
    And clicks the "Login" button
    Then the business user is authenticated and redirected to their Business Dashboard

  Scenario: Business user successfully logs out
    Given the business user is logged into the Business Dashboard
    When the business user clicks the "Logout" button
    Then the business user is logged out and redirected to the Business Dashboard login page

Feature: Business Edits Their Assigned POIs
  As a business user
  I want to edit my assigned POIs
  So that I can keep my business information up to date

  Scenario: Authenticated business user edits their POI
    Given a business user is logged into the Business Dashboard
    When the business user navigates to their assigned POI(s)
    And modifies editable fields (Description, Images, Phone, Email, Website)
    And the business user saves the changes
    Then the POI's details are updated in the database
    And the updated details are immediately reflected on the user-facing map application
    And the business user cannot edit POIs not assigned to them
