const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true, maxlength: 100 },
  description:   { type: String },
  price:         { type: Number },
  stockQuantity: { type: Number },
  category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  imageUrl:      { type: String, trim: true },
});

module.exports = mongoose.model('Product', productSchema);
