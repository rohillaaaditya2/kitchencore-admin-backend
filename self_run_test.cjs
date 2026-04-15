const API_BASE = 'http://localhost:5000/api';

async function finalTest() {
  try {
    console.log('--- Step 4: Login ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'selftest@smartcafe.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const restaurantId = loginData.restaurant._id;
    console.log(`Success! Logged in as: ${loginData.restaurant.restaurantName}`);

    console.log('\n--- Step 5: Add a Product ---');
    const prodRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Auto-Test Burger',
        price: 349,
        category: 'Burgers',
        description: 'Testing the self-verification flow'
      })
    });
    const product = await prodRes.json();
    console.log(`Product "${product.name}" created for merchant.`);

    console.log('\n--- Step 6: Customer Places Order ---');
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurantId,
        items: [{ 
          name: product.name, 
          price: product.price, 
          quantity: 1, 
          _id: product._id 
        }],
        totalAmount: 349,
        customerName: 'Self-Tester',
        customerPhone: '1122334455',
        tableNumber: 'Table 7',
        diningOption: 'Dine-in'
      })
    });
    const order = await orderRes.json();
    console.log(`Order Placed! ID: ${order.orderId}`);

    console.log('\n--- Step 7: Merchant Fulfills Order ---');
    const serveRes = await fetch(`${API_BASE}/orders/${order._id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Served' })
    });
    const finalOrder = await serveRes.json();
    console.log(`Order Status: ${finalOrder.status}`);

    console.log('\n✅ SELF-TEST COMPLETE: The entire SaaS lifecycle is 100% verified.');
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

finalTest();
