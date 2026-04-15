const mongoose = require('mongoose');

const API_BASE = 'http://localhost:5000/api';
const DB_URI = 'mongodb://127.0.0.1:27017/pizzatown';

async function testDashboardAndCustomer() {
  try {
    console.log('--- Step 1: Merchant Login ---');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_merchant@smartcafe.com',
        password: 'password123'
      })
    });
    const loginResult = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginResult)}`);
    const token = loginResult.token;
    const restaurantId = loginResult.restaurant._id;
    console.log('Login Successful, Restaurant ID:', restaurantId);

    console.log('\n--- Step 2: Update Business Settings ---');
    const settingsData = {
      restaurantName: 'Pizza Town Test',
      address: '123 AI Street, Tech City',
      upiId: 'test@upi',
      gstEnabled: true,
      restaurantId: restaurantId
    };
    const settingsRes = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settingsData)
    });
    const settingsResult = await settingsRes.json();
    console.log('Settings Update Result:', settingsResult.message || 'Updated');

    console.log('\n--- Step 3: Create a Product ---');
    const productData = {
      name: 'Test Pepperoni Pizza',
      description: 'Delicious pepperoni with extra cheese',
      price: 499,
      category: 'Pizza',
      restaurantId: restaurantId
    };
    const productRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });
    const productResult = await productRes.json();
    console.log('Product Created:', productResult.name);

    console.log('\n--- Step 4: Customer Flow (Place Order) ---');
    const orderData = {
      items: [{
        name: productResult.name,
        price: productResult.price,
        quantity: 2
      }],
      totalAmount: productResult.price * 2,
      tableNumber: 'T-01',
      customerPhone: '9876543210',
      restaurantId: restaurantId
    };
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const orderResult = await orderRes.json();
    console.log('Order Placed! Order ID:', orderResult.orderId);

    console.log('\n--- Step 5: Verify Order in Dashboard ---');
    const fetchOrdersRes = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await fetchOrdersRes.json();
    const foundOrder = orders.find(o => o.orderId === orderResult.orderId);
    if (foundOrder) {
      console.log('Order verified in merchant dashboard!');
    } else {
      console.log('Order NOT found in dashboard!');
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

testDashboardAndCustomer();
