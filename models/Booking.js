const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agent_id: { type: Number, default: 1 },
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', required: true },
  seat_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  seat_number: { type: String },
  cabin_class: { type: String },
  meal_preference: { type: String, default: 'None' },
  wheelchair_required: { type: String, default: 'NO' },
  special_assistance: { type: String, default: null },
  infant_bassinet_required: { type: String, default: 'NO' },
  booking_date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED', 'CHECKED_IN'], default: 'CONFIRMED' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);