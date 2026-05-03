const mongoose = require('mongoose');

const thowilTypeSchema = new mongoose.Schema({
  name:        { type: String, required: true, maxlength: 100 },
  description: { type: String },
  basePrice:   { type: Number },
});

module.exports = mongoose.model('ThowilType', thowilTypeSchema);
