const axios = require('axios');

async function check() {
  const urls = [
    'https://api-kitchencore-com.onrender.com/api/orders',
    'https://api-kitchencores-com.onrender.com/api/orders',
    'https://api-kitchencores.in.onrender.com/api/orders'
  ];
  
  for (const url of urls) {
    try {
      console.log(`Checking ${url}...`);
      const res = await axios.post(url, {
        restaurantId: '69e130880e5089ca33b72a34',
        items: [{ name: 'Test', price: 10, quantity: 1 }],
        totalAmount: 10,
        customerName: 'Test',
        customerPhone: '0000000000',
        tableNumber: '1'
      });
      console.log(`  Success: ${res.status}`);
    } catch (err) {
      console.log(`  Error: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
    }
  }
}
check();
