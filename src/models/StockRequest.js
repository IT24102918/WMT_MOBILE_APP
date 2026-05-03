const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema({
  product:           { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  requestedQuantity: { type: Number },
  notes:             { type: String, maxlength: 255 },
  status:            { type: String, maxlength: 50, default: 'PENDING' },
  requestedBy:       { type: String, maxlength: 100 },
  createdAt:         { type: Date, default: Date.now },
  purchaseOrder:     { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
});

module.exports = mongoose.model('StockRequest', stockRequestSchema);
