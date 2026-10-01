const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'KnowTheTask REST API',
    version: '1.0.0',
    description:
      'Comprehensive REST API Documentation for the KnowTheTask Project & Team Management Platform, built with Node.js, Express, PostgreSQL, and JWT Authentication.',
    contact: {
      name: 'KnowTheTask Platform Engineering',
      email: 'support@knowthetask.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token received from /api/auth/login',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User Login',
        description: 'Authenticate user with email and password to receive JWT token and profile.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@knowthetask.com' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Successful login returning JWT token and user profile.' },
          401: { description: 'Invalid credentials or inactive user.' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'User Registration',
        description: 'Register a new user account (Default role: TEAM_MEMBER).',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Smith' },
                  email: { type: 'string', example: 'alex@knowthetask.com' },
                  password: { type: 'string', example: 'Password@123' },
                  role: { type: 'string', enum: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'], default: 'TEAM_MEMBER' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully.' },
          409: { description: 'Email already registered.' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List Users',
        description: 'Retrieve user directory with role visibility scoping, filters, search, and pagination.',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'newest', 'oldest'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'List of users with pagination metadata.' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get User Details',
        description: 'Retrieve user profile, assigned projects, and assigned tasks.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'User details found.' },
          404: { description: 'User not found or hidden by role visibility.' },
        },
      },
    },
    '/api/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Update User Active/Inactive Status (Admin Only)',
        description: 'Activate or deactivate a user account with self-deactivation and last-admin protection.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['is_active'],
                properties: {
                  is_active: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated successfully.' },
          400: { description: 'Self-deactivation or last-admin deactivation blocked.' },
          403: { description: 'Forbidden: Admin only.' },
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List Projects',
        description: 'Retrieve projects visible to the authenticated user with search, filtering, and pagination.',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] } },
          { name: 'manager_id', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'name', 'deadline'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'List of projects with task and member counts.' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create Project (Admin Only)',
        description: 'Create a new project. Validates active Project Manager and active team members.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'start_date', 'deadline', 'manager_id'],
                properties: {
                  name: { type: 'string', example: 'Cloud Infrastructure Upgrade' },
                  description: { type: 'string', example: 'Migrate clusters to high-availability architecture.' },
                  start_date: { type: 'string', format: 'date', example: '2026-10-01' },
                  deadline: { type: 'string', format: 'date', example: '2026-11-15' },
                  manager_id: { type: 'string', format: 'uuid' },
                  status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'], default: 'PLANNING' },
                  member_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project created successfully.' },
          400: { description: 'Validation error: inactive manager, invalid dates, or wrong role.' },
          403: { description: 'Forbidden: Admin only.' },
        },
      },
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get Project Details',
        description: 'Retrieve project details, assigned members, and authorized tasks.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Project details retrieved.' },
          404: { description: 'Project not found.' },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update Project',
        description: 'Update project properties. Admin or Project Manager of project only.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  deadline: { type: 'string', format: 'date' },
                  manager_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Project updated successfully.' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete Project',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Project deleted successfully.' },
        },
      },
    },
    '/api/projects/{id}/members': {
      post: {
        tags: ['Project Members'],
        summary: 'Add Team Member to Project',
        description: 'Add an active Team Member to a project. Admin or PM of project only.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id'],
                properties: {
                  user_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Member added to project.' },
          400: { description: 'Inactive user or wrong role.' },
          409: { description: 'User is already a member.' },
        },
      },
    },
    '/api/projects/{id}/members/{userId}': {
      delete: {
        tags: ['Project Members'],
        summary: 'Remove Team Member from Project',
        description: 'Remove a member from project membership without deleting user from organization.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Member removed from project.' },
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List Tasks',
        description: 'Retrieve authorized tasks with search by title or assignee, filtering, and pagination.',
        parameters: [
          { name: 'project_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] } },
          { name: 'assigned_to', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'deadline_asc', 'deadline_desc', 'priority'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'List of tasks with pagination metadata.' },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create Task',
        description: 'Create a deliverable within a project. Admin or PM of project only. Assignee must be an active project member.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'title'],
                properties: {
                  project_id: { type: 'string', format: 'uuid' },
                  title: { type: 'string', example: 'Setup SSL Certificate Renewal' },
                  description: { type: 'string' },
                  assigned_to: { type: 'string', format: 'uuid' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'], default: 'TODO' },
                  deadline: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Task created successfully.' },
          400: { description: 'Inactive user or deadline validation error.' },
        },
      },
    },
    '/api/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get Task Details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Task details found.' },
          403: { description: 'Forbidden: Task access unauthorized.' },
          404: { description: 'Task not found.' },
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Update Task',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Task updated successfully.' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete Task',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Task deleted successfully.' },
        },
      },
    },
    '/api/tasks/{id}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Update Task Status (Kanban Transition)',
        description: 'Move task across TODO, IN_PROGRESS, REVIEW, COMPLETED. Logs activity and triggers notifications.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated and persisted.' },
        },
      },
    },
    '/api/tasks/{id}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'Get Task Comments',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'List of comments on task.' },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add Comment to Task',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['comment'],
                properties: {
                  comment: { type: 'string', example: 'Updated backend migration scripts.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment created.' },
        },
      },
    },
    '/api/comments/{id}': {
      put: {
        tags: ['Comments'],
        summary: 'Edit Comment',
        description: 'Author or Admin only.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['comment'],
                properties: {
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Comment updated.' },
          403: { description: 'Forbidden: Only author or Admin can edit.' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete Comment',
        description: 'Author or Admin only.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Comment deleted.' },
        },
      },
    },
    '/api/tasks/{id}/activity': {
      get: {
        tags: ['Activity'],
        summary: 'Get Task Activity History',
        description: 'Retrieve timeline of events (creation, assignment, status change, comments).',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Activity history timeline.' },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get User Notifications',
        description: 'Retrieve notifications with unread count. Triggers deadline checking for assigned tasks.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Notifications list and unreadCount.' },
        },
      },
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark Notification as Read',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Notification marked as read.' },
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark All Notifications as Read',
        responses: {
          200: { description: 'All notifications marked as read.' },
        },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get Role-Scoped Dashboard Analytics',
        description: 'Returns real PostgreSQL project counts, task counts, member counts, deadline breakdowns, and chart data.',
        responses: {
          200: { description: 'Dashboard analytics metrics and chart data.' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
