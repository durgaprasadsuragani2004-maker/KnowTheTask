-- KnowTheTask Seed Data
-- Seed users with verified bcrypt hashes

-- 1. Insert Demo Users
-- Password for admin: Admin@123
-- Password for manager: Manager@123
-- Password for member: Member@123

INSERT INTO users (id, name, email, password_hash, role, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@knowthetask.com', '$2a$10$KD4oA1qIqgVd/loKSDF9o.3TUDnHw4heRKpEY.3l33Mf6Hho9qVM6', 'ADMIN', true),
    ('22222222-2222-2222-2222-222222222222', 'Project Manager', 'manager@knowthetask.com', '$2a$10$cxyevsua6L5d.iZOChpZaeFmGcdZty/btclAM0UdRwGDrR6.F9.1C', 'PROJECT_MANAGER', true),
    ('33333333-3333-3333-3333-333333333333', 'Team Member', 'member@knowthetask.com', '$2a$10$zBf46SkoHWd2yCcDESDdKeyHykUvKHOvTf2nrqDOhnb9wcB2nna7.', 'TEAM_MEMBER', true)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    name = EXCLUDED.name;

-- 2. Insert Initial Projects
INSERT INTO projects (id, name, description, start_date, deadline, status, created_by)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Enterprise Cloud Migration', 'Complete infrastructure migration to resilient cloud services with zero downtime.', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '45 days', 'IN_PROGRESS', '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'KnowTheTask SaaS Launch', 'Core project management platform development and Phase 1 release.', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '20 days', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 3. Assign Project Members
INSERT INTO project_members (project_id, user_id)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4. Insert Initial Tasks
INSERT INTO tasks (id, project_id, title, description, assigned_to, created_by, priority, status, deadline)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deploy PostgreSQL Cluster', 'Configure high-availability PostgreSQL with automated backups.', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'HIGH', 'IN_PROGRESS', CURRENT_DATE + INTERVAL '7 days'),
    ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Setup JWT Authentication & RBAC', 'Implement secure role-based access control with token expiration.', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'URGENT', 'REVIEW', CURRENT_DATE + INTERVAL '2 days'),
    ('10000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dark Blue & White SaaS Interface', 'Implement modern minimal SaaS UI matching branding constraints.', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'MEDIUM', 'TODO', CURRENT_DATE + INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Activity Logs
INSERT INTO activity_logs (user_id, project_id, task_id, action, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'PROJECT_CREATED', 'Admin initialized Enterprise Cloud Migration project'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'TASK_ASSIGNED', 'Assigned Deploy PostgreSQL Cluster to Team Member');

-- 6. Insert Notifications
INSERT INTO notifications (user_id, title, message, type, is_read)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'New Task Assigned', 'You have been assigned to Deploy PostgreSQL Cluster', 'TASK', false),
    ('22222222-2222-2222-2222-222222222222', 'Project Kickoff', 'Enterprise Cloud Migration project is now active', 'PROJECT', true);
