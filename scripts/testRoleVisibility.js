const http = require('http');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('🛡️ TESTING ROLE VISIBILITY & PERMISSION RULES');
  console.log('====================================================\n');

  // 1. Log in all three accounts
  const adminAuth = await request('POST', '/auth/login', {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
    role: 'ADMIN',
  });
  const pmAuth = await request('POST', '/auth/login', {
    email: 'manager@knowthetask.com',
    password: 'Manager@123',
    role: 'PROJECT_MANAGER',
  });
  const memberAuth = await request('POST', '/auth/login', {
    email: 'member@knowthetask.com',
    password: 'Member@123',
    role: 'TEAM_MEMBER',
  });

  const adminToken = adminAuth.body.token;
  const adminId = adminAuth.body.user.id;
  const pmToken = pmAuth.body.token;
  const memberToken = memberAuth.body.token;

  console.log('✅ 1. Authenticated all 3 demo accounts successfully.');

  // 2. Test Admin Visibility
  console.log('\n--- 2. ADMIN VISIBILITY TEST ---');
  const adminUsersRes = await request('GET', '/users', null, adminToken);
  const adminUserRoles = adminUsersRes.body.users.map((u) => u.role);
  const hasAdmin = adminUserRoles.includes('ADMIN');
  const hasPM = adminUserRoles.includes('PROJECT_MANAGER');
  const hasMember = adminUserRoles.includes('TEAM_MEMBER');

  console.log(`Admin sees total users: ${adminUsersRes.body.count}`);
  console.log(`Roles seen by Admin: ${[...new Set(adminUserRoles)].join(', ')}`);
  console.log(`Admin can see Admin: ${hasAdmin}`);
  console.log(`Admin can see Project Manager: ${hasPM}`);
  console.log(`Admin can see Team Member: ${hasMember}`);

  if (!hasAdmin || !hasPM || !hasMember) {
    throw new Error('Admin visibility check failed: Admin must see all roles');
  }

  // 3. Test Project Manager Visibility
  console.log('\n--- 3. PROJECT MANAGER VISIBILITY TEST ---');
  const pmUsersRes = await request('GET', '/users', null, pmToken);
  const pmSeenAdmins = pmUsersRes.body.users.filter((u) => u.role === 'ADMIN');
  const pmSeenEmails = pmUsersRes.body.users.map((u) => u.email);

  console.log(`Project Manager sees total users: ${pmUsersRes.body.count}`);
  console.log(`Admin users in PM response: ${pmSeenAdmins.length}`);
  console.log(`Does PM see admin@knowthetask.com? ${pmSeenEmails.includes('admin@knowthetask.com')}`);
  console.log(`Users visible to PM:`);
  pmUsersRes.body.users.forEach((u) => console.log(` - ${u.name} (${u.email}) [${u.role}]`));

  if (pmSeenAdmins.length > 0 || pmSeenEmails.includes('admin@knowthetask.com')) {
    throw new Error('SECURITY VIOLATION: Project Manager can see Admin users!');
  }

  // Direct enumeration attempt by PM: GET /api/users?role=ADMIN
  const pmAdminQuery = await request('GET', '/users?role=ADMIN', null, pmToken);
  console.log(`Direct query /users?role=ADMIN by PM: count=${pmAdminQuery.body.count} (Must be 0)`);
  if (pmAdminQuery.body.count !== 0 || pmAdminQuery.body.users.length !== 0) {
    throw new Error('SECURITY VIOLATION: PM discovered Admins via ?role=ADMIN query!');
  }

  // Direct enumeration attempt by PM: GET /api/users/:adminId
  const pmDirectAdminGet = await request('GET', `/users/${adminId}`, null, pmToken);
  console.log(`Direct GET /users/<admin-uuid> by PM: status=${pmDirectAdminGet.status} (Must be 404)`);
  if (pmDirectAdminGet.status !== 404) {
    throw new Error('SECURITY VIOLATION: PM accessed Admin profile via direct ID!');
  }

  // 4. Test Team Member Visibility
  console.log('\n--- 4. TEAM MEMBER VISIBILITY TEST ---');
  const memberUsersRes = await request('GET', '/users', null, memberToken);
  const memberSeenAdmins = memberUsersRes.body.users.filter((u) => u.role === 'ADMIN');
  const memberSeenEmails = memberUsersRes.body.users.map((u) => u.email);

  console.log(`Team Member sees total users: ${memberUsersRes.body.count}`);
  console.log(`Admin users in Team Member response: ${memberSeenAdmins.length}`);
  console.log(`Does Team Member see admin@knowthetask.com? ${memberSeenEmails.includes('admin@knowthetask.com')}`);
  console.log(`Users visible to Team Member:`);
  memberUsersRes.body.users.forEach((u) => console.log(` - ${u.name} (${u.email}) [${u.role}]`));

  if (memberSeenAdmins.length > 0 || memberSeenEmails.includes('admin@knowthetask.com')) {
    throw new Error('SECURITY VIOLATION: Team Member can see Admin users!');
  }

  // Direct enumeration attempt by Member: GET /api/users?role=ADMIN
  const memberAdminQuery = await request('GET', '/users?role=ADMIN', null, memberToken);
  console.log(`Direct query /users?role=ADMIN by Member: count=${memberAdminQuery.body.count} (Must be 0)`);
  if (memberAdminQuery.body.count !== 0 || memberAdminQuery.body.users.length !== 0) {
    throw new Error('SECURITY VIOLATION: Team Member discovered Admins via ?role=ADMIN query!');
  }

  // Direct enumeration attempt by Member: GET /api/users/:adminId
  const memberDirectAdminGet = await request('GET', `/users/${adminId}`, null, memberToken);
  console.log(`Direct GET /users/<admin-uuid> by Member: status=${memberDirectAdminGet.status} (Must be 404)`);
  if (memberDirectAdminGet.status !== 404) {
    throw new Error('SECURITY VIOLATION: Team Member accessed Admin profile via direct ID!');
  }

  // 5. Test Role Mismatch Security on Login
  console.log('\n--- 5. ROLE LOGIN PERMISSION MISMATCH TESTS ---');
  const test1 = await request('POST', '/auth/login', {
    email: 'member@knowthetask.com',
    password: 'Member@123',
    role: 'ADMIN',
  });
  console.log(`Member attempting Admin role: status=${test1.status}, message="${test1.body.message}"`);
  if (test1.status !== 403 || test1.body.message !== 'You do not have permission to login as Admin.') {
    throw new Error('Role mismatch test 1 failed');
  }

  const test2 = await request('POST', '/auth/login', {
    email: 'manager@knowthetask.com',
    password: 'Manager@123',
    role: 'TEAM_MEMBER',
  });
  console.log(`PM attempting Team Member role: status=${test2.status}, message="${test2.body.message}"`);
  if (test2.status !== 403 || test2.body.message !== 'You do not have permission to login as Team Member.') {
    throw new Error('Role mismatch test 2 failed');
  }

  const test3 = await request('POST', '/auth/login', {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
    role: 'PROJECT_MANAGER',
  });
  console.log(`Admin attempting PM role: status=${test3.status}, message="${test3.body.message}"`);
  if (test3.status !== 403 || test3.body.message !== 'You do not have permission to login as Project Manager.') {
    throw new Error('Role mismatch test 3 failed');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL ROLE VISIBILITY & PERMISSION TESTS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
