const mongoose = require('mongoose');

const performerPayoutSchema = new mongoose.Schema({
  performer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Performer' },
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  payoutAmount: { type: Number },
  payoutStatus: { type: String, maxlength: 50, default: 'PENDING' },
});

module.exports = mongoose.model('PerformerPayout', performerPayoutSchema);
