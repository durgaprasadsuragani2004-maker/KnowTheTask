# KnowTheTask Architecture Overview

## 1. System Overview
KnowTheTask is a full-stack project and team management platform architected with strict separation of concerns, role-based access control, and PostgreSQL database persistence.

```
KnowTheTask/
├── client/          # React.js + Vite + Tailwind CSS + Lucide React
├── server/          # Node.js + Express.js + JWT + bcrypt + PostgreSQL Pool
├── database/        # schema.sql and seed.sql with Foreign Keys & Indexes
├── docs/            # Architecture & API specifications
└── postman/         # Postman collection for API verification
```

## 2. Security Architecture
- **Password Security**: Passwords are never stored in plain text. All passwords use `bcryptjs` hashing with 10 salt rounds.
- **JWT Authentication**: Authenticated sessions issue signed JSON Web Tokens containing the user's verified database ID, email, role, and name.
- **Role Verification on Login**:
  - The login endpoint checks the selected role against the user's actual database role in PostgreSQL.
  - A role mismatch returns an explicit `403 Forbidden` response (`"You do not have permission to login as <Role>."`).
  - Frontend selections are NEVER trusted implicitly.
- **RBAC Middleware**: Endpoints are guarded by `authMiddleware` and `roleMiddleware` (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`).

## 3. Database Design & Relationships
- **Users**: Central actor table storing role (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`), status, and credentials.
- **Projects**: Managed by Admins and Project Managers; tracks status (`PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`), deadlines, and ownership.
- **Project Members**: Many-to-Many junction table linking users to projects with cascade deletion.
- **Tasks**: Work items associated with a project and optionally assigned to a user, with priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and status (`TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`).
- **Activity Logs & Notifications**: Structured audit trail and user notifications.
