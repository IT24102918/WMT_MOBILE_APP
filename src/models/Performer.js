const mongoose = require('mongoose');

const performerSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:            { type: String, required: true, maxlength: 100 },
  experienceYears: { type: Number, default: 0 },
  location:        { type: String, maxlength: 150 },
  latitude:        { type: Number },
  longitude:       { type: Number },
  rating:          { type: Number, default: 0.0 },
});

module.exports = mongoose.model('Performer', performerSchema);
