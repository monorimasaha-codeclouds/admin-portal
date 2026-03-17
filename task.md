# Admin Portal - Task Breakdown

## Phase 1: Environment & Project Setup
- [x] Install Node.js and npm
- [x] Initialize Next.js project with Tailwind CSS
- [x] Set up Node.js backend (Express) alongside Next.js
- [x] Set up MySQL database and schema

## Phase 2: Database Design
- [x] Define `users` table for authentication
- [x] Define `projects` table (14 fields + status)
- [x] Define `test_reports` table (foreign key to projects)

## Phase 3: Backend API Development
- [x] Setup Express server with CORS & basic routes
- [x] JWT Authentication & bcrypt password hashing
- [x] Project insertion route with validation
- [x] Project listing & detail retrieval routes

## Phase 4: Frontend UI Development
- [x] Global design system (Dark theme Tailwind v4)
- [x] Login & Registration pages
- [x] Add Project form page (all required fields)
- [x] Projects listing page with data table
- [x] Project detail view (future: download report button)
- [x] Create default user setup script ([init-db-with-user.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/scripts/init-db-with-user.js))

## Phase 5: Integration & Testing
- [x] Connect frontend to backend APIs
- [x] End-to-end flow testing via browser
- [x] Verify all required field validation

## Phase 6: User Management Module
- [x] DB Schema: Add `role` ([admin](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/middleware/adminAuth.js#1-8)/`user`) and `status` (`active`/`inactive`) to `users` table
- [x] DB Schema: Update default user script to insert user as [admin](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/middleware/adminAuth.js#1-8)
- [x] Backend: Update Login to prevent inactive users from logging in and include `role` in JWT
- [x] Backend: Create [middleware/adminAuth.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/middleware/adminAuth.js) to protect admin-only routes
- [x] Backend: Create [routes/users.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/routes/users.js) with CRUD (List, Add, Edit, Delete, Toggle Status)
- [x] Frontend: Update [lib/api.js](file:///home/codeclous-monorimas/Documents/admin-portal/frontend/src/lib/api.js) with Users endpoints
- [x] Frontend: Update `AuthContext` to store user role
- [x] Frontend: Update [Sidebar.js](file:///home/codeclous-monorimas/Documents/admin-portal/frontend/src/components/Sidebar.js) to show "User Management" only to admins
- [x] Frontend: Create Users Listing Page ([/users/page.js](file:///home/codeclous-monorimas/Documents/admin-portal/frontend/src/app/users/page.js)) with DataTable and Actions
- [x] Frontend: Create Add/Edit User Modals/Pages
- [x] Frontend: Implement Delete and Toggle Status functionality

## Phase 7: Multiple Project Links & Test Cards (Current)
- [/] DB Schema: Create `project_links` and `project_cards` tables in [schema.sql](file:///home/codeclous-monorimas/Documents/admin-portal/database/schema.sql)
- [/] DB Schema: Create a migration script to remove old fields from `projects` and add new tables
- [x] Backend: Update [routes/projects.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/routes/projects.js) POST method to accept JSON arrays and perform multi-table insertion
- [x] Backend: Update [routes/projects.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/routes/projects.js) GET methods to fetch joined dependent records (links, cards)
- [x] Frontend: Update `Add Project` UI with dynamic input lists for links
- [x] Frontend: Update `Add Project` UI with multi-select dropdown for standard cards + custom card manual entry
- [x] Frontend: Update `Project Detail` UI to loop over `project.links` and `project.cards` arrays
- [x] Frontend: Update `Projects Listing` UI to handle the removal of the singular `project_url` property

## Phase 8: Auto Generate Data (Current)
- [x] Frontend: Implement random data generators (Names, Emails, Phones, Addresses)
- [x] Frontend: Add "Auto Generate" button to Personal Information section
- [x] Frontend: Add "Auto Generate" button to Address section
- [x] Frontend: Ensure Email generation is unique per click
- [x] Verification: Test data generation flow in browser
- [x] Bug Fix: Resolved `TypeError` on Dashboard page (removed stale `project_url` reference)

## Phase 9: Automated Testing & PDF Reports (Current)
- [x] Backend: Install `puppeteer` package.
- [x] Backend: Create HTML template representing the `Reference test report` layout.
- [x] Backend: Create [generate_report.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/scripts/generate_report.js) script to automate UI capture (Desktop/Mobile), verify HTTPS/Robots.txt.
- [x] Backend: Incorporate the Sample Offer Link into the automated script.
- [x] Verification: Run script and verify output `generated_report.pdf`.

## Phase 10: Multi-Device Test Reports & PDF Download (Current)
- [x] Backend: Refactor [generate_report.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/scripts/generate_report.js) into a utility module [utils/pdfGenerator.js](file:///home/codeclous-monorimas/Documents/admin-portal/backend/src/utils/pdfGenerator.js) that can be imported by API routes.
- [x] Backend: Modify Puppeteer automation to capture multiple viewports (Desktop, iPad Air, iPhone 14, Android S26) and pass paths to EJS.
- [x] Backend: Update [report_template.ejs](file:///home/codeclous-monorimas/Documents/admin-portal/backend/scripts/report_template.ejs) to render these screenshots inline underneath the respective device sections, matching the Reference PDF layout.
- [x] Backend: Implement `GET /api/reports/download/:projectId` that finds the project's url, calls the generator, and sends the PDF as an attachment.
- [x] Frontend: Add "Download PDF" button to the actions column in [src/app/projects/page.js](file:///home/codeclous-monorimas/Documents/admin-portal/frontend/src/app/projects/page.js).
- [/] Verification: Test the entire flow from the frontend clicking "Download PDF" to the browser rendering the downloaded file.
