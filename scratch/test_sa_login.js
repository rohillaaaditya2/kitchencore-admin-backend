const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Super Admin Login...');
    const res = await axios.post('http://localhost:5000/api/super-admin/login', {
      email: 'aadityarohilla668@gmail.com',
      password: 'admin123'
    });
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testLogin();
