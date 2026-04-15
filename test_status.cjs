async function testStatusUpdate() {
  try {
    const API_BASE = 'http://localhost:5000/api';
    
    console.log('--- Step 1: Login ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_merchant@smartcafe.com', password: 'password123' })
    });
    const { token } = await loginRes.json();

    console.log('\n--- Step 2: Get Latest Order ---');
    const ordersRes = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await ordersRes.json();
    const latestOrder = orders[0];
    console.log(`Latest Order: ${latestOrder.orderId}, Current Status: ${latestOrder.status}`);

    console.log('\n--- Step 3: Update to Preparing ---');
    const updateRes = await fetch(`${API_BASE}/orders/${latestOrder._id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Preparing' })
    });
    console.log('Status Update (Preparing) Result:', (await updateRes.json()).status);

    console.log('\n--- Step 4: Update to Served ---');
    const updateRes2 = await fetch(`${API_BASE}/orders/${latestOrder._id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Served' })
    });
    console.log('Status Update (Served) Result:', (await updateRes2.json()).status);

    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

testStatusUpdate();
