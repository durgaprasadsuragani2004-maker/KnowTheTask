# KnowTheTask

> **Project & Team Management Platform**

KnowTheTask is an enterprise-ready, full-stack project and team management platform built with React.js, Node.js, Express.js, and PostgreSQL. It enforces strict Role-Based Access Control (RBAC), bcrypt password hashing, and verified database role validation at the authentication layer.

---

## Table of Contents
1. [Project Description](#1-project-description)
2. [Main Features](#2-main-features)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Installation Instructions](#6-installation-instructions)
7. [Environment Variables](#7-environment-variables)
8. [Database Setup & Seeding](#8-database-setup--seeding)
9. [Running the Application](#9-running-the-application)
10. [API Documentation (Swagger / OpenAPI)](#10-api-documentation-swagger--openapi)
11. [Testing & Verification](#11-testing--verification)
12. [Deployment Guidelines](#12-deployment-guidelines)
13. [Screenshots](#13-screenshots)
14. [Future Improvements](#14-future-improvements)
15. [License](#15-license)

---

## 1. Project Description

KnowTheTask simplifies organizational project tracking and team collaboration through a structured, multi-tier management workflow. It eliminates communication silos and unauthorized access by providing tailored dashboards, Kanban task boards, threaded discussions, real-time activity auditing, in-app notifications, and visual analytics for three key user tiers: **Admin**, **Project Manager**, and **Team Member**.

The platform is designed with a **Dark Blue (`#0a192f`) and White (`#ffffff`)** SaaS interface that prioritizes operational clarity, fast navigation, responsive layout across all device viewports, and zero visual clutter.

---

## 2. Main Features

- **Strict Role-Based Authentication:** Direct role-selection login with backend database verification against spoofing.
- **Project Lifecycle Management:** Create, update, view, and delete projects with manager assignments, member rosters, date validation, and progress tracking.
- **Active User Integrity Enforcement:** Deactivated users are blocked from new assignments across projects, tasks, and team rosters, while historical contributions are preserved with visual status badges.
- **Interactive Kanban Board:** Drag-and-drop task status transitions (`TODO` ➔ `IN_PROGRESS` ➔ `REVIEW` ➔ `COMPLETED`).
- **Threaded Task Comments:** Contextual team discussions on individual tasks with chronological auditing.
- **Audit Activity Logs:** Automatically logged events tracking task updates, status transitions, and team actions.
- **Notification System:** In-app unread notification bell with mark-as-read and mark-all-read capabilities.
- **Live Visual Analytics:** Interactive charts powered by Recharts (Tasks by Status, Tasks by Priority, Projects Breakdown, and Velocity/Health indicators).
- **Full-Text Search, Multi-Filter & Pagination:** Instant keyword search and multi-criteria filtering across projects, tasks, members, and audit logs with responsive pagination controls.
- **Interactive OpenAPI / Swagger Documentation:** Built-in interactive API explorer and complete REST documentation.

---

## 3. User Roles & Permissions

KnowTheTask implements strict, backend-enforced Role-Based Access Control (RBAC):

| Feature / Action | Admin | Project Manager | Team Member |
|---|:---:|:---:|:---:|
| **Login Verification** | Verified against DB | Verified against DB | Verified against DB |
| **System Dashboard** | Organization-wide metrics | Managed projects metrics | Assigned tasks metrics |
| **Team Management** | View all, Search, Filter, Deactivate / Reactivate | View assigned project members | View project peers only |
| **Project Creation** | Full access | Allowed | Restricted |
| **Project Management** | All projects | Managed projects only | Read-only assigned |
| **Task Management** | All tasks | Managed projects' tasks | Assigned tasks only |
| **Task Status Progression** | Full access | Full access | Assigned tasks only |
| **Comments & Discussions** | Full access | Full access | Authorized tasks only |
| **Activity History** | Global audit log | Managed projects audit | Authorized tasks audit |
| **Notifications** | Personal notifications | Personal notifications | Personal notifications |
| **Analytics Dashboard** | Organization-wide metrics | Managed projects metrics | Assigned tasks metrics |
| **Admin Data Visibility** | Full visibility | Excluded (cannot view Admins) | Excluded (cannot view Admins) |

### Demo Credentials (Pre-seeded in PostgreSQL)

| Role | Email | Password | Primary Scope |
|---|---|---|---|
| **Admin** | `admin@knowthetask.com` | `Admin@123` | Complete organization administration & user management |
| **Project Manager** | `manager@knowthetask.com` | `Manager@123` | Project delivery, team assignments & task tracking |
| **Team Member** | `member@knowthetask.com` | `Member@123` | Task execution, status progression & comments |

---

## 4. Technology Stack

- **Frontend:**
  - [React.js](https://react.dev/) (v18.3.1)
  - [Vite](https://vitejs.dev/) (v6.1.0)
  - [Tailwind CSS](https://tailwindcss.com/) (v3.4.17)
  - [Lucide React](https://lucide.dev/) (Icons)
  - [Recharts](https://recharts.org/) (Analytics & Data Visualization)
  - [Axios](https://axios-http.com/) (HTTP Client)
  - [React Router DOM](https://reactrouter.com/) (v6.28.2)

- **Backend:**
  - [Node.js](https://nodejs.org/) (v18+)
  - [Express.js](https://expressjs.com/) (v4.21.2)
  - [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (v2.4.3 - Password Hashing)
  - [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (v9.0.2 - JWT Auth)
  - [express-validator](https://express-validator.github.io/) (v7.2.1 - Request Validation)
  - [CORS](https://github.com/expressjs/cors) (Cross-Origin Resource Sharing)

- **Database:**
  - [PostgreSQL](https://www.postgresql.org/) (pg v8.13.3)
  - Embedded PostgreSQL fallback (`embedded-postgres` v18.4.0)

- **Authentication & Security:**
  - JSON Web Tokens (JWT) with configurable expiration
  - Cryptographic Salt Hashing (bcrypt, 10 rounds)
  - SQL Injection Prevention (Parameterized Queries)
  - Cross-Site Scripting (XSS) Sanitization

- **API Architecture & Documentation:**
  - RESTful Architecture
  - OpenAPI 3.0 / Swagger UI ([http://localhost:5001/api/docs](http://localhost:5001/api/docs))

- **Version Control:**
  - Git / GitHub

---

## 5. Project Structure

```
KnowTheTask/
├── client/                               # Frontend Single Page Application (React + Vite)
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── components/                   # Reusable components
│   │   │   ├── Navbar.jsx                # Top navigation with user badge & notification bell
│   │   │   ├── Sidebar.jsx               # Role-aware sidebar navigation links
│   │   │   ├── StatCard.jsx              # Reusable metric card with trend indicators
│   │   │   ├── Pagination.jsx            # Reusable pagination component
│   │   │   └── ProtectedRoute.jsx        # Route authorization guard
│   │   ├── context/                      # React Context providers
│   │   │   └── AuthContext.jsx           # Global user authentication & role state
│   │   ├── hooks/                        # Custom React hooks (useAuth)
│   │   ├── layouts/                      # Layout wrappers
│   │   │   └── DashboardLayout.jsx       # Standard dashboard shell with sidebar & header
│   │   ├── pages/                        # View pages
│   │   │   ├── LoginPage.jsx             # Role-selection login interface
│   │   │   ├── DashboardPage.jsx         # Role-based dashboard with KPIs
│   │   │   ├── ProjectsPage.jsx          # Project directory, filters & modals
│   │   │   ├── ProjectDetailsPage.jsx    # Project overview, members & tasks
│   │   │   ├── TasksPage.jsx             # Task list & Kanban drag-and-drop board
│   │   │   ├── TaskDetailsPage.jsx       # Task modal/detail with comments & activity log
│   │   │   ├── UsersPage.jsx             # Admin member management (activate/deactivate)
│   │   │   ├── NotificationsPage.jsx     # User notification center
│   │   │   └── AnalyticsPage.jsx         # Interactive charts & velocity analytics
│   │   ├── routes/                       # Routing configuration
│   │   │   └── AppRoutes.jsx             # Route definitions with access controls
│   │   ├── services/                     # API communication layer
│   │   │   ├── api.js                    # Axios instance with auth interceptor
│   │   │   ├── authService.js            # Authentication endpoints
│   │   │   └── dataService.js            # Projects, tasks, members, comments, logs
│   │   ├── utils/                        # Formatting utilities (roles, dates, statuses)
│   │   ├── App.jsx                       # Root application component
│   │   ├── index.css                     # Tailwind CSS directives & custom styling
│   │   └── main.jsx                      # Vite entry point
│   ├── index.html                        # HTML template
│   ├── package.json                      # Client dependencies & scripts
│   ├── tailwind.config.js                # Tailwind theme customization
│   └── vite.config.js                    # Vite bundler configuration & proxy
│
├── server/                               # Backend REST API Server (Node.js + Express)
│   ├── src/
│   │   ├── config/                       # Database connection configuration
│   │   │   └── db.js                     # PostgreSQL connection pool with embedded fallback
│   │   ├── controllers/                  # Request handlers
│   │   │   ├── authController.js         # Login, verification & user profiles
│   │   │   ├── projectController.js      # Project CRUD & team assignments
│   │   │   ├── taskController.js         # Task CRUD, status updates & assignments
│   │   │   ├── userController.js         # User directory & deactivation/reactivation
│   │   │   ├── commentController.js      # Task comments & discussion threads
│   │   │   ├── activityController.js     # Audit logging retrieval
│   │   │   ├── notificationController.js # In-app notifications & read states
│   │   │   └── analyticsController.js    # Metric aggregations for Recharts
│   │   ├── middleware/                   # Express middleware
│   │   │   ├── authMiddleware.js         # JWT verification & req.user attachment
│   │   │   ├── roleMiddleware.js         # Role-based endpoint guards
│   │   │   ├── validatorMiddleware.js    # express-validator result handler
│   │   │   └── errorHandler.js           # Centralized HTTP error handler
│   │   ├── routes/                       # Express route modules
│   │   │   ├── authRoutes.js             # /api/auth
│   │   │   ├── projectRoutes.js          # /api/projects
│   │   │   ├── taskRoutes.js             # /api/tasks
│   │   │   ├── userRoutes.js             # /api/users
│   │   │   ├── commentRoutes.js          # /api/comments
│   │   │   ├── activityRoutes.js         # /api/activity
│   │   │   ├── notificationRoutes.js     # /api/notifications
│   │   │   ├── analyticsRoutes.js        # /api/analytics
│   │   │   └── docsRoutes.js             # /api/docs (OpenAPI Swagger UI)
│   │   ├── utils/                        # Helper scripts & database seeders
│   │   │   ├── dbSetup.js                # DB schema & seed execution script
│   │   │   └── tokenUtils.js             # JWT generation & verification
│   │   ├── validators/                   # express-validator schemas
│   │   └── index.js                      # Express server entry point
│   ├── package.json                      # Server dependencies & scripts
│   └── .env.example                      # Server environment variable template
│
├── database/                             # Database DDL & Data Initialization
│   ├── schema.sql                        # PostgreSQL table creation & index definitions
│   ├── seed.sql                          # Initial seed data for development & testing
│   └── ER-DIAGRAM.md                     # Entity-Relationship diagram & schema documentation
│
├── docs/                                 # Project & Technical Documentation
│   ├── API_DOCUMENTATION.md              # REST API specification & schemas
│   ├── ARCHITECTURE.md                   # System architecture & security models
│   ├── PROJECT-DOCUMENTATION.md          # College / Academic project report
│   └── TEST-CASES.md                     # QA test case verification matrix
│
├── postman/                              # API Testing Collections
│   └── KnowTheTask.postman_collection.json # Ready-to-import Postman test suite
│
├── scripts/                              # Automated Test & Utility Scripts
│   ├── startDev.js                       # Concurrent server and client starter
│   ├── verifyPhase1.js                   # Phase 1 verification script
│   ├── testRoleVisibility.js             # RBAC visibility test suite
│   ├── testPhase2.js                     # Projects & tasks verification suite
│   ├── testPhase3.js                     # Members, Kanban, comments & notifications suite
│   └── testPhase4.js                     # Active user validation, search, pagination suite
│
├── .env.example                          # Root environment template
├── .gitignore                            # Git exclusion rules
├── package.json                          # Root orchestration package
└── README.md                             # Main documentation README
```

---

## 6. Installation Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14+ (Optional: Embedded PostgreSQL is bundled automatically for zero-config setups)
- **Git**: Installed and configured

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/KnowTheTask.git
   cd KnowTheTask
   ```

2. **Install all dependencies (Root, Server, and Client):**
   ```bash
   npm run install:all
   ```
   *Or install individually:*
   ```bash
   # Server dependencies
   cd server && npm install

   # Client dependencies
   cd ../client && npm install
   cd ..
   ```

---

## 7. Environment Variables

Create `.env` files from `.env.example` in both the root and `server` directories:

```bash
cp .env.example .env
cp .env.example server/.env
cp client/.env.example client/.env
```

### Server Configuration (`server/.env`):
```env
# Server Port
PORT=5001

# Allowed Frontend Client Origin for CORS
CLIENT_URL=http://localhost:5173

# PostgreSQL Database Connection URL
# Format: postgresql://<user>:<password>@<host>:<port>/<dbname>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/knowthetask

# JSON Web Token Secret (Use min. 32 characters in production)
JWT_SECRET=super_secret_knowthetask_jwt_key_2026_very_secure_string_min_32_chars

# JWT Expiration Lifetime
JWT_EXPIRES_IN=7d
```

### Client Configuration (`client/.env`):
```env
# Backend API Base URL (leave blank in development to use Vite proxy)
VITE_API_URL=

# Swagger UI Documentation URL
VITE_DOCS_URL=http://localhost:5001/api/docs
```

> [!CAUTION]
> Never commit actual `.env` files or secrets to version control. The repository's `.gitignore` automatically blocks `.env` files while permitting `.env.example`.

---

## 8. Database Setup & Seeding

KnowTheTask ships with automated database initialization:

```bash
cd server
npm run db:setup
```

### What this does:
1. Connects to PostgreSQL using `DATABASE_URL`. If no external PostgreSQL instance is reachable, it automatically spins up an embedded instance on port `5433`.
2. Executes `database/schema.sql` to construct the 7 core tables:
   - `users`
   - `projects`
   - `project_members`
   - `tasks`
   - `comments`
   - `activity_logs`
   - `notifications`
3. Applies database constraints, foreign keys, unique indices, and performance indexes.
4. Executes `database/seed.sql` to populate default accounts with bcrypt-hashed passwords, initial projects, and sample tasks.

---

## 9. Running the Application

### Development Mode (Concurrent)
From the project root:
```bash
npm run dev
```

### Or Start Services Separately:

**Terminal 1 — Backend API Server:**
```bash
cd server
npm start
# Server listening at http://localhost:5001
# OpenAPI Documentation at http://localhost:5001/api/docs
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
# Vite dev server running at http://localhost:5173
```

### Accessing the Application:
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:5001](http://localhost:5001)
- **Interactive Swagger Docs:** [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

---

## 10. API Documentation (Swagger / OpenAPI)

KnowTheTask features an embedded, interactive OpenAPI 3.0 documentation interface:

- **Swagger UI URL:** [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
- **OpenAPI JSON Spec:** [http://localhost:5001/api/docs/swagger.json](http://localhost:5001/api/docs/swagger.json)
- **Markdown Specification:** [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

### Key Endpoints Overview

| Module | Method | Endpoint | Auth | Role Restrictions |
|---|---|---|:---:|---|
| **Auth** | `POST` | `/api/auth/login` | No | Public |
| **Auth** | `GET` | `/api/auth/me` | Yes | All Roles |
| **Users** | `GET` | `/api/users` | Yes | All Roles (Admin filtered for non-admins) |
| **Users** | `PATCH` | `/api/users/:id/status` | Yes | Admin Only |
| **Projects** | `GET` | `/api/projects` | Yes | Role-filtered |
| **Projects** | `POST` | `/api/projects` | Yes | Admin, Project Manager |
| **Projects** | `GET` | `/api/projects/:id` | Yes | Authorized users |
| **Projects** | `PUT` | `/api/projects/:id` | Yes | Admin, Project Manager |
| **Projects** | `DELETE`| `/api/projects/:id` | Yes | Admin Only |
| **Tasks** | `GET` | `/api/tasks` | Yes | Role-filtered |
| **Tasks** | `POST` | `/api/tasks` | Yes | Admin, Project Manager |
| **Tasks** | `PUT` | `/api/tasks/:id` | Yes | Admin, Project Manager |
| **Tasks** | `PATCH` | `/api/tasks/:id/status` | Yes | All Roles (Authorized tasks) |
| **Tasks** | `DELETE`| `/api/tasks/:id` | Yes | Admin, Project Manager |
| **Comments** | `GET` | `/api/comments/task/:taskId` | Yes | Authorized users |
| **Comments** | `POST` | `/api/comments` | Yes | Authorized users |
| **Activity** | `GET` | `/api/activity` | Yes | Role-filtered |
| **Notifications** | `GET` | `/api/notifications` | Yes | Authenticated user |
| **Notifications** | `PATCH` | `/api/notifications/:id/read` | Yes | Notification owner |
| **Notifications** | `PATCH` | `/api/notifications/read-all` | Yes | Authenticated user |
| **Analytics** | `GET` | `/api/analytics` | Yes | Role-filtered |

---

## 11. Testing & Verification

KnowTheTask includes an exhaustive test suite covering unit, integration, and security test cases.

### Running Test Suites:

```bash
# Phase 1 & RBAC Authentication Tests
npm run test:phase1
npm run test:roles

# Phase 2 Projects, Tasks, and Validation Tests
npm run test:phase2

# Phase 3 Admin Deactivation, Kanban, Comments & Notifications Tests
npm run test:phase3

# Phase 4 Inactive Assignment Validation, Search, Pagination & Analytics Tests
npm run test:phase4
```

### Comprehensive QA Test Matrix:
The complete QA test matrix containing **66 verified test cases** is documented in:
👉 [`docs/TEST-CASES.md`](docs/TEST-CASES.md)

---

## 12. Deployment Guidelines

### Production Build
Build the optimized frontend distribution bundle:
```bash
npm run build
# Outputs minified assets to client/dist/
```

### Deployment Architecture
1. **Frontend Hosting (Vercel, Netlify, AWS S3 / CloudFront):**
   - Publish directory: `client/dist`
   - Build command: `npm run build`
   - Set environment variable: `VITE_API_URL=https://api.yourdomain.com`

2. **Backend Hosting (Render, Railway, Heroku, AWS ECS):**
   - Root directory: `server`
   - Start command: `npm start`
   - Set environment variables:
     - `PORT=5001`
     - `CLIENT_URL=https://yourdomain.com`
     - `DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require`
     - `JWT_SECRET=production_strong_secret_key`

3. **Managed Database (Supabase, Neon, AWS RDS PostgreSQL):**
   - Execute `database/schema.sql` and `database/seed.sql` on the target database instance.

For an extensive step-by-step production setup guide, consult:
👉 [`docs/PROJECT-DOCUMENTATION.md#14-deployment-strategy`](docs/PROJECT-DOCUMENTATION.md#14-deployment-strategy)

---

## 13. Screenshots

| Screen | Description |
|---|---|
| **Role-Selection Login** | Clean, login-first interface with 3 role cards (Admin, Project Manager, Team Member) and error badges. |
| **Executive Dashboard** | Metric summary cards (Total Projects, Tasks Completed, Pending Reviews, Team Members) with quick actions. |
| **Interactive Kanban** | 4-column drag-and-drop board (`TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`) with task priority badges. |
| **Project Directory** | Multi-column filterable list with progress bars, deadline countdowns, and manager avatars. |
| **Task Detail & Comments**| Modal view featuring status transitions, threaded team commentary, and audit activity timeline. |
| **Admin Team Directory** | Member list with Active/Inactive badge indicators and one-click Deactivate/Reactivate toggles. |
| **Visual Analytics** | Interactive Recharts showing task distribution by status and priority, and team velocity metrics. |
| **Swagger UI Explorer** | Built-in interactive OpenAPI explorer at `/api/docs` with live request sandbox. |

---

## 14. Future Improvements

While KnowTheTask is feature-complete and production-ready, potential roadmap enhancements include:
- **WebSocket Push Notifications:** Real-time push updates for collaborative Kanban moves without page polling.
- **File & Asset Attachments:** Direct file uploads (PDF, images, wireframes) stored via S3/Cloud Storage.
- **Granular Custom Roles:** Configurable permission matrices (e.g., QA Lead, External Auditor, Client Viewer).
- **Two-Factor Authentication (2FA):** TOTP/SMS two-step verification for Admin accounts.
- **Exporting Reports:** PDF and CSV export capabilities for project summary and analytics reports.

---

## 15. License

This project is licensed under the **MIT License**.
See the [LICENSE](LICENSE) file for more information.
