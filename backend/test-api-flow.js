async function apiCall(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`http://localhost:3001/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }
  return { status: res.status, data };
}

async function runTest() {
  console.log('--- Starting Full Flow API Test ---');

  // Step 1: Clear DB first (so we can start from setup)
  console.log('\n[0] Clearing database for fresh test...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
  console.log('✅ Database users cleared.');

  // Step 1: Check setup status
  console.log('\n[1] Checking setup status...');
  const res1 = await apiCall('GET', '/setup/status');
  console.log('Response:', res1.data);
  if (res1.data.needsSetup !== true) {
    console.error('❌ Setup should be needed, but got:', res1.data);
    return;
  }
  console.log('✅ Setup is required.');

  // Step 2: Create admin user
  console.log('\n[2] Creating admin user "admin" with password "1234"...');
  const res2 = await apiCall('POST', '/setup/initialize', { name: 'admin', password: '1234' });
  if (res2.status !== 201) {
    console.error('❌ Failed to initialize setup:', res2.data);
    return;
  }
  console.log('✅ Admin user created. Received token.');
  const adminToken = res2.data.token;

  // Step 2b: Test admin login
  console.log('\n[2b] Testing admin login...');
  const res3 = await apiCall('POST', '/auth/login', { name: 'admin', password: '1234' });
  if (res3.status !== 200) {
    console.error('❌ Admin login failed:', res3.data);
    return;
  }
  console.log('✅ Admin login successful.');

  // Step 3: Create pharmacist user
  console.log('\n[3] Creating pharmacist user "pharmacist" with password "5678"...');
  const res4 = await apiCall('POST', '/auth/register', { name: 'pharmacist', password: '5678', role: 'PHARMACIST' }, adminToken);
  if (res4.status !== 201) {
    console.error('❌ Failed to create pharmacist user:', res4.data);
    return;
  }
  console.log('✅ Pharmacist user created.');

  // Step 4: Login as pharmacist
  console.log('\n[4] Testing pharmacist login...');
  const res5 = await apiCall('POST', '/auth/login', { name: 'pharmacist', password: '5678' });
  if (res5.status !== 200) {
    console.error('❌ Pharmacist login failed:', res5.data);
    return;
  }
  console.log('✅ Pharmacist login successful.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTest().catch(console.error);
