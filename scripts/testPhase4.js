const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:5001';
let spawnedServer = null;

// HTTP Helpers
function request(method, pathUrl, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(BASE_URL + pathUrl);
    const bodyStr = data ? JSON.stringify(data) : null;
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
        method,
        headers: {
          ...(bodyStr && {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          }),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const get = (url, token) => request('GET', url, null, token);
const post = (url, data, token) => request('POST', url, data, token);
const put = (url, data, token) => request('PUT', url, data, token);
const patch = (url, data, token) => request('PATCH', url, data, token);
const del = (url, token) => request('DELETE', url, null, token);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function ensureServerRunning() {
  try {
    const res = await get('/api/health');
    if (res.status === 200) {
      console.log('📡 KnowTheTask backend server is already running on port 5001.');
      return;
    }
  } catch (e) {
    // Server not running, spawn it
  }

  console.log('Starting backend server for test run...');
  spawnedServer = spawn('node', ['src/index.js'], {
    cwd: path.resolve(__dirname, '../server'),
    stdio: 'inherit',
    env: { ...process.env, PORT: '5001' },
  });

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      const res = await get('/api/health');
      if (res.status === 200) {
        console.log('📡 Server successfully started on port 5001.');
        return;
      }
    } catch {}
  }
  throw new Error('Could not connect to backend server on port 5001.');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 KNOWTHETASK — PHASE 4 AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  try {
    await ensureServerRunning();

    // 1. Authenticate All Roles
    console.log('\n--- 1. Authenticating Roles ---');
    const adminLogin = await post('/api/auth/login', {
      email: 'admin@knowthetask.com',
      password: 'Admin@123',
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin login succeeded');
    const adminToken = adminLogin.body.token;

    // Ensure demo accounts are active
    const allUsers = await get('/api/users', adminToken);
    if (allUsers.status === 200 && allUsers.body.users) {
      for (const u of allUsers.body.users) {
        if ((u.email === 'manager@knowthetask.com' || u.email === 'member@knowthetask.com') && !u.is_active) {
          await patch(`/api/users/${u.id}/status`, { is_active: true }, adminToken);
          console.log(`   Reactivated demo user: ${u.email}`);
        }
      }
    }

    const pmLogin = await post('/api/auth/login', {
      email: 'manager@knowthetask.com',
      password: 'Manager@123',
    });
    assert(pmLogin.status === 200 && pmLogin.body.token, 'PM login succeeded');
    const pmToken = pmLogin.body.token;
    const pmUserId = pmLogin.body.user.id;

    const memberLogin = await post('/api/auth/login', {
      email: 'member@knowthetask.com',
      password: 'Member@123',
    });
    assert(memberLogin.status === 200 && memberLogin.body.token, 'Member login succeeded');
    const memberToken = memberLogin.body.token;
    const memberUserId = memberLogin.body.user.id;

    // 2. Critical Part 1: Deactivated User Backend Assignment Validation
    console.log('\n--- 2. Active User Validation: Rejection of Inactive Assignments ---');
    
    // Create test PM and Member to deactivate
    const testPmRes = await post(
      '/api/users',
      {
        name: 'Deactivated PM Test',
        email: `deact_pm_${Date.now()}@knowthetask.com`,
        password: 'Password@123',
        role: 'PROJECT_MANAGER',
      },
      adminToken
    );
    assert(testPmRes.status === 201, 'Created test PM user');
    const testPmId = testPmRes.body.user.id;

    const testMemberRes = await post(
      '/api/users',
      {
        name: 'Deactivated Member Test',
        email: `deact_member_${Date.now()}@knowthetask.com`,
        password: 'Password@123',
        role: 'TEAM_MEMBER',
      },
      adminToken
    );
    assert(testMemberRes.status === 201, 'Created test Member user');
    const testMemberId = testMemberRes.body.user.id;

    // Deactivate both users
    const deactPm = await patch(`/api/users/${testPmId}/status`, { is_active: false }, adminToken);
    assert(deactPm.status === 200 && deactPm.body.user.is_active === false, 'Deactivated test PM');

    const deactMem = await patch(`/api/users/${testMemberId}/status`, { is_active: false }, adminToken);
    assert(deactMem.status === 200 && deactMem.body.user.is_active === false, 'Deactivated test Member');

    // Attempt to assign deactivated PM to a new project (MUST fail with 400)
    const rejectPmProj = await post(
      '/api/projects',
      {
        name: 'Invalid Project With Deactivated PM',
        description: 'Test project description',
        manager_id: testPmId,
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'PLANNING',
      },
      adminToken
    );
    assert(
      rejectPmProj.status === 400 &&
        rejectPmProj.body.message.includes('Inactive users cannot be assigned as Project Manager'),
      'Backend correctly rejected deactivated PM assignment with 400 error'
    );

    // Attempt to assign deactivated Member to a project (MUST fail with 400)
    const rejectMemProj = await post(
      '/api/projects',
      {
        name: 'Invalid Project With Deactivated Member',
        description: 'Test project description',
        manager_id: pmUserId,
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'PLANNING',
        member_ids: [testMemberId],
      },
      adminToken
    );
    assert(
      rejectMemProj.status === 400 &&
        rejectMemProj.body.message.includes('Inactive users cannot be assigned to projects'),
      'Backend correctly rejected deactivated Member assignment to new project with 400 error'
    );

    // Create a valid project with active PM and active member
    const validProjRes = await post(
      '/api/projects',
      {
        name: `Phase 4 Valid Project ${Date.now()}`,
        description: 'Testing search, pagination, and assignment verification',
        manager_id: pmUserId,
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        member_ids: [memberUserId],
      },
      adminToken
    );
    assert(validProjRes.status === 201, 'Created valid project with active users');
    const validProjectId = validProjRes.body.project.id;

    // Attempt to add deactivated member to existing project via /api/projects/:id/members (MUST fail with 400)
    const rejectAddMember = await post(
      `/api/projects/${validProjectId}/members`,
      { user_id: testMemberId },
      adminToken
    );
    assert(
      rejectAddMember.status === 400 &&
        rejectAddMember.body.message.includes('Inactive users cannot be assigned to projects'),
      'Backend correctly rejected adding deactivated user to existing project'
    );

    // Attempt to create task assigned to deactivated user (MUST fail with 400)
    const rejectTaskAssign = await post(
      '/api/tasks',
      {
        project_id: validProjectId,
        title: 'Task Assigned to Deactivated User',
        assigned_to: testMemberId,
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      },
      adminToken
    );
    assert(
      rejectTaskAssign.status === 400 &&
        rejectTaskAssign.body.message.includes('Inactive users cannot be assigned to new tasks'),
      'Backend correctly rejected assigning task to deactivated user with 400 error'
    );

    // 3. Historical Preservation & Dynamic Inactive Status Flag
    console.log('\n--- 3. Historical Assignment Preservation & Inactive Flagging ---');
    // Reactivate test member, assign to a valid task, then deactivate
    await patch(`/api/users/${testMemberId}/status`, { is_active: true }, adminToken);
    await post(`/api/projects/${validProjectId}/members`, { user_id: testMemberId }, adminToken);
    
    const validTaskRes = await post(
      '/api/tasks',
      {
        project_id: validProjectId,
        title: 'Phase 4 Historical Preservation Task',
        description: 'Verify assignee_is_active reflects status change dynamically',
        assigned_to: testMemberId,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      },
      adminToken
    );
    assert(validTaskRes.status === 201, 'Created task assigned to member');
    const validTaskId = validTaskRes.body.task.id;

    // Now deactivate the member again
    await patch(`/api/users/${testMemberId}/status`, { is_active: false }, adminToken);

    // Verify task still exists and returns assignee_is_active = false
    const taskFetch = await get(`/api/tasks/${validTaskId}`, adminToken);
    assert(
      taskFetch.status === 200 && taskFetch.body.task.assignee_is_active === false,
      'Historical task preserved and assignee_is_active dynamically equals false'
    );

    // Verify tasks list includes assignee_is_active = false
    const tasksList = await get(`/api/tasks?project_id=${validProjectId}`, adminToken);
    const preservedTask = tasksList.body.tasks.find((t) => t.id === validTaskId);
    assert(
      preservedTask && preservedTask.assignee_is_active === false,
      'Task list accurately reports assignee_is_active: false for deactivated user'
    );

    // 4. Search Functionality
    console.log('\n--- 4. Search Functionality ---');
    // Projects search
    const projSearchRes = await get(`/api/projects?search=Phase 4 Valid`, adminToken);
    assert(
      projSearchRes.status === 200 &&
        projSearchRes.body.projects.some((p) => p.id === validProjectId),
      'Project search by name returned correct project'
    );

    // Tasks search by title
    const taskSearchTitle = await get(`/api/tasks?search=Historical Preservation`, adminToken);
    assert(
      taskSearchTitle.status === 200 &&
        taskSearchTitle.body.tasks.some((t) => t.id === validTaskId),
      'Task search by title returned correct task'
    );

    // Tasks search by assignee name
    const taskSearchAssignee = await get(`/api/tasks?search=Deactivated Member`, adminToken);
    assert(
      taskSearchAssignee.status === 200 &&
        taskSearchAssignee.body.tasks.some((t) => t.id === validTaskId),
      'Task search by assignee name returned matching task'
    );

    // Users search
    const userSearchRes = await get(`/api/users?search=Deactivated PM Test`, adminToken);
    assert(
      userSearchRes.status === 200 &&
        userSearchRes.body.users.some((u) => u.id === testPmId),
      'User search by name returned correct user'
    );

    // 5. Filtering and Sorting
    console.log('\n--- 5. Filtering and Sorting ---');
    // Project status filter
    const projFilterStatus = await get('/api/projects?status=IN_PROGRESS', adminToken);
    assert(
      projFilterStatus.status === 200 &&
        projFilterStatus.body.projects.every((p) => p.status === 'IN_PROGRESS'),
      'Project status filter returns only matching projects'
    );

    // Project sorting
    const projSortName = await get('/api/projects?sort=name', adminToken);
    assert(projSortName.status === 200, 'Project sort by name succeeded');

    // Task priority filter
    const taskFilterPriority = await get('/api/tasks?priority=HIGH', adminToken);
    assert(
      taskFilterPriority.status === 200 &&
        taskFilterPriority.body.tasks.every((t) => t.priority === 'HIGH'),
      'Task priority filter returns only HIGH priority tasks'
    );

    // Task sort by priority
    const taskSortPriority = await get('/api/tasks?sort=priority', adminToken);
    assert(taskSortPriority.status === 200, 'Task sort by priority succeeded');

    // Users status filter (Active vs Inactive)
    const usersActive = await get('/api/users?status=ACTIVE', adminToken);
    assert(
      usersActive.status === 200 &&
        usersActive.body.users.every((u) => u.is_active === true),
      'User status filter for ACTIVE returns only active users'
    );

    const usersInactive = await get('/api/users?status=INACTIVE', adminToken);
    assert(
      usersInactive.status === 200 &&
        usersInactive.body.users.every((u) => u.is_active === false),
      'User status filter for INACTIVE returns only inactive users'
    );

    // 6. Pagination Verification
    console.log('\n--- 6. Pagination Across Endpoints ---');
    const projPage = await get('/api/projects?page=1&limit=2', adminToken);
    assert(
      projPage.status === 200 &&
        projPage.body.total !== undefined &&
        projPage.body.totalPages !== undefined &&
        projPage.body.projects.length <= 2,
      'Project endpoint supports pagination with total, totalPages, and limit'
    );

    const taskPage = await get('/api/tasks?page=1&limit=2', adminToken);
    assert(
      taskPage.status === 200 &&
        taskPage.body.total !== undefined &&
        taskPage.body.totalPages !== undefined &&
        taskPage.body.tasks.length <= 2,
      'Task endpoint supports pagination with total, totalPages, and limit'
    );

    const userPage = await get('/api/users?page=1&limit=2', adminToken);
    assert(
      userPage.status === 200 &&
        userPage.body.total !== undefined &&
        userPage.body.totalPages !== undefined &&
        userPage.body.users.length <= 2,
      'User endpoint supports pagination with total, totalPages, and limit'
    );

    const notifPage = await get('/api/notifications?page=1&limit=5', adminToken);
    assert(
      notifPage.status === 200 &&
        notifPage.body.total !== undefined &&
        notifPage.body.totalPages !== undefined,
      'Notifications endpoint supports pagination with total and totalPages'
    );

    // 7. Role-Scoped Analytics API
    console.log('\n--- 7. Analytics Dashboard API & Role Scoping ---');
    const adminAnalytics = await get('/api/analytics/dashboard', adminToken);
    assert(
      adminAnalytics.status === 200 &&
        adminAnalytics.body.role === 'ADMIN' &&
        adminAnalytics.body.projects.total !== undefined &&
        adminAnalytics.body.tasks.total !== undefined &&
        adminAnalytics.body.members.total !== undefined &&
        adminAnalytics.body.deadlines.overdue !== undefined &&
        Array.isArray(adminAnalytics.body.tasksByStatus) &&
        Array.isArray(adminAnalytics.body.tasksByPriority) &&
        Array.isArray(adminAnalytics.body.projectsByStatus),
      'Admin analytics dashboard returned full metric breakdowns, deadline analytics, and chart data'
    );

    const pmAnalytics = await get('/api/analytics/dashboard', pmToken);
    assert(
      pmAnalytics.status === 200 &&
        pmAnalytics.body.role === 'PROJECT_MANAGER' &&
        pmAnalytics.body.projects !== undefined &&
        pmAnalytics.body.tasks !== undefined,
      'Project Manager analytics dashboard returned role-scoped project metrics'
    );

    const memberAnalytics = await get('/api/analytics/dashboard', memberToken);
    assert(
      memberAnalytics.status === 200 &&
        memberAnalytics.body.role === 'TEAM_MEMBER' &&
        memberAnalytics.body.tasks !== undefined,
      'Team Member analytics dashboard returned role-scoped assigned metrics'
    );

    // 8. Swagger OpenAPI Documentation
    console.log('\n--- 8. Swagger & OpenAPI Documentation Endpoints ---');
    const swaggerJson = await get('/api/docs/swagger.json');
    assert(
      swaggerJson.status === 200 &&
        swaggerJson.body.openapi === '3.0.0' &&
        swaggerJson.body.info.title.includes('KnowTheTask'),
      'OpenAPI 3.0 specification available at /api/docs/swagger.json'
    );

    const swaggerUi = await get('/api/docs');
    assert(
      swaggerUi.status === 200 &&
        typeof swaggerUi.body === 'string' &&
        swaggerUi.body.includes('swagger-ui'),
      'Interactive Swagger UI HTML served at /api/docs'
    );

    // Clean up test entities
    console.log('\n--- Cleaning up test records ---');
    await del(`/api/tasks/${validTaskId}`, adminToken);
    await del(`/api/projects/${validProjectId}`, adminToken);

  } catch (err) {
    console.error('Test suite error:', err);
    failedCount++;
  } finally {
    if (spawnedServer) {
      console.log('Shutting down spawned test server...');
      spawnedServer.kill('SIGINT');
    }
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 4 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
