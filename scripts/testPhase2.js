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

async function isServerRunning() {
  try {
    const res = await get('/api/health');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('🧪 KNOWTHETASK — PHASE 2 AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // Check if server is running, if not start it
  const alreadyRunning = await isServerRunning();
  if (!alreadyRunning) {
    console.log('📡 Starting backend server on port 5001 for testing...');
    spawnedServer = spawn('node', ['src/index.js'], {
      cwd: path.resolve(__dirname, '../server'),
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      ready = await isServerRunning();
      if (ready) break;
    }

    if (!ready) {
      throw new Error('Backend server failed to start within timeout');
    }
  }

  try {
    // Step 1: Health check
    console.log('\n1. Verifying API health check...');
    const health = await get('/api/health');
    assert(health.status === 200 && health.body.status === 'online', 'Server health check returns online');

    // Step 2: Authentication for 3 roles
    console.log('\n2. Authenticating 3 user roles...');
    const adminLogin = await post('/api/auth/login', {
      email: 'admin@knowthetask.com',
      password: 'Admin@123',
      role: 'ADMIN',
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin login succeeded');
    const adminToken = adminLogin.body?.token;
    const adminId = adminLogin.body?.user?.id;

    const pmLogin = await post('/api/auth/login', {
      email: 'manager@knowthetask.com',
      password: 'Manager@123',
      role: 'PROJECT_MANAGER',
    });
    assert(pmLogin.status === 200 && pmLogin.body.token, 'Project Manager login succeeded');
    const pmToken = pmLogin.body?.token;
    const pmId = pmLogin.body?.user?.id;

    const memberLogin = await post('/api/auth/login', {
      email: 'member@knowthetask.com',
      password: 'Member@123',
      role: 'TEAM_MEMBER',
    });
    assert(memberLogin.status === 200 && memberLogin.body.token, 'Team Member login succeeded');
    const memberToken = memberLogin.body?.token;
    const memberId = memberLogin.body?.user?.id;

    console.log('Logged in user IDs:', { adminId, pmId, memberId });

    // Step 3: Security & Role Visibility Verification (BUG 5)
    console.log('\n3. Security & Role Visibility Verification (BUG 5)...');
    const adminUsersRes = await get('/api/users', adminToken);
    const adminSawAdmins = adminUsersRes.body?.users?.some((u) => u.role === 'ADMIN');
    assert(adminSawAdmins === true, 'Admin can view all users including Admin accounts');

    const pmUsersRes = await get('/api/users', pmToken);
    const pmSawAdmins = pmUsersRes.body?.users?.some((u) => u.role === 'ADMIN');
    assert(pmSawAdmins === false, 'Project Manager CANNOT see any Admin users');

    const memberUsersRes = await get('/api/users', memberToken);
    const memberSawAdmins = memberUsersRes.body?.users?.some((u) => u.role === 'ADMIN');
    assert(memberSawAdmins === false, 'Team Member CANNOT see any Admin users');

    const memberSawPms = memberUsersRes.body?.users?.some((u) => u.role === 'PROJECT_MANAGER');
    assert(memberSawPms === false, 'Team Member CANNOT see any Project Manager users (BUG 5)');

    // Direct lookup of PM by Team Member should return 404
    const memberLookupPm = await get(`/api/users/${pmId}`, memberToken);
    assert(memberLookupPm.status === 404, 'Team Member direct lookup of PM user returns 404 Not Found (BUG 5)');

    // Step 4: Project Creation, Permissions & Validation
    console.log('\n4. Project Creation, Permissions & Validation...');
    // 4a. Team member cannot create project (403)
    const tmCreateProj = await post(
      '/api/projects',
      {
        name: 'Unauthorized Project',
        start_date: '2026-10-01',
        deadline: '2026-11-01',
      },
      memberToken
    );
    assert(tmCreateProj.status === 403, 'Team Member blocked from creating project (403 Forbidden)');

    // 4b. Reject Admin as Project Manager (400)
    const adminAsPmRes = await post(
      '/api/projects',
      {
        name: 'Invalid PM Project',
        start_date: '2026-10-01',
        deadline: '2026-11-01',
        manager_id: adminId,
      },
      adminToken
    );
    assert(adminAsPmRes.status === 400, 'Admin cannot be assigned as Project Manager (400 Bad Request)');

    // 4c. Reject Admin as Team Member (400)
    const adminAsMemberRes = await post(
      '/api/projects',
      {
        name: 'Invalid Member Project',
        start_date: '2026-10-01',
        deadline: '2026-11-01',
        manager_id: pmId,
        member_ids: [adminId],
      },
      adminToken
    );
    assert(adminAsMemberRes.status === 400, 'Admin cannot be assigned as project member (400 Bad Request)');

    // 4d. Reject deadline earlier than start_date (400)
    const badDateRes = await post(
      '/api/projects',
      {
        name: 'Bad Dates Project',
        start_date: '2026-11-01',
        deadline: '2026-10-01',
        manager_id: pmId,
      },
      adminToken
    );
    assert(badDateRes.status === 400, 'Deadline earlier than start date rejected (400 Bad Request)');

    // 4e. Successful Project Creation by Admin
    const newProjRes = await post(
      '/api/projects',
      {
        name: 'Phase 2 Cloud Platform Rollout',
        description: 'Enterprise Kubernetes cluster provisioning and monitoring setup',
        start_date: '2026-10-01',
        deadline: '2026-12-15',
        status: 'IN_PROGRESS',
        manager_id: pmId,
        member_ids: [memberId],
      },
      adminToken
    );
    assert(newProjRes.status === 201 && newProjRes.body.project?.id, 'Admin created project with PM and Team Member assigned');
    const projectId = newProjRes.body?.project?.id;

    // Step 5: Project Details & Member Management (BUG 2)
    console.log('\n5. Project Details & Member Management (BUG 2)...');
    const projDetails = await get(`/api/projects/${projectId}`, pmToken);
    assert(projDetails.status === 200, 'Project Manager can view project details');
    assert(projDetails.body.project?.manager_id === pmId, 'Project Manager ID is properly assigned');
    assert(projDetails.body.project?.members?.length >= 2, 'Project has both PM and Team Member in members list');
    const hasAdminMember = projDetails.body.project?.members?.some((m) => m.role === 'ADMIN');
    assert(hasAdminMember === false, 'Project members list does not expose any Admin accounts');

    // 5b. Remove team member
    const removeRes = await del(`/api/projects/${projectId}/members/${memberId}`, pmToken);
    assert(removeRes.status === 200, 'Project Manager removed team member from project');

    // Verify member removed
    const projDetailsAfterRemove = await get(`/api/projects/${projectId}`, pmToken);
    const stillHasMember = projDetailsAfterRemove.body.project?.members?.some((m) => m.id === memberId);
    assert(stillHasMember === false, 'Member was confirmed removed from project members');

    // Re-add team member
    const addRes = await post(`/api/projects/${projectId}/members`, { user_id: memberId }, pmToken);
    assert(addRes.status === 201, 'Project Manager added team member to project');

    // Duplicate member add check (409)
    const dupAddRes = await post(`/api/projects/${projectId}/members`, { user_id: memberId }, pmToken);
    assert(dupAddRes.status === 409, 'Duplicate project membership prevented (409 Conflict)');

    // Attempt to add Admin user as member (400)
    const addAdminMemRes = await post(`/api/projects/${projectId}/members`, { user_id: adminId }, pmToken);
    assert(addAdminMemRes.status === 400, 'Adding Admin as project member blocked (400 Bad Request)');

    // Team member attempts to add member (403)
    const tmAddRes = await post(`/api/projects/${projectId}/members`, { user_id: memberId }, memberToken);
    assert(tmAddRes.status === 403, 'Team Member blocked from managing project members (403 Forbidden)');

    // Step 6: Task Management, Assignee Restrictions & Deadline Validation (BUG 7 & BUG 8)
    console.log('\n6. Task Management, Assignee Restrictions & Deadline Validation (BUG 7 & BUG 8)...');
    // 6a. Team Member cannot create tasks (403)
    const tmCreateTask = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Unauthorized Task',
        priority: 'MEDIUM',
        status: 'TODO',
      },
      memberToken
    );
    assert(tmCreateTask.status === 403, 'Team Member blocked from creating tasks (403 Forbidden)');

    // 6b. Reject Admin as task assignee (400)
    const adminAssigneeRes = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Task with Admin Assignee',
        assigned_to: adminId,
        priority: 'HIGH',
        status: 'TODO',
      },
      pmToken
    );
    assert(adminAssigneeRes.status === 400, 'Admin cannot be assigned to tasks (400 Bad Request - BUG 7)');

    // 6c. Reject Project Manager as task assignee (400)
    const pmAssigneeRes = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Task with PM Assignee',
        assigned_to: pmId,
        priority: 'HIGH',
        status: 'TODO',
      },
      pmToken
    );
    assert(pmAssigneeRes.status === 400, 'Project Manager cannot be assigned to tasks (400 Bad Request - BUG 7)');

    // 6d. Reject past deadline when creating task (400)
    const pastDeadlineRes = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Task with Past Deadline',
        assigned_to: memberId,
        priority: 'HIGH',
        status: 'TODO',
        deadline: '2020-01-01',
      },
      pmToken
    );
    assert(pastDeadlineRes.status === 400, 'Task creation with past deadline rejected (400 Bad Request - BUG 8)');

    // 6e. Successful Task Creation by PM assigned to member
    const createTaskRes = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Configure Terraform EKS Provisioning Script',
        description: 'Write reproducible IaC modules for cluster VPC, subnets, and node groups',
        assigned_to: memberId,
        priority: 'HIGH',
        status: 'TODO',
        deadline: '2026-10-20',
      },
      pmToken
    );
    assert(createTaskRes.status === 201 && createTaskRes.body.task?.id, 'PM created task assigned to team member');
    const taskId = createTaskRes.body?.task?.id;

    // 6f. Reject past deadline when editing task (400)
    const editPastDeadlineRes = await put(
      `/api/tasks/${taskId}`,
      {
        deadline: '2020-01-01',
      },
      pmToken
    );
    assert(editPastDeadlineRes.status === 400, 'Task edit with past deadline rejected (400 Bad Request - BUG 8)');

    // Step 7: Task Visibility Scoping for Team Members (BUG 10)
    console.log('\n7. Task Visibility Scoping for Team Members (BUG 10)...');
    // Create an unassigned task in the same project
    const unassignedTaskRes = await post(
      '/api/tasks',
      {
        project_id: projectId,
        title: 'Unassigned Internal Infrastructure Task',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: '2026-11-01',
      },
      pmToken
    );
    assert(unassignedTaskRes.status === 201, 'PM created unassigned task in project');
    const unassignedTaskId = unassignedTaskRes.body?.task?.id;

    // Team Member queries task list: MUST ONLY see their assigned task
    const tmTasksRes = await get('/api/tasks', memberToken);
    const tmHasAssignedTask = tmTasksRes.body?.tasks?.some((t) => t.id === taskId);
    const tmHasUnassignedTask = tmTasksRes.body?.tasks?.some((t) => t.id === unassignedTaskId);
    assert(tmHasAssignedTask === true, 'Team Member sees task assigned to them (BUG 10)');
    assert(tmHasUnassignedTask === false, 'Team Member CANNOT see unassigned task or task assigned to others (BUG 10)');

    // Team Member queries project details: tasks array MUST ONLY contain assigned tasks
    const tmProjDetails = await get(`/api/projects/${projectId}`, memberToken);
    const projTasksForTm = tmProjDetails.body?.project?.tasks || [];
    const projHasUnassigned = projTasksForTm.some((t) => t.id === unassignedTaskId);
    assert(projHasUnassigned === false, 'Team Member project details hides tasks not assigned to them (BUG 10)');

    // Team Member attempts direct GET of unassigned task (403)
    const tmGetUnassignedTask = await get(`/api/tasks/${unassignedTaskId}`, memberToken);
    assert(tmGetUnassignedTask.status === 403, 'Team Member direct GET of unassigned task returns 403 Forbidden (BUG 10)');

    // Clean up unassigned task
    await del(`/api/tasks/${unassignedTaskId}`, pmToken);

    // Step 8: Task Search, Filtering & Details
    console.log('\n8. Task Search, Filtering & Details...');
    // 8a. Search
    const searchRes = await get('/api/tasks?search=Terraform', memberToken);
    assert(searchRes.status === 200 && searchRes.body.tasks?.length > 0, 'Task search by title returns matches');

    // 8b. Filter by status
    const statusFilterRes = await get('/api/tasks?status=TODO', memberToken);
    assert(statusFilterRes.body.tasks?.every((t) => t.status === 'TODO'), 'Task status filter returns only matching status');

    // 8c. Filter by priority
    const priorityFilterRes = await get('/api/tasks?priority=HIGH', memberToken);
    assert(priorityFilterRes.body.tasks?.every((t) => t.priority === 'HIGH'), 'Task priority filter returns only matching priority');

    // 8d. Filter by project
    const projectFilterRes = await get(`/api/tasks?project_id=${projectId}`, memberToken);
    assert(projectFilterRes.body.tasks?.every((t) => t.project_id === projectId), 'Task project filter returns only matching project');

    // 8e. Task details
    const taskDetails = await get(`/api/tasks/${taskId}`, memberToken);
    assert(taskDetails.status === 200, 'Task details retrieved successfully');
    assert(taskDetails.body.task?.title === 'Configure Terraform EKS Provisioning Script', 'Task details contains correct title');

    // Step 9: Task Status Update & Persistence
    console.log('\n9. Task Status Update & Database Persistence...');
    // 9a. Update status to IN_PROGRESS by assigned Team Member
    const patchStatusRes = await patch(`/api/tasks/${taskId}/status`, { status: 'IN_PROGRESS' }, memberToken);
    assert(patchStatusRes.status === 200 && patchStatusRes.body.task?.status === 'IN_PROGRESS', 'Team Member updated task status to IN_PROGRESS');

    // 9b. Verify persistence on subsequent GET
    const verifyTaskRes = await get(`/api/tasks/${taskId}`, memberToken);
    assert(verifyTaskRes.body.task?.status === 'IN_PROGRESS', 'Task status update is persisted in PostgreSQL');

    // 9c. Team Member blocked from reassigning tasks (403)
    const tmReassignRes = await put(`/api/tasks/${taskId}`, { assigned_to: pmId }, memberToken);
    assert(tmReassignRes.status === 403, 'Team Member blocked from reassigning task to another user (403 Forbidden)');

    // Step 10: Cleanup test project & task
    console.log('\n10. Cleaning up test data...');
    const delTaskRes = await del(`/api/tasks/${taskId}`, adminToken);
    assert(delTaskRes.status === 200, 'Test task deleted successfully');
    const delProjRes = await del(`/api/projects/${projectId}`, adminToken);
    assert(delProjRes.status === 200, 'Test project deleted successfully');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');
  } finally {
    if (spawnedServer) {
      console.log('🛑 Stopping test backend server process...');
      spawnedServer.kill('SIGTERM');
    }
  }

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Fatal error during test run:', err);
  if (spawnedServer) {
    spawnedServer.kill('SIGTERM');
  }
  process.exit(1);
});
