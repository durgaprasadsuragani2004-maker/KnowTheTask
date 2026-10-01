# KnowTheTask — Full-Stack Project & Team Management Platform
## Project & Technical Documentation

---

### 1. Project Title
**KnowTheTask — Enterprise-Grade Project & Team Management Platform**

---

### 2. Problem Statement
In modern software engineering and enterprise workflows, cross-functional teams face critical collaboration challenges:
- **Lack of Centralized Visibility:** Project managers struggle to track multi-project milestones, sprint velocity, and team capacity simultaneously.
- **Accidental Resource Misallocations:** Systems without strict active validation allow deactivated or unauthorized personnel to be assigned to critical client deliverables.
- **Security & Privilege Leakage:** Without strict database-enforced Role-Based Access Control (RBAC), team members can inadvertently view internal administrative data or cross-project deliverables.
- **Fragmented Communication:** Task conversations, status changes, and deadline alerts are often scattered across external messaging apps, leading to lost context and missed deadlines.

---

### 3. Objectives
1. **Provide a Clean, Modern SaaS Architecture:** Deliver an ultra-responsive user experience utilizing clean typography, high contrast, and a Dark Blue (`#0a192f`) and White design system.
2. **Enforce Database-Backed Role-Based Security:** Prevent role spoofing through database-verified JWT authentication and server-side RBAC guards across Admin, Project Manager, and Team Member roles.
3. **Eliminate Deactivated User Assignments:** Implement strict multi-layer validation ensuring inactive personnel can never be selected or assigned to projects or tasks, while preserving historical assignment integrity.
4. **Facilitate End-to-End Workflow Management:** Provide complete Project CRUD, an interactive drag-and-drop Kanban board, threaded comments, activity timelines, and an in-app notification center.
5. **Offer Deep Real-Time Analytics:** Deliver role-scoped analytics and charts depicting task status distributions, priority breakdowns, project lifecycle distribution, and deadline health tracking.
6. **Ensure API Reliability & Standards:** Expose an OpenAPI 3.0 documented REST API complete with an interactive Swagger UI sandbox.

---

### 4. Features & Functional Capabilities
- **Role-Centric Login Flow:** Role selection card interface that validates credentials against the PostgreSQL database.
- **Active Member Management:** Admin capability to soft-deactivate/reactivate users without destructive database cascading.
- **Strict Active Validation:** Inactive users are excluded from all assignment dropdowns and rejected by backend endpoints with HTTP 400.
- **Historical Assignment Preservation:** Existing deliverables of deactivated members are retained and visually badged with `🔴 Inactive`.
- **Project Lifecycle Management:** Create, configure, monitor, schedule, and track projects with automatic progress percentage calculations.
- **Interactive Kanban Board:** Visual column workflow (`To Do`, `In Progress`, `In Review`, `Completed`) with optimistic drag-and-drop status synchronization.
- **Task Discussions:** Threaded comment feed with author avatars, edit/delete controls, and automatic audit event generation.
- **Activity Log Audit Trail:** Real-time chronological tracking of all creations, reassignments, and status transitions.
- **Notification Center:** Real-time bell counter and drop-down feed with deadline proximity alerts and one-click "Mark All as Read".
- **Real-Time Analytics Dashboard:** Interactive bar charts and donut charts powered by Recharts, showing deadline health (Overdue, Due Soon, Upcoming, Completed).
- **Universal Search, Sorting & Pagination:** Server-side search across names, emails, and titles; multi-criteria sorting; and reusable numbered pagination.

---

### 5. User Roles & Permission Hierarchy

| Capability / Resource | Administrator (`ADMIN`) | Project Manager (`PROJECT_MANAGER`) | Team Member (`TEAM_MEMBER`) |
|---|:---:|:---:|:---:|
| System-Wide Access | Global | Project-Scoped | Assignment-Scoped |
| User Account Activation / Deactivation | Full Access | No Access | No Access |
| Create Projects | Yes | Allowed | No Access |
| Edit Projects | All Projects | Managed / Owned Projects Only | No Access |
| Delete Projects | Yes | Only if Project Creator | No Access |
| Add / Remove Team Members | Any Project | Managed Projects Only | No Access |
| Create & Assign Tasks | Yes | Managed Projects Only | No Access |
| Move Task Workflow Status | All Tasks | Managed Project Tasks | Assigned Tasks Only |
| Post & View Comments | All Tasks | Managed Project Tasks | Assigned Tasks Only |
| View Activity History | Global | Managed Projects | Assigned Tasks Only |
| Notifications Feed | Own Alerts | Own Alerts | Own Alerts |
| Analytics Dashboard | Global Organization | Managed Projects Scope | Assigned Deliverables Scope |

---

### 6. Technology Stack

#### Frontend:
- **Framework:** React.js 18 (Functional Components, Hooks)
- **Tooling & Bundler:** Vite 6 (Lightning-fast HMR and Rollup production builds)
- **Styling & Design System:** TailwindCSS 3 (Dark Blue `#0a192f` primary palette)
- **Icons:** Lucide React
- **Data Visualization:** Recharts 3 (ResponsiveContainer, BarChart, PieChart)
- **HTTP Client:** Axios with anti-caching and JWT interceptors
- **Routing:** React Router DOM 6

#### Backend:
- **Runtime Environment:** Node.js (v18+)
- **Web Framework:** Express.js (RESTful API architecture)
- **Database Driver:** `pg` (node-postgres connection pooling)
- **Embedded Database Engine:** `embedded-postgres` (automatic local zero-config fallback)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`)
- **Password Security:** `bcryptjs` (salted hashing)
- **API Documentation:** OpenAPI 3.0 & Swagger UI Express

#### Database:
- **RDBMS:** PostgreSQL (v14+ / embedded v18.4)
- **Schema Design:** 7 relational tables with Foreign Keys (`CASCADE` / `SET NULL`), unique constraints, and B-Tree indexes

---

### 7. System Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │            React.js Single Page Application            │
   │   (Vite, TailwindCSS, Recharts, Lucide Icons, Axios)   │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP / HTTPS (REST API)
                               │ Authorization: Bearer <JWT>
   ┌───────────────────────────▼────────────────────────────┐
   │            Node.js / Express.js Backend API            │
   │  ┌──────────────────────────────────────────────────┐  │
   │  │ Middleware: CORS, Auth, Anti-Cache, ErrorHandler │  │
   │  ├──────────────────────────────────────────────────┤  │
   │  │ Controllers: Auth, Projects, Tasks, Users, etc.   │  │
   │  ├──────────────────────────────────────────────────┤  │
   │  │ Services: Notification, Activity, Swagger Docs   │  │
   │  └────────────────────────┬─────────────────────────┘  │
   └───────────────────────────┼────────────────────────────┘
                               │ SQL Queries via node-postgres
   ┌───────────────────────────▼────────────────────────────┐
   │                  PostgreSQL Database                   │
   │  ┌──────────┬──────────────┬──────────────┬─────────┐  │
   │  │  users   │   projects   │project_memb. │  tasks  │  │
   │  ├──────────┼──────────────┼──────────────┼─────────┤  │
   │  │ comments │activity_logs │notifications │ indexes │  │
   │  └──────────┴──────────────┴──────────────┴─────────┘  │
   └────────────────────────────────────────────────────────┘
```

---

### 8. Database Design & Relational Model
The database consists of 7 normalized relational tables:
1. **`users`:** User authentication, password hashes, verified roles, active status.
2. **`projects`:** Project title, scope, schedule timeline, status, manager FK, creator FK.
3. **`project_members`:** Many-to-Many bridge table between projects and team members.
4. **`tasks`:** Work deliverables, priority, workflow status, deadline, project FK, assignee FK.
5. **`comments`:** Discussion threads linked to tasks with author references.
6. **`activity_logs`:** Audit log capturing system-wide lifecycle actions.
7. **`notifications`:** User-targeted alerts and deadline proximity notifications.

*(Refer to [`database/ER-DIAGRAM.md`](file:///Users/durgaprasad/Downloads/updates/KnowTheTask/database/ER-DIAGRAM.md) for full schema definitions and the Mermaid ER diagram).*

---

### 9. API Architecture & Endpoints
The REST API follows standardized HTTP conventions:
- **Authentication:** `POST /api/auth/login`, `POST /api/auth/register`
- **Users:** `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id/status`, `PUT /api/users/:id`
- **Projects:** `GET /api/projects`, `GET /api/projects/:id`, `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`
- **Project Members:** `POST /api/projects/:id/members`, `DELETE /api/projects/:id/members/:userId`
- **Tasks:** `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`, `PUT /api/tasks/:id`, `PATCH /api/tasks/:id/status`, `DELETE /api/tasks/:id`
- **Comments:** `GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id`
- **Activity:** `GET /api/tasks/:id/activity`, `GET /api/projects/:id/activity`
- **Notifications:** `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- **Analytics:** `GET /api/analytics/dashboard`
- **Swagger Documentation:** `GET /api/docs`, `GET /api/docs/swagger.json`

---

### 10. Authentication & Security Implementation
1. **Password Hashing:** Stored passwords utilize `bcryptjs` with salt round 10.
2. **Token Generation:** Cryptographically signed JWT tokens with 7-day expiration.
3. **Role Spoofing Prevention:** The backend checks the submitted role against the user's role in PostgreSQL and rejects mismatches with HTTP 403.
4. **Anti-Caching Headers:** Dynamic API responses emit `Cache-Control: no-store, no-cache` to ensure data reflects live database state.
5. **CORS Security:** Configured to restrict origin requests while supporting localhost development and production hostnames.

---

### 11. Testing & Quality Assurance
The application features complete automated verification suites:
- **`npm run test:phase1`:** Login UI, role validation, credential security.
- **`npm run test:roles`:** Backend-enforced role visibility restrictions.
- **`npm run test:phase2`:** Project lifecycle, member assignment, task CRUD, deadline validation (46 tests).
- **`npm run test:phase3`:** Admin deactivation, Kanban board, comments, activity timeline, notifications (32 tests).
- **`npm run test:phase4`:** Active assignment guards, search, sorting, pagination, analytics, Swagger (34 tests).
- **Total Test Cases:** 112 automated test assertions with **100% pass rate**.

---

### 12. Deployment Guide

#### Backend Deployment (Render / Railway / AWS):
1. Connect GitHub repository.
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && npm start`
4. Configure Environment Variables:
   - `DATABASE_URL`: Hosted PostgreSQL connection URI (e.g. Supabase, Neon, AWS RDS)
   - `JWT_SECRET`: Secure 64-character secret key
   - `PORT`: `5001` or dynamic port provided by host
   - `CLIENT_URL`: Deployed frontend domain

#### Frontend Deployment (Vercel / Netlify / Cloudflare Pages):
1. Set root directory to `client`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Configure Environment Variables:
   - `VITE_API_URL`: Full URL of deployed backend (e.g. `https://api.knowthetask.com/api`)
   - `VITE_DOCS_URL`: URL of deployed Swagger docs (e.g. `https://api.knowthetask.com/api/docs`)

---

### 13. Future Scope
- Real-time WebSockets / Socket.io for instantaneous multi-user collaborative board movement.
- File and deliverable attachments using cloud object storage (AWS S3 / Google Cloud Storage).
- Granular email notification dispatching using SendGrid or AWS SES.
- Two-Factor Authentication (2FA) via Time-based One-Time Passwords (TOTP).
