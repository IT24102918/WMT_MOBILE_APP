const mongoose = require('mongoose');

const supplierProductSchema = new mongoose.Schema({
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  supplyPrice: { type: Number },
});

module.exports = mongoose.model('SupplierProduct', supplierProductSchema);
