# KnowTheTask — REST API Documentation

**Platform:** KnowTheTask Project & Team Management Platform  
**Version:** 1.0.0  
**Base URL:** `http://localhost:5001/api`  
**Interactive Swagger UI:** `http://localhost:5001/api/docs`  
**OpenAPI Specification:** `http://localhost:5001/api/docs/swagger.json`  

---

## Authentication & Headers

Protected routes require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

All responses return anti-caching headers:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticate an active user with email and password.
- **Request Body:**
  ```json
  {
    "email": "admin@knowthetask.com",
    "password": "Admin@123"
  }
  ```
- **Responses:**
  - `200 OK`: Returns `{ "success": true, "token": "...", "user": { "id", "name", "email", "role", "is_active" } }`
  - `401 Unauthorized`: Invalid credentials or deactivated account.

### `POST /api/auth/register`
Register a new member account.
- **Request Body:**
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@knowthetask.com",
    "password": "Password@123",
    "role": "TEAM_MEMBER"
  }
  ```
- **Responses:**
  - `201 Created`: User created successfully.
  - `409 Conflict`: Email already exists.

---

## 2. Users & Member Management (`/api/users`)

### `GET /api/users`
List users according to strict role visibility rules.
- **Query Parameters:**
  - `role`: Filter by role (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`)
  - `status`: Filter by status (`ACTIVE`, `INACTIVE`)
  - `search`: Search query matching user name or email
  - `sort`: `name`, `newest`, `oldest`
  - `page`: Page number (1-indexed)
  - `limit`: Items per page (e.g. 10 or 20)
- **Role Visibility Restrictions:**
  - `ADMIN`: Global visibility.
  - `PROJECT_MANAGER`: Cannot view Admin accounts.
  - `TEAM_MEMBER`: Can only view Team Members on their projects. Never sees Admin or PMs.
- **Responses:**
  - `200 OK`: `{ "success": true, "total": 12, "page": 1, "limit": 10, "totalPages": 2, "users": [...] }`

### `GET /api/users/:id`
Retrieve user details, assigned projects, and tasks.
- **Responses:**
  - `200 OK`: Returns user profile, projects, and tasks.
  - `404 Not Found`: User not found or hidden by role visibility.

### `PATCH /api/users/:id/status`
Activate or deactivate a user account (Admin Only).
- **Request Body:**
  ```json
  {
    "is_active": false
  }
  ```
- **Restrictions:**
  - Admin cannot deactivate their own account (`400 Bad Request`).
  - Last active administrator cannot be deactivated (`400 Bad Request`).
  - Non-admins receive `403 Forbidden`.
- **Responses:**
  - `200 OK`: User status updated. Deactivated users cannot be assigned to new projects or tasks.

---

## 3. Projects (`/api/projects`)

### `GET /api/projects`
List projects visible to the authenticated user.
- **Query Parameters:**
  - `status`: `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`
  - `manager_id`: Filter by assigned Project Manager UUID
  - `search`: Search by Project name, description, or Project Manager name
  - `sort`: `newest`, `oldest`, `name`, `deadline`
  - `page`: Page number
  - `limit`: Items per page
- **Responses:**
  - `200 OK`: Returns array of projects with task and member counts, manager name, and `manager_is_active`.

### `POST /api/projects`
Create a new project (Admin Only).
- **Validation Rules:**
  - `name`, `start_date`, `deadline`, and `manager_id` are required.
  - `manager_id` must be an **active** user with role `PROJECT_MANAGER`.
  - `member_ids` must all be **active** users with role `TEAM_MEMBER`.
- **Responses:**
  - `201 Created`: Project created.
  - `400 Bad Request`: "Inactive users cannot be assigned as Project Manager."

### `GET /api/projects/:id`
Get project details, assigned members, and authorized tasks.
- **Responses:**
  - `200 OK`: Returns project overview, member list, and task list with live `assignee_is_active` and `manager_is_active`.

### `PUT /api/projects/:id`
Update project properties (Admin or managing PM).
- **Responses:**
  - `200 OK`: Project updated.

### `DELETE /api/projects/:id`
Delete project (Admin or project creator).
- **Responses:**
  - `200 OK`: Project deleted.

---

## 4. Project Membership (`/api/projects/:id/members`)

### `POST /api/projects/:id/members`
Add an active Team Member to a project (Admin or managing PM).
- **Request Body:**
  ```json
  {
    "user_id": "<TEAM_MEMBER_UUID>"
  }
  ```
- **Validation:**
  - User must have role `TEAM_MEMBER` and `is_active === true`.
- **Responses:**
  - `201 Created`: Member added; triggers activity log and notification.
  - `400 Bad Request`: Deactivated or invalid user.

### `DELETE /api/projects/:id/members/:userId`
Remove a member from a project.
- **Note:** Does NOT delete user from the organization.
- **Responses:**
  - `200 OK`: Member removed; triggers activity log and notification.

---

## 5. Tasks (`/api/tasks`)

### `GET /api/tasks`
List authorized tasks.
- **Query Parameters:**
  - `project_id`: Filter by project
  - `status`: `TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`
  - `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
  - `assigned_to`: Filter by assignee UUID
  - `search`: Search by Task Title or Assignee Name
  - `sort`: `newest`, `oldest`, `deadline_asc`, `deadline_desc`, `priority`
  - `page`: Page number
  - `limit`: Items per page
- **Role Scoping:**
  - Team Members can ONLY view tasks assigned to them.
- **Responses:**
  - `200 OK`: Returns tasks with `assignee_is_active` flag and pagination.

### `POST /api/tasks`
Create a new deliverable (Admin or managing PM).
- **Validation:**
  - Assignee must be an **active** member of the project.
  - Returns `400 Bad Request`: "Inactive users cannot be assigned to new tasks."
- **Responses:**
  - `201 Created`: Task created.

### `GET /api/tasks/:id`
Get full task details.
- **Responses:**
  - `200 OK`: Task details.

### `PATCH /api/tasks/:id/status`
Update task workflow status (Kanban transition).
- **Allowed Statuses:** `TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`
- **Side Effects:**
  - Persists directly in PostgreSQL.
  - Logs `TASK_STATUS_CHANGED` in `activity_logs`.
  - Dispatches notifications to assigned user and project manager.
- **Responses:**
  - `200 OK`: Task status updated.

---

## 6. Comments (`/api/tasks/:id/comments` & `/api/comments/:id`)

### `GET /api/tasks/:id/comments`
Retrieve chronological comments on an authorized task.

### `POST /api/tasks/:id/comments`
Post a comment on an authorized task.
- **Responses:**
  - `201 Created`: Comment saved, activity logged, notification sent.

### `PUT /api/comments/:id`
Edit comment (Comment author or Admin only).

### `DELETE /api/comments/:id`
Delete comment (Comment author or Admin only).

---

## 7. Activity History (`/api/tasks/:id/activity` & `/api/activities`)

### `GET /api/tasks/:id/activity`
Retrieve timeline of events (`TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `COMMENT_ADDED`, etc.).

---

## 8. Notifications (`/api/notifications`)

### `GET /api/notifications`
Retrieve current user's notifications.
- Automatically triggers deadline checking for upcoming tasks ($\le$ 48 hours).
- Supports `page` and `limit`.
- Returns `{ "unreadCount": N, "notifications": [...] }`.

### `PATCH /api/notifications/:id/read`
Mark a single notification as read.

### `PATCH /api/notifications/read-all`
Mark all notifications as read for current user.

---

## 9. Analytics Dashboard (`/api/analytics/dashboard`)

### `GET /api/analytics/dashboard`
Returns live PostgreSQL dashboard analytics scoped by role:
- **Admin:** Organization-wide totals, project breakdown, task breakdown, member counts (active/inactive), priority breakdown, and deadline analytics.
- **Project Manager:** Analytics scoped strictly to projects managed or created by the PM.
- **Team Member:** Analytics scoped strictly to assigned projects and tasks.
- **Responses:**
  ```json
  {
    "success": true,
    "role": "ADMIN",
    "projects": { "total": 4, "active": 2, "completed": 1, "planning": 1, "on_hold": 0 },
    "tasks": { "total": 12, "completed": 5, "pending": 7, "in_progress": 4, "review": 2, "todo": 1 },
    "members": { "total": 8, "active": 7, "inactive": 1, "total_managers": 3, "active_managers": 3, "inactive_managers": 0 },
    "deadlines": { "overdue": 1, "due_soon": 2, "completed": 5, "upcoming": 4 },
    "tasksByStatus": [...],
    "tasksByPriority": [...],
    "projectsByStatus": [...]
  }
  ```
