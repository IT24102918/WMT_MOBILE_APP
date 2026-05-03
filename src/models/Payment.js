const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking:       { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  order:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  paymentDate:   { type: Date, default: Date.now },
  amount:        { type: Number },
  paymentMethod: { type: String, maxlength: 50, default: 'CARD' },
  paymentStatus: { type: String, maxlength: 50 },
  transactionId: { type: String, maxlength: 100 },
  paymentReference: { type: String, maxlength: 150 },
  bankAccountName: { type: String, maxlength: 150 },
  bankName: { type: String, maxlength: 150 },
  bankAccountNumber: { type: String, maxlength: 50 },
  bankBranch: { type: String, maxlength: 150 },
  slipPath: { type: String, maxlength: 255 },
  slipOriginalName: { type: String, maxlength: 255 },
});

module.exports = mongoose.model('Payment', paymentSchema);
