const Order = require('../models/Order');
const Purchase = require('../models/Purchase');
const Ingredient = require('../models/Ingredient');
const Customer = require('../models/Customer');
const InventoryLog = require('../models/InventoryLog');
const PDFDocument = require('pdfkit-table');
const mongoose = require('mongoose');

// Helper to get date range
const getDateRange = (range, customStart, customEnd) => {
  let start = new Date();
  let end = new Date();
  
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === '7days') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (range === '30days') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }
  
  return { $gte: start, $lte: end };
};

exports.getReportsData = async (req, res) => {
  try {
    const { range, start, end } = req.query;
    const restaurantId = req.restaurantId;
    const dateQuery = getDateRange(range, start, end);
    
    const queryId = new mongoose.Types.ObjectId(restaurantId);

    // 1. Sales Data - Using multi-type query for ID and precise date filter
    const orders = await Order.find({ 
      $or: [
        { restaurantId: restaurantId }, 
        { restaurantId: queryId }
      ],
      createdAt: dateQuery
    });
    
    console.log(`Reports: Found ${orders.length} orders for RID ${restaurantId} in range ${range}`);

    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const pendingPayments = orders.filter(o => o.paymentStatus === 'Pending').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const paidSales = totalSales - pendingPayments;

    const paymentSplit = orders.reduce((acc, o) => {
      const method = o.paymentMethod || 'Cash';
      acc[method] = (acc[method] || 0) + (o.totalAmount || 0);
      return acc;
    }, {});

    // 2. Purchase Data
    const purchases = await Purchase.find({ restaurantId, purchaseDate: dateQuery });
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // 3. Inventory Stats (Current)
    const ingredients = await Ingredient.find({ restaurantId });
    const lowStockItems = ingredients.filter(i => i.quantity < (i.lowStockThreshold || 10));

    // 4. Expense Data
    const Expense = mongoose.model('Expense');
    const expenses = await Expense.find({ restaurantId, date: dateQuery });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Customer Stats
    const totalCustomers = await Customer.countDocuments({ restaurantId });
    const returningCustomers = await Customer.countDocuments({ restaurantId, totalOrders: { $gt: 1 } });
    
    // 6. Kitchen Performance
    const servedOrders = orders.filter(o => o.status === 'Served' && o.createdAt && o.servedAt);
    let avgFulfillmentTime = 0;
    let avgPrepTime = 0;
    let lateOrders = 0;

    if (servedOrders.length > 0) {
      const totalFulfillment = servedOrders.reduce((sum, o) => sum + (new Date(o.servedAt) - new Date(o.createdAt)), 0);
      avgFulfillmentTime = Math.floor(totalFulfillment / servedOrders.length / 60000); // mins

      const prepOrders = servedOrders.filter(o => o.preparingAt && o.readyAt);
      if (prepOrders.length > 0) {
        const totalPrep = prepOrders.reduce((sum, o) => sum + (new Date(o.readyAt) - new Date(o.preparingAt)), 0);
        avgPrepTime = Math.floor(totalPrep / prepOrders.length / 60000); // mins
      }

      lateOrders = servedOrders.filter(o => {
        const duration = (new Date(o.servedAt) - new Date(o.createdAt)) / 60000;
        return duration > (o.estimatedPrepTime || 15);
      }).length;
    }

    // 7. Profit (Sales - Purchases - Expenses)
    const profit = totalSales - totalPurchaseCost - totalExpenses;

    res.json({
      debugId: restaurantId,
      sales: { 
        totalSales: totalSales || 0, 
        totalOrders: totalOrders || 0, 
        pendingPayments: pendingPayments || 0,
        paidSales: paidSales || 0,
        paymentSplit: paymentSplit || {} 
      },
      purchases: { 
        totalPurchaseCost: totalPurchaseCost || 0, 
        count: purchases.length || 0 
      },
      inventory: { 
        totalItems: ingredients.length || 0, 
        lowStockCount: lowStockItems.length || 0 
      },
      customers: { 
        totalCustomers: totalCustomers || 0, 
        returningCustomers: returningCustomers || 0 
      },
      profit: { 
        revenue: totalSales || 0, 
        cost: totalPurchaseCost || 0, 
        net: profit || 0 
      },
      performance: {
        avgFulfillmentTime: avgFulfillmentTime || 0,
        avgPrepTime: avgPrepTime || 0,
        lateOrdersCount: lateOrders || 0,
        efficiencyScore: servedOrders.length ? Math.round(((servedOrders.length - lateOrders) / servedOrders.length) * 100) : 100
      }
    });
  } catch (err) {
    console.error('Reports Data Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const puppeteer = require('puppeteer');

exports.exportPDF = async (req, res) => {
  try {
    const { type, range, start, end } = req.query;
    const restaurantId = req.restaurantId;
    const dateQuery = getDateRange(range, start, end);
    const queryId = new mongoose.Types.ObjectId(restaurantId);
    
    const restaurant = await mongoose.model('Restaurant').findById(queryId);

    if (type === 'sales') {
      const orders = await Order.find({ 
        $or: [
          { restaurantId: restaurantId }, 
          { restaurantId: queryId }
        ],
        createdAt: dateQuery 
      }).sort({ createdAt: -1 });

      const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
      
      const cashTotal = orders.filter(o => o.paymentMethod === 'Cash' && o.paymentStatus === 'Paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const qrTotal = orders.filter(o => (o.paymentMethod === 'QR' || o.paymentMethod === 'Online') && o.paymentStatus === 'Paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const pendingTotal = orders.filter(o => o.paymentStatus === 'Pending').reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
              body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; background: white; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
              .logo-section h1 { color: #f97316; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
              .logo-section p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
              .report-info { text-align: right; }
              .report-info h2 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; }
              .report-info p { margin: 4px 0 0; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; }
              
              .summary-grid { display: flex; gap: 15px; margin-bottom: 30px; }
              .summary-card { flex: 1; background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #e2e8f0; }
              .summary-card h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; }
              .summary-card p { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
              
              .payment-bar { display: flex; gap: 30px; margin-bottom: 30px; padding: 20px; background: white; border-radius: 20px; border: 1px solid #e2e8f0; }
              .payment-item { display: flex; flex-direction: column; }
              .payment-label { font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
              .payment-value { font-size: 16px; font-weight: 700; }
              .text-emerald { color: #10b981; }
              .text-amber { color: #f59e0b; }
              
              table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }
              th { text-align: left; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 12px 15px; letter-spacing: 0.05em; }
              th:first-child { border-top-left-radius: 12px; }
              th:last-child { border-top-right-radius: 12px; }
              td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 500; }
              tr:nth-child(even) { background: #f8fafc; }
              tr:last-child td:first-child { border-bottom-left-radius: 12px; }
              tr:last-child td:last-child { border-bottom-right-radius: 12px; }
              
              .badge { padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
              .badge-paid { background: #d1fae5; color: #065f46; }
              .badge-pending { background: #fef3c7; color: #92400e; }
              
              .footer { text-align: center; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 20px; color: #94a3b8; font-size: 10px; font-weight: 600; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="logo-section">
                  <h1>KitchenCore</h1>
                  <p>${restaurant?.restaurantName || 'Restaurant Management'}</p>
              </div>
              <div class="report-info">
                  <h2>SALES REPORT</h2>
                  <p>${range.toUpperCase()} • ${new Date(dateQuery.$gte).toLocaleDateString()} - ${new Date(dateQuery.$lte).toLocaleDateString()}</p>
              </div>
          </div>
          
          <div class="summary-grid">
              <div class="summary-card">
                  <h3>Total Revenue</h3>
                  <p>₹${totalSales.toLocaleString()}</p>
              </div>
              <div class="summary-card">
                  <h3>Order Count</h3>
                  <p>${totalOrders}</p>
              </div>
              <div class="summary-card">
                  <h3>Avg Order Value</h3>
                  <p>₹${avgOrderValue.toLocaleString()}</p>
              </div>
          </div>
          
          <div class="payment-bar">
              <div class="payment-item">
                  <span class="payment-label">Cash Collected</span>
                  <span class="payment-value text-emerald">₹${cashTotal.toLocaleString()}</span>
              </div>
              <div class="payment-item">
                  <span class="payment-label">QR / Online</span>
                  <span class="payment-value text-emerald">₹${qrTotal.toLocaleString()}</span>
              </div>
              <div class="payment-item">
                  <span class="payment-label">Total Pending</span>
                  <span class="payment-value text-amber">₹${pendingTotal.toLocaleString()}</span>
              </div>
          </div>
          
          <table>
              <thead>
                  <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                  </tr>
              </thead>
              <tbody>
                  ${orders.map(o => `
                  <tr>
                      <td style="font-weight: 700; color: #0f172a;">#${o.orderId || o._id.toString().slice(-6)}</td>
                      <td>${o.customerName || 'Walk-in'}</td>
                      <td style="font-weight: 700; color: #0f172a;">₹${(o.totalAmount || 0).toLocaleString()}</td>
                      <td style="color: #64748b;">${o.paymentMethod === 'PAY_LATER' ? 'Credit' : (o.paymentMethod || 'Cash')}</td>
                      <td><span class="badge badge-${(o.paymentStatus || 'Paid').toLowerCase()}">${o.paymentStatus || 'Paid'}</span></td>
                      <td style="color: #64748b;">${new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                  `).join('')}
              </tbody>
          </table>
          
          <div class="footer">
              This report was automatically generated via KitchenCore Business Suite on ${new Date().toLocaleString()}
          </div>
      </body>
      </html>
      `;

      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=KitchenCore_Sales_Report.pdf`);
      return res.send(pdfBuffer);
    } 

    // Legacy PDFKit fallback for other report types
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=KitchenCore_${type}_Report.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#f97316').text('KitchenCore', { align: 'right' });
    doc.fontSize(10).fillColor('#64748b').text(restaurant?.restaurantName || 'Restaurant Report', { align: 'right' });
    doc.moveDown();

    doc.fontSize(18).fillColor('#0f172a').text(`${type.toUpperCase()} REPORT`, { underline: true });
    doc.fontSize(10).fillColor('#64748b').text(`Period: ${range} (${new Date(dateQuery.$gte).toLocaleDateString()} - ${new Date(dateQuery.$lte).toLocaleDateString()})`);
    doc.moveDown();

    if (type === 'inventory') {
      const ingredients = await Ingredient.find({ restaurantId });
      const table = {
        title: "Current Inventory Status",
        headers: ["Name", "Category", "Stock", "Unit", "Avg Cost", "Value"],
        rows: ingredients.map(i => [
          i.name,
          i.category,
          i.quantity.toString(),
          i.unit,
          `Rs. ${i.avgCost.toFixed(2)}`,
          `Rs. ${(i.quantity * i.avgCost).toFixed(2)}`
        ])
      };
      await doc.table(table, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(10) });
    }

    else if (type === 'purchases') {
      const purchases = await Purchase.find({ restaurantId, purchaseDate: dateQuery }).sort({ purchaseDate: -1 });
      const total = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

      doc.fontSize(12).text(`Total Purchase Spending: Rs. ${total.toLocaleString()}`);
      doc.moveDown();

      const table = {
        title: "Purchase History",
        headers: ["Date", "Supplier", "Amount", "Payment", "Items"],
        rows: purchases.map(p => [
          new Date(p.purchaseDate).toLocaleDateString(),
          p.supplierName,
          `Rs. ${p.totalAmount}`,
          p.paymentType,
          p.items.length.toString()
        ])
      };
      await doc.table(table, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(10) });
    }

    // Footer
    const rangeHeight = doc.page.height - 50;
    doc.fontSize(8).fillColor('#94a3b8').text(`Generated via KitchenCore Business Suite on ${new Date().toLocaleString()}`, 30, rangeHeight, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF Export Error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
