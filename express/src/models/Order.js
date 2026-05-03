const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderDate:   { type: Date, default: Date.now },
  totalAmount: { type: Number },
  status:      { type: String, maxlength: 50, default: 'PENDING' },
});

module.exports = mongoose.model('Order', orderSchema);
