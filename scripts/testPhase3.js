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

  // Wait for server to come up
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
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
  console.log('🧪 KNOWTHETASK — PHASE 3 AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  await ensureServerRunning();

  // 1. Authenticate users
  console.log('--- 1. Authenticating Roles ---');
  const adminLogin = await post('/api/auth/login', {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
  });
  assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin logged in successfully');
  const adminToken = adminLogin.body.token;
  const adminUser = adminLogin.body.user;

  const pmLogin = await post('/api/auth/login', {
    email: 'manager@knowthetask.com',
    password: 'Manager@123',
  });
  assert(pmLogin.status === 200 && pmLogin.body.token, 'Project Manager logged in successfully');
  const pmToken = pmLogin.body.token;
  const pmUser = pmLogin.body.user;

  const memberLogin = await post('/api/auth/login', {
    email: 'member@knowthetask.com',
    password: 'Member@123',
  });
  assert(memberLogin.status === 200 && memberLogin.body.token, 'Team Member logged in successfully');
  const memberToken = memberLogin.body.token;
  const memberUser = memberLogin.body.user;

  // 2. Member Management & Deactivation
  console.log('\n--- 2. Admin Member Management & Deactivation Rules ---');
  
  // Admin self-deactivation blocked
  const selfDeact = await patch(`/api/users/${adminUser.id}/status`, { is_active: false }, adminToken);
  assert(
    selfDeact.status === 400 && selfDeact.body.message.includes('You cannot deactivate your own account'),
    'Admin cannot deactivate their own account (returns 400)'
  );

  // Non-admin cannot deactivate
  const tmDeact = await patch(`/api/users/${memberUser.id}/status`, { is_active: false }, memberToken);
  assert(tmDeact.status === 403, 'Team Member forbidden from deactivating users (returns 403)');

  const pmDeact = await patch(`/api/users/${memberUser.id}/status`, { is_active: false }, pmToken);
  assert(pmDeact.status === 403, 'Project Manager forbidden from deactivating users (returns 403)');

  // Admin view all users and filters
  const allUsersRes = await get('/api/users', adminToken);
  assert(allUsersRes.status === 200 && allUsersRes.body.users.length > 0, 'Admin can view all members');

  const filterRoleRes = await get('/api/users?role=TEAM_MEMBER', adminToken);
  assert(
    filterRoleRes.status === 200 && filterRoleRes.body.users.every((u) => u.role === 'TEAM_MEMBER'),
    'Admin can filter members by role'
  );

  // Find a team member to deactivate (e.g., memberUser)
  const targetMemberId = memberUser.id;
  const deactRes = await patch(`/api/users/${targetMemberId}/status`, { is_active: false }, adminToken);
  assert(deactRes.status === 200 && deactRes.body.user.is_active === false, 'Admin successfully deactivates a Team Member');

  // Verify status filter works
  const inactiveUsersRes = await get('/api/users?status=INACTIVE', adminToken);
  assert(
    inactiveUsersRes.status === 200 && inactiveUsersRes.body.users.some((u) => u.id === targetMemberId),
    'Admin can filter members by INACTIVE status'
  );

  // Deactivated user cannot be added to a new project
  // Create a test project first
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const projCreateRes = await post(
    '/api/projects',
    {
      name: 'Phase 3 Verification Project',
      description: 'Test project for Phase 3 checks',
      start_date: tomorrow,
      deadline: nextWeek,
      manager_id: pmUser.id,
    },
    adminToken
  );
  assert(projCreateRes.status === 201, 'Created test project for Phase 3 tests');
  const testProjectId = projCreateRes.body.project.id;

  // Attempt to add deactivated user to project
  const addDeactivatedMember = await post(
    `/api/projects/${testProjectId}/members`,
    { user_id: targetMemberId },
    adminToken
  );
  assert(
    addDeactivatedMember.status === 400 && addDeactivatedMember.body.message.includes('deactivated'),
    'Deactivated member cannot be added to project (returns 400)'
  );

  // Reactivate the member
  const reactivateRes = await patch(`/api/users/${targetMemberId}/status`, { is_active: true }, adminToken);
  assert(
    reactivateRes.status === 200 && reactivateRes.body.user.is_active === true,
    'Admin successfully reactivates the Team Member'
  );

  // Now adding the active member succeeds
  const addActiveMember = await post(
    `/api/projects/${testProjectId}/members`,
    { user_id: targetMemberId },
    adminToken
  );
  assert(addActiveMember.status === 201, 'Active Team Member successfully added to project');

  // 3. Project Manager Member Management (Add/Remove from project)
  console.log('\n--- 3. Project Manager Project Member Management ---');
  // PM removes member from project
  const pmRemoveMember = await del(`/api/projects/${testProjectId}/members/${targetMemberId}`, pmToken);
  assert(pmRemoveMember.status === 200, 'Project Manager can remove Team Member from managed project');

  // Verify member is NOT deleted from organization
  const checkOrgUser = await get(`/api/users/${targetMemberId}`, adminToken);
  assert(
    checkOrgUser.status === 200 && checkOrgUser.body.user.id === targetMemberId,
    'Removing member from project does NOT delete user from organization'
  );

  // Re-add member so we can assign tasks
  await post(`/api/projects/${testProjectId}/members`, { user_id: targetMemberId }, pmToken);

  // 4. Kanban Task Board & Status Transitions
  console.log('\n--- 4. Kanban Task Board & Status Transitions ---');
  // Create a task in the project
  const taskCreateRes = await post(
    '/api/tasks',
    {
      project_id: testProjectId,
      title: 'Kanban Workflow Test Task',
      description: 'Testing TODO -> IN_PROGRESS -> REVIEW -> COMPLETED',
      assigned_to: targetMemberId,
      priority: 'HIGH',
      status: 'TODO',
      deadline: nextWeek,
    },
    pmToken
  );
  assert(taskCreateRes.status === 201, 'Task created with initial status TODO');
  const taskId = taskCreateRes.body.task.id;

  // Move TODO -> IN_PROGRESS
  const s1 = await patch(`/api/tasks/${taskId}/status`, { status: 'IN_PROGRESS' }, pmToken);
  assert(s1.status === 200 && s1.body.task.status === 'IN_PROGRESS', 'Task transitioned TODO -> IN_PROGRESS');

  // Verify DB persistence via GET
  const tCheck1 = await get(`/api/tasks/${taskId}`, pmToken);
  assert(tCheck1.body.task.status === 'IN_PROGRESS', 'Status IN_PROGRESS persisted in PostgreSQL');

  // Move IN_PROGRESS -> REVIEW
  const s2 = await patch(`/api/tasks/${taskId}/status`, { status: 'REVIEW' }, memberToken);
  assert(s2.status === 200 && s2.body.task.status === 'REVIEW', 'Assigned Team Member can move task to REVIEW');

  // Move REVIEW -> COMPLETED
  const s3 = await patch(`/api/tasks/${taskId}/status`, { status: 'COMPLETED' }, pmToken);
  assert(s3.status === 200 && s3.body.task.status === 'COMPLETED', 'Manager moved task to COMPLETED');

  // 5. Comments System
  console.log('\n--- 5. Task Comments System ---');
  // Team Member comments on their assigned task
  const c1 = await post(
    `/api/tasks/${taskId}/comments`,
    { comment: 'Working on this task now, testing comments!' },
    memberToken
  );
  assert(c1.status === 201 && c1.body.comment.id, 'Team member added comment to authorized task');
  const commentId = c1.body.comment.id;

  // Get comments
  const listComments = await get(`/api/tasks/${taskId}/comments`, memberToken);
  assert(
    listComments.status === 200 && listComments.body.comments.length > 0,
    'Retrieved comments list for task'
  );

  // Edit comment
  const cEdit = await put(
    `/api/comments/${commentId}`,
    { comment: 'Updated comment text by author.' },
    memberToken
  );
  assert(
    cEdit.status === 200 && cEdit.body.comment.comment === 'Updated comment text by author.',
    'Author successfully updated comment'
  );

  // 6. Activity History Timeline
  console.log('\n--- 6. Activity History Timeline ---');
  const actRes = await get(`/api/tasks/${taskId}/activity`, pmToken);
  assert(actRes.status === 200 && actRes.body.activities.length > 0, 'Retrieved activity history for task');
  const actions = actRes.body.activities.map((a) => a.action);
  console.log('   Logged actions for task:', actions);
  assert(actions.includes('TASK_CREATED'), 'Activity contains TASK_CREATED');
  assert(actions.includes('TASK_STATUS_CHANGED'), 'Activity contains TASK_STATUS_CHANGED');
  assert(actions.includes('COMMENT_ADDED'), 'Activity contains COMMENT_ADDED');

  // 7. Notification System & Bell API
  console.log('\n--- 7. Notifications & Bell APIs ---');
  const notifRes = await get('/api/notifications', pmToken);
  assert(
    notifRes.status === 200 && Array.isArray(notifRes.body.notifications),
    'User retrieved their notifications list'
  );
  console.log(`   Manager unread count: ${notifRes.body.unreadCount}, total: ${notifRes.body.notifications.length}`);

  if (notifRes.body.notifications.length > 0) {
    const notifId = notifRes.body.notifications[0].id;
    const markOne = await patch(`/api/notifications/${notifId}/read`, {}, pmToken);
    assert(markOne.status === 200 && markOne.body.notification.is_read === true, 'Marked single notification as read');
  }

  const markAll = await patch('/api/notifications/read-all', {}, pmToken);
  assert(markAll.status === 200, 'Marked all notifications as read');

  const checkUnread = await get('/api/notifications', pmToken);
  assert(checkUnread.body.unreadCount === 0, 'Unread notification count is now 0');

  // Clean up test project
  await del(`/api/projects/${testProjectId}`, adminToken);

  console.log('\n======================================================');
  console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (spawnedServer) {
    spawnedServer.kill();
  }

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  if (spawnedServer) spawnedServer.kill();
  process.exit(1);
});
