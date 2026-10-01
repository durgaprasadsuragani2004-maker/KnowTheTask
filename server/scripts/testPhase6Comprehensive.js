const API_BASE = 'http://localhost:5001/api';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function runTests() {
  console.log('========================================================');
  console.log('🚀 STARTING COMPREHENSIVE PHASE 6 AUTOMATED VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Login as Admin
    console.log('--- Step 1: Admin Login ---');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@knowthetask.com',
        password: 'Admin@123',
      },
    });
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'ADMIN', 'Admin logged in successfully');

    // 2. Fetch users with live workload counts
    console.log('\n--- Step 2: Users List with Workload Counts ---');
    const usersRes = await request('/users?sort=tasks_desc', { headers: adminHeaders });
    assert(usersRes.status === 200 && Array.isArray(usersRes.data.users), 'Retrieved users directory');
    const sampleUser = usersRes.data.users[0];
    assert(
      sampleUser && sampleUser.projects_count !== undefined && sampleUser.tasks_count !== undefined,
      `User object includes live workload metrics: ${sampleUser?.name} (Projects: ${sampleUser?.projects_count}, Tasks: ${sampleUser?.tasks_count})`
    );

    // 3. Test Assignable Endpoint (Part 13 Critical Fix)
    console.log('\n--- Step 3: Critical Fix - Backend Assignable Endpoint ---');
    const assignableRes = await request('/users/assignable', { headers: adminHeaders });
    assert(assignableRes.status === 200, 'GET /api/users/assignable returned 200');
    const assignableUsers = assignableRes.data.users;
    const hasInactive = assignableUsers.some((u) => u.is_active === false);
    const hasAdmin = assignableUsers.some((u) => u.role === 'ADMIN');
    assert(!hasInactive, 'Assignable list strictly excludes all inactive users');
    assert(!hasAdmin, 'Assignable list strictly excludes Admin accounts');

    // 4. Create a test team member for profile edit, password reset, and role change tests
    console.log('\n--- Step 4: Admin Create Fresh Test User ---');
    const uniqueId = Date.now();
    const testEmail = `testuser_${uniqueId}@knowthetask.com`;
    const createRes = await request('/users', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Test Profile User',
        email: testEmail,
        password: 'Password@123',
        role: 'TEAM_MEMBER',
      },
    });
    assert(createRes.status === 201, `Created fresh test user: ${testEmail}`);
    const testUserId = createRes.data.user.id;

    // 5. Admin Edits Full Name
    console.log('\n--- Step 5: Admin Edits Full Name ---');
    const updateNameRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { name: 'Updated Full Name' },
    });
    assert(updateNameRes.status === 200, 'Admin updated user full name');
    assert(updateNameRes.data.user.name === 'Updated Full Name', 'Returned user object has updated name');

    // 6. Admin Edits Email and Verifies Authentication with New Email
    console.log('\n--- Step 6: Admin Edits Email & Authentication Verification ---');
    const newEmail = `updated_${uniqueId}@knowthetask.com`;
    const updateEmailRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { email: newEmail },
    });
    assert(updateEmailRes.status === 200, 'Admin updated user email');
    assert(updateEmailRes.data.user.email === newEmail, 'User email updated in database');

    // Test Duplicate Email Prevention
    const dupRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { email: 'admin@knowthetask.com' },
    });
    assert(dupRes.status === 400 || dupRes.status === 409, `Duplicate email correctly rejected (HTTP ${dupRes.status}): "${dupRes.data?.message}"`);

    // 7. Admin Changes User Password & Verifies Login with New Password
    console.log('\n--- Step 7: Admin Changes Password & Verifies Login ---');
    const newPassword = 'NewSecretPassword@456';
    const updatePassRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { password: newPassword },
    });
    assert(updatePassRes.status === 200, 'Admin successfully updated user password');

    // Verify login works with new password
    const testUserLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: newEmail,
        password: newPassword,
      },
    });
    assert(testUserLogin.status === 200 && testUserLogin.data.token, 'Test user authenticated with new password');

    // 8. Role Change Security: Prevent Demoting / Removing Final Admin
    console.log('\n--- Step 8: Role Change Security Guards ---');
    const demoteAdminRes = await request(`/users/${adminLogin.data.user.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { role: 'TEAM_MEMBER' },
    });
    assert(
      demoteAdminRes.status === 400 && demoteAdminRes.data?.message?.includes('Admin'),
      `Demoting last admin blocked: "${demoteAdminRes.data?.message}"`
    );

    // Prevent Deactivating Final Admin
    const deactAdminRes = await request(`/users/${adminLogin.data.user.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { is_active: false },
    });
    assert(
      deactAdminRes.status === 400,
      `Deactivating last admin blocked: "${deactAdminRes.data?.message}"`
    );

    // 9. Role Change: Team Member -> Project Manager
    console.log('\n--- Step 9: Role Change TEAM_MEMBER -> PROJECT_MANAGER ---');
    const promoteRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { role: 'PROJECT_MANAGER' },
    });
    assert(promoteRes.status === 200 && promoteRes.data.user.role === 'PROJECT_MANAGER', 'User promoted to PROJECT_MANAGER');

    // Re-login to get updated JWT token with PROJECT_MANAGER role
    const pmLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: newEmail,
        password: newPassword,
      },
    });
    assert(pmLogin.data.user.role === 'PROJECT_MANAGER', 'New session has PROJECT_MANAGER role');
    const pmHeaders = { Authorization: `Bearer ${pmLogin.data.token}` };

    // 10. Role Change: Project Manager -> Team Member and Authorization Enforcement
    console.log('\n--- Step 10: Role Change PROJECT_MANAGER -> TEAM_MEMBER & Backend Authorization ---');
    const demoteRes = await request(`/users/${testUserId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { role: 'TEAM_MEMBER' },
    });
    assert(demoteRes.status === 200 && demoteRes.data.user.role === 'TEAM_MEMBER', 'User demoted back to TEAM_MEMBER');

    // Re-login to get updated JWT token with TEAM_MEMBER role
    const tmLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: newEmail,
        password: newPassword,
      },
    });
    assert(tmLogin.data.user.role === 'TEAM_MEMBER', 'New session has TEAM_MEMBER role');
    const tmHeaders = { Authorization: `Bearer ${tmLogin.data.token}` };

    // Team Member cannot create projects (backend authorization check)
    const unauthorizedProjRes = await request('/projects', {
      method: 'POST',
      headers: tmHeaders,
      body: {
        name: 'Unauthorized Project',
        start_date: '2026-10-10',
        deadline: '2026-11-10',
      },
    });
    assert(unauthorizedProjRes.status === 403, 'Team member forbidden from creating projects (HTTP 403)');

    // 11. Workload Analytics Authorization (Admin vs PM vs Team Member)
    console.log('\n--- Step 11: Workload Analytics Scoping & Authorization ---');
    // Admin request
    const adminWorkloadRes = await request('/analytics/workload', { headers: adminHeaders });
    assert(
      adminWorkloadRes.status === 200 &&
      Array.isArray(adminWorkloadRes.data.managers) &&
      Array.isArray(adminWorkloadRes.data.members),
      'Admin workload analytics returns managers and members distribution'
    );

    // Team Member request (must be 403)
    const tmWorkloadRes = await request('/analytics/workload', { headers: tmHeaders });
    assert(tmWorkloadRes.status === 403, 'Team member correctly denied workload analytics (HTTP 403 Forbidden)');

    // 12. User Workload Details Endpoint
    console.log('\n--- Step 12: User Workload Details ---');
    const userWorkloadRes = await request(`/users/${testUserId}/workload`, { headers: adminHeaders });
    assert(
      userWorkloadRes.status === 200 &&
      userWorkloadRes.data.workload &&
      Array.isArray(userWorkloadRes.data.projects) &&
      Array.isArray(userWorkloadRes.data.tasks),
      'GET /api/users/:id/workload returns detailed project and task records'
    );

    // 13. Active / Inactive Assignment Bug Fix
    console.log('\n--- Step 13: Inactive User Assignment Validation ---');
    // Deactivate test user
    await request(`/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { is_active: false },
    });
    const assignableAfterDeact = await request('/users/assignable', { headers: adminHeaders });
    const inAssignable = assignableAfterDeact.data.users.some((u) => u.id === testUserId);
    assert(!inAssignable, 'Deactivated user immediately disappears from backend assignable query');

    // Reactivate test user
    await request(`/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { is_active: true },
    });
    const assignableAfterReact = await request('/users/assignable', { headers: adminHeaders });
    const inAssignableNow = assignableAfterReact.data.users.some((u) => u.id === testUserId);
    assert(inAssignableNow, 'Reactivated user immediately returns to backend assignable query');

    // 14. Safe Deletion Tests
    console.log('\n--- Step 14: Safe Deletion Rules ---');
    // A user with historical project/task/comment records (e.g. seeded member)
    const seededUser = usersRes.data.users.find((u) => u.tasks_count > 0 || u.projects_count > 0);
    if (seededUser) {
      const blockedDeleteRes = await request(`/users/${seededUser.id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      assert(
        blockedDeleteRes.status === 400 && blockedDeleteRes.data?.has_history === true,
        `Safe deletion blocked for historical user (${seededUser.name}): "${blockedDeleteRes.data?.message}"`
      );
    }

    // Permanent delete of our test user (who has 0 historical records)
    const cleanDeleteRes = await request(`/users/${testUserId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(cleanDeleteRes.status === 200, 'Safe deletion succeeds for user with 0 historical records');

    // 15. Verify Swagger Docs Endpoint
    console.log('\n--- Step 15: API Documentation Health ---');
    const docsRes = await request('http://localhost:5001/api/docs');
    assert(docsRes.status === 200, 'Swagger API Documentation is accessible at http://localhost:5001/api/docs');

  } catch (error) {
    console.error('Unexpected test error:', error);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
