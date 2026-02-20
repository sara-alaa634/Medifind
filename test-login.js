// Quick test script to check login flow
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'pharmacy1@example.com',
        password: 'password123'
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response:', data);
    
    // Check if cookie was set
    console.log('Cookies:', document.cookie);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testLogin();
