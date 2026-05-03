const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Performer' },
  thowilType:  { type: mongoose.Schema.Types.ObjectId, ref: 'ThowilType' },
  eventDate:   { type: Date },
  endDate:     { type: Date },
  status:      { type: String, maxlength: 50, default: 'PENDING' },
  totalAmount: { type: Number },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);
