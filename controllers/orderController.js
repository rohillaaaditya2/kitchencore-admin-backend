const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const InventoryLog = require('../models/InventoryLog');
const PlatformConfig = require('../models/PlatformConfig');
const { sendNotification } = require('../socket');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, customerPhone, customerName, tableNumber, diningOption, packagingCharge, promoDiscount, promoCodeUsed, loyaltyDiscount, source, status, paymentStatus, paymentMethod, restaurantId } = req.body;
    if (!restaurantId || !String(restaurantId).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: 'Valid Restaurant ID is required' });

    // SUBSCRIPTION CHECK
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant && restaurant.role !== 'SuperAdmin') {
      const now = new Date();
      const trialDate = restaurant.trialEndDate || restaurant.trialEndsAt;
      const subDate = restaurant.subscriptionEndDate || restaurant.subscriptionEndsAt;

      const trialActive = trialDate && new Date(trialDate) > now;
      const subActive = subDate && new Date(subDate) > now;
      
      console.log(`[SUBSCRIPTION DEBUG] Restaurant: ${restaurant.restaurantName}`);
      console.log(`Trial: ${trialDate} (Active: ${trialActive})`);
      console.log(`Sub: ${subDate} (Active: ${subActive})`);

      if (!trialActive && !subActive) {
        console.warn(`[SUBSCRIPTION BLOCKED] ${restaurant.restaurantName} attempt blocked. Expired.`);
        return res.status(402).json({ 
          message: 'This restaurant\'s service is temporarily suspended due to expired subscription.',
          reason: 'Your trial or subscription has expired.',
          trialEndDate: trialDate,
          subscriptionEndDate: subDate
        });
      }
    }

    const orderId = req.body.orderId || Math.floor(1000 + Math.random() * 9000).toString();
    
    const newOrder = new Order({
      orderId,
      items,
      totalAmount,
      customerPhone,
      customerName,
      tableNumber,
      diningOption,
      packagingCharge,
      promoDiscount,
      promoCodeUsed,
      loyaltyDiscount,
      source: source || 'Direct',
      status: status || 'Pending',
      paymentStatus: paymentStatus || 'Pending',
      paymentMethod: paymentMethod || 'Cash',
      restaurantId
    });

    const savedOrder = await newOrder.save();

    // Trigger New Order Notification
    await sendNotification(restaurantId, {
      type: 'NEW_ORDER',
      title: 'New Order Received',
      message: `Order #${orderId} - ₹${totalAmount}`,
      orderId: savedOrder.orderId
    });

    // Auto Inventory Deduction with Logging
    try {
      for (const item of items) {
        const productId = item.id || item._id;
        if (productId) {
          const product = await Product.findById(productId);
          if (product && product.recipe && product.recipe.length > 0) {
            for (const rec of product.recipe) {
              if (rec.ingredient) {
                const totalDeduction = (rec.quantity || 0) * (item.quantity || 1);
                
                // 1. Deduct from Ingredient
                await Ingredient.findByIdAndUpdate(rec.ingredient, {
                  $inc: { quantity: -totalDeduction }
                });

                // 2. Create Inventory Log
                await InventoryLog.create({
                  restaurantId,
                  ingredientId: rec.ingredient,
                  type: 'OUT',
                  quantity: totalDeduction,
                  unit: rec.unit || 'g',
                  date: new Date(),
                  referenceId: savedOrder._id,
                  referenceModel: 'Order',
                  note: `Order #${orderId} - ${item.name}`
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Auto inventory deduction failed:", err);
    }

    // Customer update/upsert (Enhanced CRM)
    if (customerPhone) {
      try {
        const itemUpdateData = items.map(item => ({
          productId: item.id || item._id,
          name: item.name,
          count: item.quantity || 1
        }));

        const existingCustomer = await Customer.findOne({ phone: customerPhone, restaurantId });
        
        if (!existingCustomer) {
          // New Customer
          await Customer.create({
            phone: customerPhone,
            name: customerName,
            restaurantId,
            totalOrders: 1,
            totalSpent: totalAmount,
            loyaltyPoints: paymentStatus === 'Paid' ? Math.floor(totalAmount / 10) : 0,
            lastOrderDate: new Date(),
            visitHistory: [new Date()],
            favoriteItems: itemUpdateData,
            segment: 'New'
          });
        } else {
          // Update Existing Customer
          let updatedFavorites = [...existingCustomer.favoriteItems];
          itemUpdateData.forEach(newItem => {
            const index = updatedFavorites.findIndex(fav => fav.productId?.toString() === newItem.productId?.toString() || fav.name === newItem.name);
            if (index > -1) {
              updatedFavorites[index].count += newItem.count;
            } else {
              updatedFavorites.push(newItem);
            }
          });

          existingCustomer.name = customerName || existingCustomer.name;
          existingCustomer.lastOrderDate = new Date();
          existingCustomer.favoriteItems = updatedFavorites;
          existingCustomer.totalOrders += 1;
          existingCustomer.totalSpent += totalAmount;
          if (paymentStatus === 'Paid') {
            existingCustomer.loyaltyPoints += Math.floor(totalAmount / 10);
          }
          if (loyaltyDiscount > 0) {
            existingCustomer.loyaltyPoints -= loyaltyDiscount;
            if (existingCustomer.loyaltyPoints < 0) existingCustomer.loyaltyPoints = 0;
          }
          existingCustomer.visitHistory.push(new Date());
          
          await existingCustomer.save();
        }
      } catch (err) {
        console.error("Failed to update customer CRM:", err);
      }
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error });
  }
};

// Get all orders (for admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, days } = req.query;
    let query = { restaurantId: req.restaurantId };

    if (status) {
      if (status === 'Active') {
        query.status = { $in: ['Pending', 'Preparing'] };
      } else {
        query.status = status;
      }
    }

    if (days) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(days));
      query.createdAt = { $gte: dateLimit };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, paymentMethod, finalAmount, promoCodeUsed, promoDiscount } = req.body;
    
    const updateFields = {};
    if (status) {
      updateFields.status = status;
      if (status === 'Preparing') updateFields.preparingAt = new Date();
      if (status === 'Ready') updateFields.readyAt = new Date();
      if (status === 'Served') updateFields.servedAt = new Date();
    }
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    if (paymentMethod) updateFields.paymentMethod = paymentMethod;
    if (finalAmount !== undefined) updateFields.totalAmount = finalAmount; // Update total if discounted
    if (promoCodeUsed) updateFields.promoCodeUsed = promoCodeUsed;
    if (promoDiscount !== undefined) updateFields.promoDiscount = promoDiscount;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId }, 
      { $set: updateFields }, 
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    // Handle Inventory Restoration on Cancellation
    if (status === 'Cancelled') {
      try {
        for (const item of updatedOrder.items) {
          const product = await Product.findById(item.productId || item.id || item._id);
          if (product && product.recipe) {
            for (const rec of product.recipe) {
              if (rec.ingredient) {
                const restoreQty = (rec.quantity || 0) * (item.quantity || 1);
                await Ingredient.findByIdAndUpdate(rec.ingredient, { $inc: { quantity: restoreQty } });
                
                await InventoryLog.create({
                  restaurantId: req.restaurantId,
                  ingredientId: rec.ingredient,
                  type: 'IN',
                  quantity: restoreQty,
                  unit: rec.unit || 'g',
                  date: new Date(),
                  referenceId: updatedOrder._id,
                  referenceModel: 'Order',
                  note: `Restored - Cancelled Order #${updatedOrder.orderId}`
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Inventory restoration failed:", err);
      }
    }

    // Trigger Notification
    await sendNotification(req.restaurantId, {
      type: 'ORDER_STATUS_UPDATED',
      title: 'Order Status Updated',
      message: `Order #${updatedOrder.orderId} status changed to ${status}`,
      orderId: updatedOrder.orderId
    });

    // Loyalty Points on Settlement
    if (paymentStatus === 'Paid' && updatedOrder.customerPhone) {
      try {
        const pts = Math.floor(updatedOrder.totalAmount / 10);
        await Customer.findOneAndUpdate(
          { phone: updatedOrder.customerPhone, restaurantId: req.restaurantId },
          { $inc: { loyaltyPoints: pts } }
        );
      } catch (err) {
        console.error("Failed to award points on settlement:", err);
      }
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error });
  }
};

// Accept an order
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAccepted } = req.body;
    
    const updatedOrder = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { isAccepted }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error accepting order', error });
  }
};

// Update order preparation time
exports.updateOrderPrepTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimatedPrepTime } = req.body;
    
    const order = await Order.findOne({ _id: id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const updateData = {
      estimatedPrepTime: Number(estimatedPrepTime),
      prepTimeUpdatedAt: Date.now()
    };
    
    if (order.status === 'Pending') {
      updateData.status = 'Preparing';
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating prep time', error });
  }
};

// Get orders by customer phone
exports.getOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const orders = await Order.find({ customerPhone: phone, restaurantId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by phone', error });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    const updatedOrder = await Order.findOneAndUpdate({ _id: id, restaurantId: req.restaurantId }, { paymentStatus }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    if (paymentStatus === 'Paid') {
      // Trigger Notification
      await sendNotification(req.restaurantId, {
        type: 'PAYMENT_COMPLETED',
        title: 'Payment Completed',
        message: `Order #${updatedOrder.orderId} has been paid (₹${updatedOrder.totalAmount})`,
        orderId: updatedOrder.orderId
      });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error });
  }
};

// Get single order (public view)
exports.getPublicOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.query;
    console.log(`Public Bill Request: ID=${id}, RestID=${restaurantId}`);
    
    if (!restaurantId) return res.status(400).json({ message: 'Restaurant ID is required' });

    const order = await Order.findById(id).lean();
    
    // Safety check: ensure order exists AND belongs to this restaurant
    if (!order || order.restaurantId.toString() !== restaurantId) {
      console.log(`Order validation failed for ID=${id}. Order exists: ${!!order}, Match: ${order?.restaurantId?.toString() === restaurantId}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in getPublicOrder:", error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};
