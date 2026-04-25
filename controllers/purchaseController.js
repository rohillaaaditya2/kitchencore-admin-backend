const Purchase = require('../models/Purchase');
const Ingredient = require('../models/Ingredient');
const InventoryLog = require('../models/InventoryLog');

exports.createPurchase = async (req, res) => {
  try {
    const { supplierName, items, totalAmount, purchaseDate, paymentType } = req.body;
    const restaurantId = req.restaurantId;

    // 1. Create Purchase Record
    const purchase = new Purchase({
      restaurantId,
      supplierName,
      items,
      totalAmount,
      purchaseDate: purchaseDate || Date.now(),
      paymentType
    });

    await purchase.save();

    // 2. Update Inventory & Logs for each item
    for (const item of items) {
      const ingredient = await Ingredient.findOne({ _id: item.ingredientId, restaurantId });
      
      if (ingredient) {
        // Calculate new Average Cost: ((current_qty * avgCost) + (new_qty * pricePerUnit)) / (current_qty + new_qty)
        const currentQty = ingredient.quantity || 0;
        const currentAvgCost = ingredient.avgCost || ingredient.costPerUnit || 0;
        
        // Unit Conversion Logic (Normalize to base unit: g, ml, pcs)
        let newQty = item.quantity;
        let unitPrice = item.pricePerUnit;

        if (item.unit === 'kg') {
          newQty = item.quantity * 1000;
          unitPrice = item.pricePerUnit / 1000;
        } else if (item.unit === 'litre') {
          newQty = item.quantity * 1000;
          unitPrice = item.pricePerUnit / 1000;
        }

        const totalNewQty = currentQty + newQty;
        const newAvgCost = totalNewQty > 0 
          ? ((currentQty * currentAvgCost) + (newQty * unitPrice)) / totalNewQty 
          : unitPrice;

        // Update Ingredient
        ingredient.quantity = totalNewQty;
        ingredient.avgCost = newAvgCost;
        ingredient.costPerUnit = unitPrice; 
        await ingredient.save();

        // 3. Create Inventory Log
        await InventoryLog.create({
          restaurantId,
          ingredientId: item.ingredientId,
          type: 'IN',
          quantity: newQty,
          unit: ingredient.unit, // Use ingredient's base unit
          date: purchaseDate || Date.now(),
          referenceId: purchase._id,
          referenceModel: 'Purchase',
          note: `Purchase from ${supplierName} (${item.quantity}${item.unit})`
        });
      }
    }

    res.status(201).json({ message: 'Purchase recorded successfully', purchase });
  } catch (error) {
    console.error('Create Purchase Error:', error);
    res.status(500).json({ message: 'Error recording purchase', error });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;
    let query = { restaurantId: req.restaurantId };

    if (startDate && endDate) {
      query.purchaseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (supplier) {
      query.supplierName = { $regex: supplier, $options: 'i' };
    }

    const purchases = await Purchase.find(query).sort({ purchaseDate: -1 });
    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error });
  }
};

exports.getStats = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await Purchase.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
      {
        $facet: {
          totalSpend: [
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ],
          monthlySpend: [
            { $match: { purchaseDate: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ],
          topSuppliers: [
            { $group: { _id: '$supplierName', total: { $sum: '$totalAmount' } } },
            { $sort: { total: -1 } },
            { $limit: 5 }
          ],
          mostPurchasedItems: [
            { $unwind: '$items' },
            { $group: { _id: '$items.name', count: { $sum: 1 }, totalQty: { $sum: '$items.quantity' } } },
            { $sort: { totalQty: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    res.status(200).json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error });
  }
};
