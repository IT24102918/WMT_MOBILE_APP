const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  order:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number },
  price:    { type: Number },
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
