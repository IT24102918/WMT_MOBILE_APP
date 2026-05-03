const mongoose = require('mongoose');

const performerAvailabilitySchema = new mongoose.Schema({
  performer:     { type: mongoose.Schema.Types.ObjectId, ref: 'Performer' },
  availableDate: { type: Date },
  status:        { type: String, maxlength: 50, default: 'AVAILABLE' },
});

module.exports = mongoose.model('PerformerAvailability', performerAvailabilitySchema);
