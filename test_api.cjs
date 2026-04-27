const axios = require('axios');

async function check() {
  try {
    const res = await axios.post('https://api-kitchencore-com.onrender.com/api/orders', {
      restaurantId: '69e130880e5089ca33b72a34',
      items: [{ name: 'Test', price: 10, quantity: 1 }],
      totalAmount: 10,
      customerName: 'Test',
      customerPhone: '0000000000',
      tableNumber: '1'
    });
    console.log('Success:', res.status);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}
check();
