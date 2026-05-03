const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleType:  { type: String, required: true, maxlength: 50 },
  licensePlate: { type: String, required: true, unique: true, maxlength: 20 },
  capacityKg:   { type: Number },
  status:       { type: String, maxlength: 50, default: 'AVAILABLE' },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
