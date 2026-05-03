const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product:           { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity:          { type: Number },
  minReorderLevel:   { type: Number },
  warehouseLocation: { type: String, maxlength: 100 },
  expiryDate:        { type: Date },
  stockStatus:       { type: String, maxlength: 50, default: 'IN_STOCK' },
});

module.exports = mongoose.model('Inventory', inventorySchema);
