# KnowTheTask

> **Project & Team Management Platform**

KnowTheTask is an enterprise-grade, full-stack project and team management platform built with React.js, Node.js, Express.js, and PostgreSQL. It enforces strict Role-Based Access Control (RBAC), bcrypt password hashing, and verified database role validation at the authentication layer.

---

## Table of Contents
1. [Project Title](#1-project-title)
2. [Project Description](#2-project-description)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Features](#5-features)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Technology Stack](#7-technology-stack)
8. [System Architecture](#8-system-architecture)
9. [Project Structure](#9-project-structure)
10. [Database Information](#10-database-information)
11. [Authentication](#11-authentication)
12. [API Documentation (Swagger / OpenAPI)](#12-api-documentation-swagger--openapi)
13. [Installation](#13-installation)
14. [Environment Variables](#14-environment-variables)
15. [Database Setup & Seeding](#15-database-setup--seeding)
16. [Running Locally](#16-running-locally)
17. [Testing](#17-testing)
18. [Deployment](#18-deployment)
19. [Screenshots](#19-screenshots)
20. [Future Improvements](#20-future-improvements)

---

## 1. Project Title
**KnowTheTask — Full-Stack Project & Team Management Platform**

---

## 2. Project Description
KnowTheTask simplifies organizational project tracking and team collaboration through a structured, multi-tier management workflow. It eliminates communication silos and unauthorized access by providing tailored dashboards, Kanban task boards, threaded discussions, real-time activity auditing, in-app notifications, and visual analytics for three key user tiers: **Admin**, **Project Manager**, and **Team Member**.

The platform is designed with a **Dark Blue (`#0a192f`) and White (`#ffffff`)** SaaS interface that prioritizes operational clarity, fast navigation, responsive layout across all device viewports, and zero visual clutter.

---

## 3. Problem Statement
Cross-functional teams routinely face critical collaboration bottlenecks:
- **Fragmented Communication:** Tasks, updates, and discussions are scattered across external chat apps and email chains, leading to lost context.
- **Unauthorized Data Access:** Without database-enforced Role-Based Access Control (RBAC), unauthorized members can view administrative or confidential project data.
- **Resource Misallocations:** Offboarded or inactive team members can accidentally be assigned to new customer-critical milestones.
- **Absence of Auditability:** Teams cannot track who made which status transitions or task changes over time.
- **Lack of Real-Time Metrics:** Stakeholders lack dynamic visual analytics to assess task completion ratios and deadline risks.

---

## 4. Objectives
1. **Deliver Modern SaaS Design:** High contrast, responsive typography, and intuitive layouts using Dark Blue and White.
2. **Enforce Database-Verified Role Security:** Prevent role spoofing via database-verified JWT authentication and server-side RBAC guards across Admin, PM, and Team Member roles.
3. **Guarantee Inactive User Assignment Integrity:** Ensure deactivated personnel are excluded from all assignment dropdowns and rejected by backend endpoints, while preserving historical assignments with dynamic `🔴 Inactive` badges.
4. **Provide End-to-End Workflow Management:** Full project CRUD, interactive drag-and-drop Kanban task boards, threaded discussions, and audit logs.
5. **Real-Time Visual Analytics:** Dynamic charts powered by Recharts (Tasks by Status, Tasks by Priority, Projects Breakdown, and Velocity/Health indicators).
6. **OpenAPI Standards:** Complete interactive OpenAPI 3.0 / Swagger documentation.

---

## 5. Features
- **Strict Role-Based Authentication:** Direct role-selection login with backend database verification against spoofing.
- **Project Lifecycle Management:** Create, update, view, and delete projects with manager assignments, member rosters, date validation, and progress tracking.
- **Active User Integrity Enforcement:** Deactivated users are blocked from new assignments across projects, tasks, and team rosters, while historical contributions are preserved with visual status badges.
- **Interactive Kanban Board:** Drag-and-drop task status transitions (`TODO` ➔ `IN_PROGRESS` ➔ `REVIEW` ➔ `COMPLETED`).
- **Threaded Task Comments:** Contextual team discussions on individual tasks with chronological auditing.
- **Audit Activity Logs:** Automatically logged events tracking task updates, status transitions, and team actions.
- **Notification System:** In-app unread notification bell with mark-as-read and mark-all-read capabilities.
- **Live Visual Analytics:** Interactive charts powered by Recharts (Tasks by Status, Tasks by Priority, Projects Breakdown, and Velocity/Health indicators).
- **Full-Text Search, Multi-Filter & Pagination:** Instant keyword search and multi-criteria filtering across projects, tasks, members, and audit logs with responsive pagination controls.
- **Interactive OpenAPI / Swagger Documentation:** Built-in interactive API explorer and complete REST documentation at `/api/docs`.

---

## 6. User Roles & Permissions

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

## 7. Technology Stack

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

- **API Documentation:**
  - OpenAPI 3.0 / Swagger UI ([http://localhost:5001/api/docs](http://localhost:5001/api/docs))

- **Version Control:**
  - Git / GitHub

---

## 8. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER                    │
│           React.js Single Page Application             │
│   (Vite, TailwindCSS, Recharts, Lucide Icons, Axios)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON REST API
                            │ Authorization: Bearer <JWT>
┌───────────────────────────▼────────────────────────────┐
│                    APPLICATION TIER                    │
│             Node.js / Express.js REST API              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Middleware: CORS, Auth Guards, Error Handling    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Controllers: Auth, Projects, Tasks, Users, etc.   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Services: Notification, Activity, Swagger Docs   │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ Parameterized SQL Queries
┌───────────────────────────▼────────────────────────────┐
│                       DATA TIER                        │
│                  PostgreSQL Database                   │
│  ┌──────────┬──────────────┬──────────────┬─────────┐  │
│  │  users   │   projects   │project_memb. │  tasks  │  │
│  ├──────────┼──────────────┼──────────────┼─────────┤  │
│  │ comments │activity_logs │notifications │ indexes │  │
│  └──────────┴──────────────┴──────────────┴─────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 9. Project Structure

```
KnowTheTask/
├── client/                               # Frontend Single Page Application (React + Vite)
│   ├── src/
│   │   ├── components/                   # Reusable UI components (Navbar, Sidebar, StatCard, etc.)
│   │   ├── context/                      # React Context providers (AuthContext)
│   │   ├── hooks/                        # Custom React hooks (useAuth)
│   │   ├── layouts/                      # Layout wrappers (DashboardLayout)
│   │   ├── pages/                        # View pages (LoginPage, ProjectsPage, TasksPage, etc.)
│   │   ├── routes/                       # Routing configuration (AppRoutes)
│   │   ├── services/                     # Axios API services (authService, dataService)
│   │   └── utils/                        # Formatting utilities (roles, dates, statuses)
│   ├── index.html                        # HTML template
│   ├── package.json                      # Client dependencies & scripts
│   ├── tailwind.config.js                # Tailwind theme configuration
│   └── vite.config.js                    # Vite bundler configuration & proxy
│
├── server/                               # Backend REST API Server (Node.js + Express)
│   ├── src/
│   │   ├── config/                       # Database connection configuration (db.js)
│   │   ├── controllers/                  # Request controllers (auth, project, task, user, etc.)
│   │   ├── middleware/                   # Express middleware (auth, role, validator, errorHandler)
│   │   ├── routes/                       # Express route modules (/api/*)
│   │   ├── services/                     # Services (activityService, notificationService)
│   │   ├── utils/                        # Helper scripts & database seeders (dbSetup, jwt)
│   │   ├── validators/                   # express-validator schemas
│   │   └── index.js                      # Express server entry point
│   ├── package.json                      # Server dependencies & scripts
│   └── .env.example                      # Server environment template
│
├── database/                             # Database DDL & Data Initialization
│   ├── schema.sql                        # PostgreSQL table creation & index definitions
│   ├── seed.sql                          # Initial seed data for development & testing
│   └── ER-DIAGRAM.md                     # Entity-Relationship diagram & schema documentation
│
├── docs/                                 # Project & Technical Documentation
│   ├── API_DOCUMENTATION.md              # REST API specification & schemas
│   ├── ARCHITECTURE.md                   # System architecture & security models
│   ├── ER-DIAGRAM.md                     # Entity-Relationship diagram
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
│   ├── testPhase4.js                     # Active user validation, search, pagination suite
│   └── testInactiveUserFinal.js          # Inactive user lifecycle verification script
│
├── .env.example                          # Root environment template
├── .gitignore                            # Git exclusion rules
├── package.json                          # Root orchestration package
└── README.md                             # Main documentation README
```

---

## 10. Database Information

The PostgreSQL database comprises exactly 7 relational tables:
1. `users` — User profiles, roles (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`), password hashes, and active flags.
2. `projects` — Projects, manager foreign keys, dates, and statuses.
3. `project_members` — Junction table establishing many-to-many relationships between projects and team members.
4. `tasks` — Tasks, project references, assignee references, statuses, priorities, and deadlines.
5. `comments` — Threaded comments associated with specific tasks and author references.
6. `activity_logs` — System-wide audit log tracking actions, actors, and referenced entities.
7. `notifications` — In-app alerts, recipient references, read states, and timestamps.

*(Refer to `docs/ER-DIAGRAM.md` for complete schema definitions, data types, and the Mermaid ER diagram).*

---

## 11. Authentication
- **Mechanism:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Password Security:** Salted cryptographic password hashing via `bcryptjs` (10 salt rounds).
- **Role Verification:** Submitted role is validated against the user's verified role in PostgreSQL; mismatches return HTTP `403 Forbidden`.
- **Session Continuity:** The client dispatches tokens via the `Authorization: Bearer <token>` header, verified on every request.

---

## 12. API Documentation (Swagger / OpenAPI)

KnowTheTask includes an embedded, interactive OpenAPI 3.0 documentation interface:

- **Swagger UI URL:** [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
- **OpenAPI JSON Spec:** [http://localhost:5001/api/docs/swagger.json](http://localhost:5001/api/docs/swagger.json)
- **Markdown Specification:** [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

---

## 13. Installation

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

---

## 14. Environment Variables

Create `.env` files from `.env.example` in both the root and `server` directories:

```bash
cp .env.example .env
cp .env.example server/.env
cp client/.env.example client/.env
```

### Server Configuration (`server/.env`):
```env
PORT=5001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/knowthetask
JWT_SECRET=super_secret_knowthetask_jwt_key_2026_very_secure_string_min_32_chars
JWT_EXPIRES_IN=7d
```

### Client Configuration (`client/.env`):
```env
VITE_API_URL=
VITE_DOCS_URL=http://localhost:5001/api/docs
```

> [!CAUTION]
> Never commit actual `.env` files or secrets to version control. The repository's `.gitignore` automatically blocks `.env` files while permitting `.env.example`.

---

## 15. Database Setup & Seeding

KnowTheTask ships with automated database initialization:

```bash
cd server
npm run db:setup
```

This applies `database/schema.sql` (creating all 7 tables and indexes) and `database/seed.sql` (populating default accounts, initial projects, and sample tasks).

---

## 16. Running Locally

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

---

## 17. Testing

KnowTheTask includes an exhaustive test suite covering unit, integration, and security test cases:

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

# Final Inactive User Comprehensive Verification
node scripts/testInactiveUserFinal.js
```

The complete QA test matrix containing **66 verified test cases** is documented in:
👉 [`docs/TEST-CASES.md`](docs/TEST-CASES.md)

---

## 18. Deployment

### Production Build
Build the optimized frontend distribution bundle:
```bash
npm run build
# Outputs minified assets to client/dist/
```

### Deployment Strategy
1. **Frontend Hosting (Vercel, Netlify, Cloudflare Pages, AWS S3):**
   - Publish directory: `client/dist`
   - Build command: `npm run build`
   - Set environment variable: `VITE_API_URL=https://api.yourdomain.com`

2. **Backend Hosting (Render, Railway, Heroku, AWS ECS):**
   - Root directory: `server`
   - Start command: `npm start`
   - Set environment variables: `PORT`, `CLIENT_URL`, `DATABASE_URL`, `JWT_SECRET`

3. **Managed Database (Supabase, Neon, AWS RDS PostgreSQL):**
   - Run `database/schema.sql` and `database/seed.sql` on target database instance.

For full step-by-step production setup details, consult:
👉 [`docs/PROJECT-DOCUMENTATION.md#20-deployment`](docs/PROJECT-DOCUMENTATION.md#20-deployment)

---

## 19. Screenshots

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

## 20. Future Improvements
- **WebSocket Push Notifications:** Real-time push updates for collaborative Kanban moves without page polling.
- **File & Asset Attachments:** Direct file uploads (PDF, images, wireframes) stored via S3/Cloud Storage.
- **Granular Custom Roles:** Configurable permission matrices (e.g., QA Lead, External Auditor, Client Viewer).
- **Two-Factor Authentication (2FA):** TOTP/SMS two-step verification for Admin accounts.
- **Exporting Reports:** PDF and CSV export capabilities for project summary and analytics reports.

---

## License
This project is licensed under the **MIT License**.
See the [LICENSE](LICENSE) file for more information.
