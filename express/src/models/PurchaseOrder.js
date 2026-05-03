const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  supplier:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  stockRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'StockRequest' },
  orderDate:    { type: Date, default: Date.now },
  quantity:     { type: Number },
  unitPrice:    { type: Number },
  totalAmount:  { type: Number },
  status:       { type: String, maxlength: 50, default: 'PENDING' },
  deliveredAt:  { type: Date },
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
