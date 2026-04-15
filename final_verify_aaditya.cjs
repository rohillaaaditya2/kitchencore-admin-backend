const API_BASE = 'http://localhost:5000/api';

async function verifyEverything() {
  try {
    console.log('--- Step 1: Login ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aadityarohilla668@gmail.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.token;
    const restaurantId = loginData.restaurant._id;
    console.log(`Success! Logged in as: ${loginData.restaurant.restaurantName} (ID: ${restaurantId})`);

    console.log('\n--- Step 2: Create a Product ---');
    const prodRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Verification Pizza',
        price: 499,
        category: 'Pizza',
        description: 'Testing the full flow'
      })
    });
    const product = await prodRes.json();
    console.log(`Product Created: ${product.name} (ID: ${product._id})`);

    console.log('\n--- Step 3: Customer Places Order ---');
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurantId,
        items: [{ 
          name: product.name, 
          price: product.price, 
          quantity: 2, 
          _id: product._id 
        }],
        totalAmount: 998,
        customerName: 'Aaditya Test',
        customerPhone: '9876543210',
        tableNumber: 'T-05',
        diningOption: 'Dine-in'
      })
    });
    if (!orderRes.ok) throw new Error('Order placement failed: ' + await orderRes.text());
    const order = await orderRes.json();
    console.log(`Order Placed! Order ID: ${order.orderId} (DB ID: ${order._id})`);

    console.log('\n--- Step 4: Merchant Confirms Order ---');
    const confirmRes = await fetch(`${API_BASE}/orders/${order._id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Preparing' })
    });
    const updatedOrder = await confirmRes.json();
    console.log(`Order Status Updated to: ${updatedOrder.status}`);

    console.log('\n--- Step 5: Final Verification ---');
    const finalRes = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const merchantOrders = await finalRes.json();
    const found = merchantOrders.find(o => o._id === order._id);
    if (found) {
        console.log('✅ COMPLETE FLOW VERIFIED: Merchant can see and manage the customer order.');
    } else {
        throw new Error('Order not found in merchant dashboard!');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyEverything();
