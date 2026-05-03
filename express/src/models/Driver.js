const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseNumber:   { type: String, required: true, unique: true, maxlength: 50 },
  experienceYears: { type: Number },
  status:          { type: String, maxlength: 50, default: 'AVAILABLE' },
});

module.exports = mongoose.model('Driver', driverSchema);
