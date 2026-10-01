const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
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
    req.write(bodyStr);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
        method: 'GET',
        headers: {
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
    req.end();
  });
}

function patch(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
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
    req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 1 Automated Verification Suite...\n');

  const BASE_URL = 'http://localhost:5001/api';

  // Test 1: Health
  const health = await get(`${BASE_URL}/health`);
  console.log(`[TEST 1] GET /api/health -> Status: ${health.status} (${health.body.status})`);
  if (health.status !== 200) throw new Error('Health check failed');

  // Test 2: Admin Login
  const adminLogin = await post(`${BASE_URL}/auth/login`, {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
    role: 'ADMIN',
  });
  console.log(`[TEST 2] Admin Login -> Status: ${adminLogin.status}, Role: ${adminLogin.body.user?.role}`);
  if (adminLogin.status !== 200 || adminLogin.body.user?.role !== 'ADMIN') {
    throw new Error('Admin login failed');
  }
  const adminToken = adminLogin.body.token;

  // Test 3: Project Manager Login
  const pmLogin = await post(`${BASE_URL}/auth/login`, {
    email: 'manager@knowthetask.com',
    password: 'Manager@123',
    role: 'PROJECT_MANAGER',
  });
  console.log(`[TEST 3] PM Login -> Status: ${pmLogin.status}, Role: ${pmLogin.body.user?.role}`);
  if (pmLogin.status !== 200 || pmLogin.body.user?.role !== 'PROJECT_MANAGER') {
    throw new Error('PM login failed');
  }

  // Test 4: Team Member Login
  const memberLogin = await post(`${BASE_URL}/auth/login`, {
    email: 'member@knowthetask.com',
    password: 'Member@123',
    role: 'TEAM_MEMBER',
  });
  console.log(`[TEST 4] Team Member Login -> Status: ${memberLogin.status}, Role: ${memberLogin.body.user?.role}`);
  if (memberLogin.status !== 200 || memberLogin.body.user?.role !== 'TEAM_MEMBER') {
    throw new Error('Team member login failed');
  }
  const memberToken = memberLogin.body.token;

  // Test 5: Role Mismatch: Team Member credentials with Admin role requested
  const mismatch1 = await post(`${BASE_URL}/auth/login`, {
    email: 'member@knowthetask.com',
    password: 'Member@123',
    role: 'ADMIN',
  });
  console.log(`[TEST 5] Role Mismatch (Member as Admin) -> Status: ${mismatch1.status}, Message: "${mismatch1.body.message}"`);
  if (mismatch1.status !== 403 || mismatch1.body.message !== 'You do not have permission to login as Admin.') {
    throw new Error('Role mismatch test 1 failed');
  }

  // Test 6: Role Mismatch: Admin credentials with Project Manager role requested
  const mismatch2 = await post(`${BASE_URL}/auth/login`, {
    email: 'admin@knowthetask.com',
    password: 'Admin@123',
    role: 'PROJECT_MANAGER',
  });
  console.log(`[TEST 6] Role Mismatch (Admin as PM) -> Status: ${mismatch2.status}, Message: "${mismatch2.body.message}"`);
  if (mismatch2.status !== 403 || mismatch2.body.message !== 'You do not have permission to login as Project Manager.') {
    throw new Error('Role mismatch test 2 failed');
  }

  // Test 7: Verify /auth/me
  const meRes = await get(`${BASE_URL}/auth/me`, adminToken);
  console.log(`[TEST 7] GET /auth/me (Admin) -> Status: ${meRes.status}, User: ${meRes.body.user?.name}`);
  if (meRes.status !== 200 || meRes.body.user?.email !== 'admin@knowthetask.com') {
    throw new Error('/auth/me failed');
  }

  // Test 8: Fetch Projects
  const projRes = await get(`${BASE_URL}/projects`, adminToken);
  console.log(`[TEST 8] GET /projects -> Status: ${projRes.status}, Found: ${projRes.body.count} projects`);
  if (projRes.status !== 200 || projRes.body.count < 1) {
    throw new Error('Fetch projects failed');
  }

  // Test 9: Fetch Tasks
  const taskRes = await get(`${BASE_URL}/tasks`, memberToken);
  console.log(`[TEST 9] GET /tasks (Member) -> Status: ${taskRes.status}, Found: ${taskRes.body.count} tasks`);
  if (taskRes.status !== 200 || taskRes.body.count < 1) {
    throw new Error('Fetch tasks failed');
  }

  // Test 10: Update Task Status
  const testTaskId = taskRes.body.tasks[0].id;
  const updateStatusRes = await patch(
    `${BASE_URL}/tasks/${testTaskId}/status`,
    { status: 'COMPLETED' },
    memberToken
  );
  console.log(`[TEST 10] PATCH /tasks/${testTaskId}/status -> Status: ${updateStatusRes.status}, New Task Status: ${updateStatusRes.body.task?.status}`);
  if (updateStatusRes.status !== 200 || updateStatusRes.body.task?.status !== 'COMPLETED') {
    throw new Error('Update task status failed');
  }

  console.log('\n🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
