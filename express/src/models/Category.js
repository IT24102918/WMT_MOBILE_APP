const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
});

module.exports = mongoose.model('Category', categorySchema);
