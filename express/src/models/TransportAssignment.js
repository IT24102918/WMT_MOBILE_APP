const mongoose = require('mongoose');

const transportAssignmentSchema = new mongoose.Schema({
  vehicle:              { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver:               { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  booking:              { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  order:                { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  destinationAddress:   { type: String, required: true },
  departureTime:        { type: Date, required: true },
  estimatedReturnTime:  { type: Date },
  taskStatus:           { type: String, maxlength: 50, default: 'PENDING' },
  transportCost:        { type: Number },
});

module.exports = mongoose.model('TransportAssignment', transportAssignmentSchema);
