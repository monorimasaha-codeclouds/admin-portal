# Admin Portal — Walkthrough

## What Was Built

A full-stack admin portal with **Next.js + Tailwind CSS** frontend, **Node.js/Express** backend, and **MySQL** database.

### Features Implemented
- ✅ User registration & login with JWT authentication
- ✅ Add project form with **14 required fields** (URL, name, personal info, address, payment card)
- ✅ Client-side validation (URL, email, phone, card number, CVV)
- ✅ Projects listing page with search/filter
- ✅ Project detail page with masked card info
- ✅ AuthGuard (auto-redirect to login for protected routes)
- ✅ Default user: `monorima.saha@codeclouds.co.in` / `123456`
- ✅ Test reports placeholder (for future PDF generation)

---

## Verified UI

````carousel
![Login page — dark glassmorphism theme with gradient accents](/home/codeclous-monorimas/.gemini/antigravity/brain/9e2f2573-29ad-4e82-a9c7-8d45355323cc/admin_portal_login_page_1773237782392.png)
<!-- slide -->
![Register page — full name, email, password, confirm password](/home/codeclous-monorimas/.gemini/antigravity/brain/9e2f2573-29ad-4e82-a9c7-8d45355323cc/register_page_1773237863826.png)
````

---

## Project Structure

```
admin-portal/
├── database/
│   └── schema.sql              # MySQL tables: users, projects, test_reports
├── backend/
│   ├── .env                    # DB credentials + JWT secret
│   ├── package.json
│   └── src/
│       ├── index.js            # Express entry point (port 5000)
│       ├── config/db.js        # MySQL2 connection pool
│       ├── middleware/auth.js   # JWT verification
│       └── routes/
│           ├── auth.js         # POST /register, /login
│           ├── projects.js     # CRUD: GET/POST/DELETE /projects
│           └── reports.js      # Placeholder for report download
│       └── scripts/
│           └── init-db-with-user.js # Automates DB & User setup
└── frontend/
    ├── package.json
    └── src/
        ├── lib/
        │   ├── api.js          # API client with JWT headers
        │   └── AuthContext.js  # React auth context + provider
        ├── components/
        │   ├── Sidebar.js      # Navigation sidebar
        │   └── AuthGuard.js    # Route protection wrapper
        └── app/
            ├── globals.css     # Dark theme design system
            ├── layout.js       # Root layout with AuthProvider
            ├── page.js         # Redirect to /dashboard or /login
            ├── login/page.js
            ├── register/page.js
            ├── dashboard/
            │   ├── layout.js   # AuthGuard + Sidebar wrapper
            │   └── page.js     # Stats grid + recent projects
            └── projects/
                ├── layout.js   # AuthGuard + Sidebar wrapper
                ├── page.js     # Listing with search/delete
                ├── add/page.js # 14-field form with validation
                └── [id]/page.js # Detail view
```

---

## How to Run

### 1. Set up MySQL
You must have MySQL server installed. Ensure it's running.

```bash
# Option A: Run the automation script (recommended after installing MySQL)
cd backend && node scripts/init-db-with-user.js

# Option B: Manual import
mysql -u root -p < database/schema.sql
```

### 2. Configure backend
Edit [backend/.env](file:///home/codeclous-monorimas/Documents/admin-portal/backend/.env) with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=admin_portal
JWT_SECRET=your_secret_key
```

### 3. Start backend
```bash
cd backend && npm install && npm run dev
# Runs on http://localhost:5000
```

### 4. Start frontend
```bash
cd frontend && npm install && npm run dev
# Runs on http://localhost:3000
```

---

## Validation Results

| Check | Status |
|-------|--------|
| Next.js build compiles | ✅ All 7 routes compiled |
| Login page renders | ✅ Verified in browser |
| Register page renders | ✅ Verified in browser |
| AuthGuard redirects | ✅ /projects/add → /login when unauthenticated |
| Backend API structure | ✅ All routes + middleware created |
| Required field validation | ✅ Client-side + server-side |
| CSS import order | ✅ Fixed (fonts before Tailwind) |

> [!NOTE]
> **MySQL must be running** with the schema imported before the backend can accept requests. Update [backend/.env](file:///home/codeclous-monorimas/Documents/admin-portal/backend/.env) with your actual MySQL password.
