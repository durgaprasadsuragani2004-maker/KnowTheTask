# KnowTheTask — Enterprise-Grade Project & Team Management Platform
## Final Project & Technical Documentation

---

### 1. Introduction
**KnowTheTask** is a comprehensive, production-ready, full-stack project and team management web platform engineered to streamline project planning, task allocation, team collaboration, and real-time operational analytics for organizations. Built using a modern software stack comprising **React.js, Node.js, Express.js, and PostgreSQL**, KnowTheTask provides a multi-tenant-style organizational workspace governed by strict Role-Based Access Control (RBAC).

The platform addresses operational friction in cross-functional engineering teams by bridging high-level project visibility with granular task execution, complete with an interactive drag-and-drop Kanban workflow, contextual team discussions, automated audit logging, proactive in-app notifications, and dynamic visual analytics.

---

### 2. Problem Statement
In fast-paced modern enterprise and software development environments, engineering teams frequently encounter critical bottlenecks due to fragmented collaboration tools:
- **Communication Silos & Context Loss:** Requirements, task updates, status changes, and team discussions are often scattered across disparate email chains and external chat applications.
- **Unauthorized Data Access & Privilege Leakage:** Systems without strict, database-verified authorization permit junior members to access sensitive administrative records, executive roadmaps, or cross-project deliverables.
- **Accidental Resource Misallocation:** Conventional tracking tools often permit inactive, offboarded, or unauthorized team members to be assigned to new customer-critical milestones, resulting in missed delivery dates.
- **Inadequate Auditability:** Absence of immutable activity audit trails leaves project managers incapable of reconstructing the chronological sequence of changes made to tasks, statuses, and team assignments.
- **Lack of Actionable Velocity Metrics:** Stakeholders lack real-time visual analytics to assess task completion ratios, priority bottlenecks, and impending deadline risks across concurrent projects.

---

### 3. Objectives
1. **Develop an Intuitive, High-Contrast User Interface:** Implement a modern SaaS user experience designed with a refined Dark Blue (`#0a192f`) and White (`#ffffff`) color system, responsive across desktop, tablet, and mobile devices.
2. **Enforce Database-Verified Role Security:** Establish secure authentication using JSON Web Tokens (JWT) and bcrypt cryptographic hashing, backed by server-side role validation against the PostgreSQL database to thwart client-side privilege escalation.
3. **Ensure Active Personnel Integrity:** Architect a robust user lifecycle management system where deactivated users are instantly barred from new assignments across projects and tasks, while preserving historical assignment records with dynamic visual badges.
4. **Implement Interactive Task Workflows:** Construct a responsive, drag-and-drop Kanban task board supporting standard workflow transitions (`TODO` ➔ `IN_PROGRESS` ➔ `REVIEW` ➔ `COMPLETED`).
5. **Centralize Communication & Auditing:** Integrate threaded task comments and an immutable activity log capturing every critical state transition.
6. **Deliver Real-Time Visual Analytics:** Provide stakeholders with interactive charts powered by Recharts, offering deep insights into task distributions, priority breakdowns, project statuses, and deadline health.
7. **Expose Standardized API Specifications:** Document all RESTful endpoints using OpenAPI 3.0 standards, complete with an embedded interactive Swagger UI sandbox.

---

### 4. Features
- **Login-First Role Selection:** Intuitive role-based authentication interface validating credentials and role claims directly against PostgreSQL.
- **Project Lifecycle Management:** Create, configure, edit, monitor, and delete projects with timeline validation, manager assignment, and real-time progress percentage tracking.
- **Task Management & Kanban Board:** Drag-and-drop workflow status updates, priority classifications (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and deadline guards.
- **Admin User & Team Management:** Search, filter, inspect, deactivate, and reactivate organizational users without destructive database cascading.
- **Active User Integrity Enforcement:** Deactivated users are blocked from new assignments; existing deliverables dynamically display `🔴 Inactive`.
- **Threaded Task Discussions:** Contextual commentary on specific tasks with author identity, timestamping, and edit/delete permissions.
- **Comprehensive Audit Trail:** Automatic chronological logging of task creations, status updates, member assignments, and comment additions.
- **Notification System:** Real-time bell badge with unread counters, individual mark-as-read, and "Mark All as Read" capabilities.
- **Live Visual Analytics:** Interactive charts (Tasks by Status, Tasks by Priority, Projects Breakdown, and Velocity/Health indicators).
- **Universal Search, Multi-Filter & Pagination:** Full-text search and multi-criteria sorting across projects, tasks, members, and notifications with responsive pagination controls.
- **Interactive Swagger Documentation:** Built-in OpenAPI explorer available at `/api/docs`.

---

### 5. User Roles
KnowTheTask defines three distinct user tiers with strictly enforced boundaries:

1. **Administrator (`ADMIN`):**
   - Organization-wide oversight and governance.
   - Authority to activate, deactivate, and manage all user accounts.
   - Unrestricted CRUD access to all projects, tasks, and system activity logs.
   - Global view across all organization metrics and members.

2. **Project Manager (`PROJECT_MANAGER`):**
   - Delivery management for assigned/managed projects.
   - Authority to create projects, configure schedules, and assign active team members.
   - Authority to create, assign, update, and manage tasks within managed projects.
   - Access to project-scoped team members, activity logs, and analytics.
   - Strictly forbidden from viewing or managing Admin accounts or other PMs globally.

3. **Team Member (`TEAM_MEMBER`):**
   - Individual contributor workspace focused on task execution.
   - Visibility restricted strictly to authorized projects and assigned tasks.
   - Authority to transition assigned task statuses (`TODO` ➔ `IN_PROGRESS` ➔ `REVIEW`).
   - Authority to post comments and view activity on authorized tasks.
   - Strictly forbidden from creating projects, assigning tasks, or viewing Admin accounts.

---

### 6. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React.js | 18.3.1 | Component-based Single Page Application (SPA) architecture |
| **Frontend Bundler** | Vite | 6.1.0 | Fast Hot Module Replacement (HMR) and Rollup production bundling |
| **Styling & Design** | Tailwind CSS | 3.4.17 | Utility-first CSS framework with Dark Blue (`#0a192f`) theme |
| **Icons** | Lucide React | 0.475.0 | Clean, accessible vector icons |
| **Visual Analytics** | Recharts | 3.10.1 | Declarative, responsive charting library |
| **HTTP Client** | Axios | 1.7.9 | Promise-based HTTP client with request interceptors |
| **Routing** | React Router DOM | 6.28.2 | Declarative client-side routing with route guards |
| **Backend Runtime** | Node.js | v18+ | Event-driven asynchronous JavaScript runtime |
| **API Framework** | Express.js | 4.21.2 | Lightweight, robust RESTful API framework |
| **Database** | PostgreSQL | 14+ / 18.4 (emb.) | Enterprise-grade Relational Database Management System |
| **Database Driver** | `pg` (node-postgres) | 8.13.3 | PostgreSQL connection pooling and parameterized query execution |
| **Embedded Database** | `embedded-postgres` | 18.4.0 | Zero-config embedded PostgreSQL engine fallback |
| **Authentication** | `jsonwebtoken` | 9.0.2 | Cryptographically signed JSON Web Tokens (JWT) |
| **Password Security** | `bcryptjs` | 2.4.3 | Salted cryptographic password hashing (10 rounds) |
| **Input Validation** | `express-validator` | 7.2.1 | Declarative schema validation middleware |
| **API Documentation** | OpenAPI 3.0 / Swagger | Swagger UI Express | Standardized interactive API documentation |

---

### 7. Architecture

The platform follows a decoupled, three-tier Client-Server architecture:

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

### 8. Database Design

The PostgreSQL database comprises exactly 7 relational tables with strict foreign key constraints, unique indexes, and performance indexes:

1. **`users`:** Stores user profiles, unique email addresses, bcrypt-hashed credentials, roles, and `is_active` flags.
2. **`projects`:** Stores project titles, descriptions, timelines, status values, and references to the assigned Project Manager (`manager_id`) and creator (`created_by`).
3. **`project_members`:** Many-to-many junction table associating projects with team members. Enforces unique `(project_id, user_id)` constraint.
4. **`tasks`:** Stores work items, project foreign keys, assignee foreign keys, priority levels, workflow statuses, and deadlines.
5. **`comments`:** Stores threaded discussion comments linked to specific tasks with author foreign keys.
6. **`activity_logs`:** Audit log capturing system-wide events (`TASK_CREATED`, `TASK_STATUS_CHANGED`, `COMMENT_ADDED`, etc.) with actor and entity references.
7. **`notifications`:** In-app alert records storing recipient user IDs, notification text, read status flags, and timestamps.

*(Refer to `docs/ER-DIAGRAM.md` for complete schema definitions, data types, and the Mermaid ER diagram).*

---

### 9. Authentication
- **Mechanism:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Credential Storage:** User passwords are never stored in plaintext; passwords undergo salted cryptographic hashing with `bcryptjs` using 10 salt rounds.
- **Payload Contents:** JWT payloads encapsulate the user's unique UUID (`id`), full name, verified email, and role.
- **Client Handling:** Tokens are securely stored in client `localStorage` and dispatched via the `Authorization: Bearer <token>` header on all outgoing Axios requests.
- **Session Validation:** The `/api/auth/me` endpoint enables immediate session validation on application mount or page refresh.

---

### 10. Authorization
- **Multi-Tiered Access Guards:** Backend endpoints are protected by `roleMiddleware.js`, verifying that the requesting user's verified database role matches the required permission level.
- **Spoofing Prevention:** During login, the user's selected role is validated against their verified role stored in PostgreSQL; mismatches trigger an immediate HTTP `403 Forbidden` response (`"You do not have permission to login as <Role>"`).
- **Data-Level Authorization:**
  - Admins retain organization-wide visibility.
  - Project Managers cannot query or view Admin profiles.
  - Team Members can only access projects and tasks specifically assigned to them.
- **Deactivated Account Invalidation:** Deactivated accounts attempting to authenticate are immediately rejected with HTTP `403 Forbidden` (`"Your account has been deactivated."`).

---

### 11. Project Management
- **Lifecycle States:** `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`.
- **Validation Rules:** Start dates cannot exceed deadlines; only active Project Managers can be assigned; duplicate project memberships are rejected.
- **Progress Tracking:** Dynamic real-time calculation of completion percentage based on the ratio of `COMPLETED` tasks to total project tasks:
  $$\text{Progress} = \left(\frac{\text{Completed Tasks}}{\text{Total Tasks}}\right) \times 100$$
- **Cascading Integrity:** Deleting a project automatically cascades to remove associated project members, tasks, comments, and project activity logs cleanly.

---

### 12. Task Management
- **Priority Classifications:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Workflow Statuses:** `TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`.
- **Assignee Integrity:** Tasks can strictly only be assigned to active `TEAM_MEMBER` users. Admin and Project Manager assignments are rejected with HTTP 400.
- **Deadline Guards:** Task creation or editing with deadlines in the past is rejected with HTTP 400.
- **Role-Based Status Progression:** Team Members can transition their assigned tasks from `TODO` ➔ `IN_PROGRESS` ➔ `REVIEW`. Project Managers and Admins can approve and transition tasks to `COMPLETED`.

---

### 13. Kanban
- **Visual Column Layout:** 4 responsive swimlane columns representing each workflow stage.
- **Drag-and-Drop Interaction:** Native HTML5 drag-and-drop event handlers allowing smooth dragging of task cards across status columns.
- **Optimistic UI Updates:** Card positions update immediately in the user interface, followed by asynchronous REST synchronization (`PATCH /api/tasks/:id/status`). If an error occurs, the UI state cleanly rolls back.
- **Project Filtering:** The Kanban board includes real-time project filtering to focus on specific delivery scopes.

---

### 14. Comments
- **Contextual Threading:** Team members can discuss specifics directly on the relevant task detail view.
- **Author Attribution:** Comments dynamically display author avatars, full names, roles, and human-readable timestamps (e.g. "2 hours ago").
- **Edit & Delete Permissions:** Authors can edit their own comments; Admins retain organizational deletion authority.
- **Automatic Audit Generation:** Adding a comment automatically dispatches an audit event to the activity log.

---

### 15. Activity History
- **Event Auditing:** Every critical operation triggers an immutable record in `activity_logs`.
- **Recorded Action Types:**
  - `TASK_CREATED`
  - `TASK_STATUS_CHANGED`
  - `TASK_ASSIGNED`
  - `COMMENT_ADDED`
  - `PROJECT_MEMBER_ADDED`
  - `PROJECT_MEMBER_REMOVED`
- **Scoping:** Activity feeds are role-scoped; Team Members view task-specific logs, Project Managers view project-wide logs, and Admins view global organizational logs.

---

### 16. Notifications
- **Event Triggers:** Automated alerts generated when a task is assigned, a task status is transitioned, or a deadline approaches.
- **Unread Notification Badge:** Interactive bell icon in the top navigation bar displaying live unread counts.
- **User Actions:** Supports individual "Mark as Read" toggles and a global "Mark All as Read" action.
- **User Privacy:** Notification endpoints strictly restrict access to notifications owned by the authenticated user.

---

### 17. Analytics
- **Executive KPI Cards:** Total Projects, Tasks Completed, Pending Reviews, and Active Team Members with comparative metrics.
- **Visual Chart Visualizations:**
  - **Tasks by Status:** Bar chart showing current work volume across `TODO`, `IN_PROGRESS`, `REVIEW`, and `COMPLETED`.
  - **Tasks by Priority:** Donut/Pie chart highlighting high-urgency bottlenecks.
  - **Project Breakdown:** Donut chart illustrating project distribution by lifecycle phase.
  - **Deadline Velocity & Health:** Real-time breakdown tracking `Overdue`, `Due Soon` (within 48 hours), `Upcoming`, and `Completed` items.

---

### 18. Testing
KnowTheTask incorporates an exhaustive automated QA verification framework:
- **`npm run test:phase1`:** Authentication, role mismatch prevention, password validation (10 tests).
- **`npm run test:roles`:** Role visibility rules, Admin exclusion for non-admins (12 tests).
- **`npm run test:phase2`:** Project CRUD, member roster management, task restrictions, deadline guards (46 tests).
- **`npm run test:phase3`:** Admin member deactivation, Kanban transitions, comments, activity logs, notifications (32 tests).
- **`npm run test:phase4`:** Active assignment guards, universal search, sorting, pagination, analytics, Swagger UI (34 tests).
- **`node scripts/testInactiveUserFinal.js`:** Comprehensive verification of PM and Member deactivation, dropdown exclusion, backend rejection, historical badge retention, and reactivation (100% PASS).
- **Master QA Matrix:** 66 documented test cases in `docs/TEST-CASES.md` with **0 failures and 100% pass rate**.

---

### 19. API Documentation
- **Interactive Swagger Explorer:** Hosted live at `http://localhost:5001/api/docs`.
- **OpenAPI 3.0 Specification:** Accessible in JSON format at `http://localhost:5001/api/docs/swagger.json`.
- **Markdown Specification:** Detailed offline API specification located in `docs/API_DOCUMENTATION.md`.

---

### 20. Deployment

#### Frontend Production Deployment:
- **Build Step:** `cd client && npm run build` (generates optimized bundle in `client/dist`).
- **Target Hosts:** Vercel, Netlify, Cloudflare Pages, AWS S3 / CloudFront.
- **Environment Configuration:**
  - `VITE_API_URL`: Base URL of the backend API (e.g. `https://api.knowthetask.com/api`).
  - `VITE_DOCS_URL`: URL of the Swagger documentation (e.g. `https://api.knowthetask.com/api/docs`).

#### Backend Production Deployment:
- **Start Step:** `cd server && npm start`.
- **Target Hosts:** Render, Railway, AWS ECS, Heroku.
- **Environment Configuration:**
  - `PORT`: `5001` or host-assigned port.
  - `CLIENT_URL`: URL of the deployed frontend application.
  - `DATABASE_URL`: Hosted PostgreSQL connection string (Supabase, Neon, AWS RDS) with SSL enabled.
  - `JWT_SECRET`: Secure cryptographic secret string (minimum 32 characters).
  - `JWT_EXPIRES_IN`: `7d`.

#### Database Setup:
- Execute `npm run db:setup` inside `server/` to automatically create tables (`database/schema.sql`) and seed default data (`database/seed.sql`).

---

### 21. Future Scope
- **Real-Time WebSocket Integration:** Integrate Socket.io for instantaneous multi-user Kanban board updates and collaborative cursor awareness.
- **Cloud File Attachments:** Support direct file attachments (deliverable documents, design mockups, logs) via Amazon S3 or Google Cloud Storage.
- **Email & Push Notifications:** Automated delivery of deadline reminder emails and mobile push notifications via SendGrid / Firebase Cloud Messaging (FCM).
- **Two-Factor Authentication (2FA):** Enhance account security with Time-Based One-Time Password (TOTP) verification via Google Authenticator.
- **Exporting & Reporting:** Generate downloadable PDF project executive summaries and CSV export of audit activity logs.
