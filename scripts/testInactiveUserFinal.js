const http = require('http');

const BASE_URL = 'http://localhost:5001';

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
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(raw);
          } catch {
            parsedBody = raw;
          }
          resolve({ status: res.statusCode, body: parsedBody, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('==================================================');
  console.log('🛡️ KNOWTHETASK — INACTIVE USER FINAL VERIFICATION');
  console.log('==================================================\n');

  // 1. Authenticate Admin
  const adminRes = await request('POST', '/api/auth/login', {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
    role: 'ADMIN'
  });
  if (adminRes.status !== 200) throw new Error('Admin login failed');
  const adminToken = adminRes.body.token;
  console.log('✅ Admin authenticated successfully.');

  // 2. Create fresh test PM and Member
  const uniqueId = Date.now();
  const testPmRes = await request('POST', '/api/users', {
    name: `Test PM ${uniqueId}`,
    email: `test_pm_${uniqueId}@knowthetask.com`,
    password: 'Password@123',
    role: 'PROJECT_MANAGER'
  }, adminToken);
  const testPmId = testPmRes.body.user.id;
  console.log(`✅ Created test Project Manager: ${testPmId}`);

  const testMemberRes = await request('POST', '/api/users', {
    name: `Test Member ${uniqueId}`,
    email: `test_member_${uniqueId}@knowthetask.com`,
    password: 'Password@123',
    role: 'TEAM_MEMBER'
  }, adminToken);
  const testMemberId = testMemberRes.body.user.id;
  console.log(`✅ Created test Team Member: ${testMemberId}`);

  // 3. Create initial project and task using these active users
  const initialProjRes = await request('POST', '/api/projects', {
    name: `Historical Integrity Project ${uniqueId}`,
    description: 'Testing inactive flag preservation',
    manager_id: testPmId,
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0],
    member_ids: [testMemberId]
  }, adminToken);
  const projectId = initialProjRes.body.project.id;
  console.log(`✅ Created project with active PM and Member: ${projectId}`);

  const initialTaskRes = await request('POST', '/api/tasks', {
    title: `Historical Integrity Task ${uniqueId}`,
    description: 'Testing task assignee inactive status',
    project_id: projectId,
    assigned_to: testMemberId,
    priority: 'HIGH',
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0]
  }, adminToken);
  const taskId = initialTaskRes.body.task.id;
  console.log(`✅ Created task assigned to active Member: ${taskId}`);

  // 4. DEACTIVATE PROJECT MANAGER
  console.log('\n--- DEACTIVATING PROJECT MANAGER ---');
  const deactPm = await request('PATCH', `/api/users/${testPmId}/status`, { is_active: false }, adminToken);
  if (deactPm.status !== 200) throw new Error('Deactivating PM failed');
  console.log('✅ Project Manager deactivated.');

  // Verify PM status is now inactive
  const pmStatusRes = await request('GET', `/api/users/${testPmId}`, null, adminToken);
  if (pmStatusRes.body.user.is_active === false) {
    console.log('✅ Verified: PM is_active is now false.');
  } else {
    throw new Error('PM is still marked active!');
  }

  // Verify PM disappears from active PM dropdown list via status=ACTIVE query
  const activePmListRes = await request('GET', '/api/users?role=PROJECT_MANAGER&status=ACTIVE', null, adminToken);
  const pmInActiveList = (activePmListRes.body.users || activePmListRes.body.data || []).find(u => u.id === testPmId);
  if (!pmInActiveList) {
    console.log('✅ Verified: Inactive PM does NOT appear in /api/users?role=PROJECT_MANAGER&status=ACTIVE.');
  } else {
    throw new Error('Inactive PM unexpectedly appeared in active PM list!');
  }

  // Verify PM disappears from frontend assignment filter
  const allUsersRes = await request('GET', '/api/users', null, adminToken);
  const frontendAssignablePms = (allUsersRes.body.users || []).filter(u => u.role === 'PROJECT_MANAGER' && u.is_active !== false);
  if (!frontendAssignablePms.find(u => u.id === testPmId)) {
    console.log('✅ Verified: Inactive PM is excluded from frontend assignable managers dropdown.');
  } else {
    throw new Error('Inactive PM unexpectedly found in frontend assignable managers dropdown!');
  }

  // Attempt to assign deactivated PM to a NEW project via API
  console.log('--- ATTEMPTING NEW PROJECT ASSIGNMENT WITH DEACTIVATED PM ---');
  const failProj = await request('POST', '/api/projects', {
    name: `Invalid Project ${uniqueId}`,
    description: 'Should fail',
    manager_id: testPmId,
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0]
  }, adminToken);
  if (failProj.status === 400) {
    console.log(`✅ Verified: Backend rejected deactivated PM assignment with HTTP 400: "${failProj.body.message}"`);
  } else {
    throw new Error(`Expected backend to reject deactivated PM, got HTTP ${failProj.status}`);
  }

  // Verify existing project remains intact and displays manager_is_active: false
  const existingProjRes = await request('GET', `/api/projects/${projectId}`, null, adminToken);
  const projData = existingProjRes.body.project || existingProjRes.body.data || existingProjRes.body;
  if (projData.manager_is_active === false) {
    console.log('✅ Verified: Existing project preserved, and manager_is_active is dynamically false.');
  } else {
    throw new Error(`Expected manager_is_active to be false, got ${projData.manager_is_active}`);
  }

  // 5. DEACTIVATE TEAM MEMBER
  console.log('\n--- DEACTIVATING TEAM MEMBER ---');
  const deactMember = await request('PATCH', `/api/users/${testMemberId}/status`, { is_active: false }, adminToken);
  if (deactMember.status !== 200) throw new Error('Deactivating member failed');
  console.log('✅ Team Member deactivated.');

  // Verify Member status is now inactive
  const memberStatusRes = await request('GET', `/api/users/${testMemberId}`, null, adminToken);
  if (memberStatusRes.body.user.is_active === false) {
    console.log('✅ Verified: Team Member is_active is now false.');
  } else {
    throw new Error('Team Member is still marked active!');
  }

  // Verify Member disappears from active Member dropdown list via status=ACTIVE query
  const activeMemberListRes = await request('GET', '/api/users?role=TEAM_MEMBER&status=ACTIVE', null, adminToken);
  const memberInActiveList = (activeMemberListRes.body.users || activeMemberListRes.body.data || []).find(u => u.id === testMemberId);
  if (!memberInActiveList) {
    console.log('✅ Verified: Inactive Member does NOT appear in /api/users?role=TEAM_MEMBER&status=ACTIVE.');
  } else {
    throw new Error('Inactive Member unexpectedly appeared in active Member list!');
  }

  // Verify Member disappears from frontend task assignee filter
  const allUsersAfterDeact = await request('GET', '/api/users', null, adminToken);
  const frontendAssignableMembers = (allUsersAfterDeact.body.users || []).filter(u => u.role === 'TEAM_MEMBER' && u.is_active !== false);
  if (!frontendAssignableMembers.find(u => u.id === testMemberId)) {
    console.log('✅ Verified: Inactive Member is excluded from frontend task assignee dropdown.');
  } else {
    throw new Error('Inactive Member unexpectedly found in frontend task assignee dropdown!');
  }

  // Attempt to assign deactivated Member to a NEW task via API
  console.log('--- ATTEMPTING NEW TASK ASSIGNMENT WITH DEACTIVATED MEMBER ---');
  const failTask = await request('POST', '/api/tasks', {
    title: `Invalid Task ${uniqueId}`,
    description: 'Should fail',
    project_id: projectId,
    assigned_to: testMemberId,
    priority: 'MEDIUM',
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0]
  }, adminToken);
  if (failTask.status === 400) {
    console.log(`✅ Verified: Backend rejected deactivated Member task assignment with HTTP 400: "${failTask.body.message}"`);
  } else {
    throw new Error(`Expected backend to reject deactivated Member, got HTTP ${failTask.status}`);
  }

  // Attempt to add deactivated Member to project members
  const failMemberAdd = await request('POST', `/api/projects/${projectId}/members`, {
    member_id: testMemberId,
    userId: testMemberId
  }, adminToken);
  if (failMemberAdd.status === 400 || failMemberAdd.status === 409) {
    console.log(`✅ Verified: Backend rejected adding deactivated member to project with HTTP ${failMemberAdd.status}`);
  } else {
    throw new Error(`Expected backend to reject adding deactivated member, got HTTP ${failMemberAdd.status}`);
  }

  // Verify existing task remains intact and displays assignee_is_active: false
  const existingTaskRes = await request('GET', `/api/tasks/${taskId}`, null, adminToken);
  const taskData = existingTaskRes.body.task || existingTaskRes.body.data || existingTaskRes.body;
  if (taskData.assignee_is_active === false) {
    console.log('✅ Verified: Existing task preserved, and assignee_is_active is dynamically false.');
  } else {
    throw new Error(`Expected assignee_is_active to be false, got ${taskData.assignee_is_active}`);
  }

  // 6. REACTIVATE BOTH USERS
  console.log('\n--- REACTIVATING BOTH USERS ---');
  await request('PATCH', `/api/users/${testPmId}/status`, { is_active: true }, adminToken);
  await request('PATCH', `/api/users/${testMemberId}/status`, { is_active: true }, adminToken);
  console.log('✅ Project Manager and Team Member reactivated.');

  // Verify they now appear in assignment lists
  const reactivatedPmList = await request('GET', '/api/users?role=PROJECT_MANAGER&status=ACTIVE', null, adminToken);
  const pmBack = (reactivatedPmList.body.users || reactivatedPmList.body.data || []).find(u => u.id === testPmId);
  if (pmBack) {
    console.log('✅ Verified: Reactivated PM is visible in active PM list/dropdown again.');
  } else {
    throw new Error('Reactivated PM was not found in active PM list!');
  }

  const reactivatedMemberList = await request('GET', '/api/users?role=TEAM_MEMBER&status=ACTIVE', null, adminToken);
  const memberBack = (reactivatedMemberList.body.users || reactivatedMemberList.body.data || []).find(u => u.id === testMemberId);
  if (memberBack) {
    console.log('✅ Verified: Reactivated Member is visible in active Member list/dropdown again.');
  } else {
    throw new Error('Reactivated Member was not found in active Member list!');
  }

  // Verify new assignments succeed now that they are active
  const newValidProj = await request('POST', '/api/projects', {
    name: `Valid Reactivated PM Project ${uniqueId}`,
    description: 'PM is active again',
    manager_id: testPmId,
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0]
  }, adminToken);
  if (newValidProj.status === 201) {
    console.log(`✅ Verified: Successfully created project with reactivated PM: ${newValidProj.body.project.id}`);
  } else {
    throw new Error(`Failed to create project with reactivated PM: HTTP ${newValidProj.status}`);
  }

  const newValidTask = await request('POST', '/api/tasks', {
    title: `Valid Reactivated Member Task ${uniqueId}`,
    project_id: projectId,
    assigned_to: testMemberId,
    priority: 'LOW',
    deadline: new Date(Date.now() + 864000000).toISOString().split('T')[0]
  }, adminToken);
  if (newValidTask.status === 201) {
    console.log(`✅ Verified: Successfully assigned task to reactivated Member: ${newValidTask.body.task.id}`);
  } else {
    throw new Error(`Failed to assign task to reactivated member: HTTP ${newValidTask.status}`);
  }

  // Cleanup test data
  console.log('\n--- CLEANING UP TEST DATA ---');
  await request('DELETE', `/api/tasks/${newValidTask.body.task.id}`, null, adminToken);
  await request('DELETE', `/api/tasks/${taskId}`, null, adminToken);
  await request('DELETE', `/api/projects/${newValidProj.body.project.id}`, null, adminToken);
  await request('DELETE', `/api/projects/${projectId}`, null, adminToken);
  console.log('✅ Test data cleaned up.');

  console.log('\n==================================================');
  console.log('🎉 INACTIVE USER FINAL VERIFICATION COMPLETED: 100% PASS');
  console.log('==================================================');
}

run().catch(err => {
  console.error('❌ Inactive user test failed:', err);
  process.exit(1);
});
