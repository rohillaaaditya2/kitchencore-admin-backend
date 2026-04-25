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
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
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

    // 4. Customer Stats
    const totalCustomers = await Customer.countDocuments({ restaurantId });
    const returningCustomers = await Customer.countDocuments({ restaurantId, totalOrders: { $gt: 1 } });
    
    // 5. Profit (Rough estimate: Sales - Purchase Cost in period)
    const profit = totalSales - totalPurchaseCost;

    res.json({
      debugId: restaurantId,
      sales: { 
        totalSales: totalSales || 0, 
        totalOrders: totalOrders || 0, 
        avgOrderValue: avgOrderValue || 0, 
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
      }
    });
  } catch (err) {
    console.error('Reports Data Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const { type, range, start, end } = req.query;
    const restaurantId = req.restaurantId;
    const dateQuery = getDateRange(range, start, end);
    const queryId = new mongoose.Types.ObjectId(restaurantId);
    
    const restaurant = await mongoose.model('Restaurant').findById(queryId);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Set response headers
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

    if (type === 'sales') {
      const orders = await Order.find({ 
        $or: [
          { restaurantId: restaurantId }, 
          { restaurantId: queryId }
        ],
        createdAt: dateQuery 
      }).sort({ createdAt: -1 });
      const total = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Summary Box
      doc.rect(30, doc.y, 535, 60).fill('#f8fafc');
      doc.fillColor('#0f172a').fontSize(12).text(`Total Sales: Rs. ${total.toLocaleString()}`, 40, doc.y - 45);
      doc.text(`Total Orders: ${orders.length}`, 40, doc.y - 15);
      doc.moveDown(2);

      const table = {
        title: "Order Details",
        headers: ["Order ID", "Customer", "Amount", "Method", "Date"],
        rows: orders.map(o => [
          o.orderId,
          o.customerName || 'Walk-in',
          `Rs. ${o.totalAmount}`,
          o.paymentMethod || 'Cash',
          new Date(o.createdAt).toLocaleDateString()
        ])
      };
      await doc.table(table, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(10) });
    } 
    
    else if (type === 'inventory') {
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
