const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:          { type: String, required: true, maxlength: 100 },
  contactPerson: { type: String, maxlength: 100 },
  phone:         { type: String, maxlength: 20 },
  email:         { type: String, maxlength: 100 },
  rating:        { type: Number, default: 0.0 },
});

module.exports = mongoose.model('Supplier', supplierSchema);
