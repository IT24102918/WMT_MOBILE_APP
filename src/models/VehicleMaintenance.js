const mongoose = require('mongoose');

const vehicleMaintenanceSchema = new mongoose.Schema({
  vehicle:         { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  maintenanceDate: { type: Date, required: true },
  description:     { type: String, required: true },
  cost:            { type: Number, required: true },
});

module.exports = mongoose.model('VehicleMaintenance', vehicleMaintenanceSchema);
