/**
 * Test script to verify analytics API with authentication
 */

// First, login to get the auth token
async function testAnalyticsAPI() {
  console.log('🔐 Step 1: Logging in...\n');
  
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medifind.com',
      password: 'password123',
    }),
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    return;
  }

  const loginData = await loginResponse.json();
  console.log('✅ Login successful');
  console.log('Token:', loginData.token.substring(0, 20) + '...\n');

  // Extract cookie from response
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log('Set-Cookie header:', setCookieHeader, '\n');

  // Now test analytics API with the token
  console.log('📊 Step 2: Fetching analytics...\n');
  
  const analyticsResponse = await fetch('http://localhost:3000/api/analytics/admin', {
    headers: {
      'Cookie': setCookieHeader || `auth-token=${loginData.token}`,
    },
  });

  console.log('Response status:', analyticsResponse.status);
  
  if (!analyticsResponse.ok) {
    const errorData = await analyticsResponse.json();
    console.error('❌ Analytics API failed:', errorData);
    return;
  }

  const analyticsData = await analyticsResponse.json();
  console.log('✅ Analytics fetched successfully:\n');
  console.log(JSON.stringify(analyticsData, null, 2));
}

testAnalyticsAPI().catch(console.error);
