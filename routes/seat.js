const mongoose = require('mongoose');

// SEAT table — kept as its own collection so a seat can be claimed
// atomically (findOneAndUpdate on availability) exactly like the old
// UPDATE ... WHERE AVAILABILITY = 1.
const seatSchema = new mongoose.Schema({
    _id: Number,                                  // SEAT_ID
    flight: { type: Number, ref: 'Flight', index: true }, // FLIGHT_ID
    seatNumber: String,                           // SEAT_NUMBER
    class: String,                                // CLASS (Economy / Business / First)
    availability: { type: Boolean, default: true }, // AVAILABILITY (1 / 0)
    price: Number                                 // PRICE
});

seatSchema.index({ flight: 1, class: 1, availability: 1 });

module.exports = mongoose.model('Seat', seatSchema);