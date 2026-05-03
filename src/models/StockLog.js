const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
  product:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  changeType:      { type: String, maxlength: 50 },
  quantityChanged: { type: Number },
  changeDate:      { type: Date, default: Date.now },
  warehouseLocation:{ type: String, maxlength: 100 },
  stockStatus:     { type: String, maxlength: 50 },
  note:            { type: String, maxlength: 255 },
});

module.exports = mongoose.model('StockLog', stockLogSchema);
