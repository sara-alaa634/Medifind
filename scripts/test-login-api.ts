/**
 * Test Login API Endpoint
 * Makes a direct HTTP request to the login endpoint
 */

async function testLogin() {
  console.log('🔐 Testing login API endpoint...\n');
  
  const email = 'admin@medifind.com';
  const password = 'password123';
  
  console.log(`Attempting login with:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}\n`);
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('\nResponse body:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Login successful!');
      console.log(`User: ${data.user.name} (${data.user.role})`);
    } else {
      console.log('\n❌ Login failed!');
      console.log(`Error: ${data.error || data.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error making request:', error);
    console.log('\n💡 Make sure the Next.js dev server is running:');
    console.log('   npm run dev');
  }
}

testLogin();
