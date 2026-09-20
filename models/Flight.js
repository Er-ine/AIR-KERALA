const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seat_number: { type: String, required: true },
  class: { type: String, required: true },
  availability: { type: Boolean, default: true },
  price: { type: Number, required: true }
});

const flightSchema = new mongoose.Schema({
  flight_number: { type: String, required: true, unique: true },
  airline_name: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  departure_time: { type: String, required: true },
  arrival_time: { type: String, required: true },
  seats: [seatSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Flight', flightSchema);
