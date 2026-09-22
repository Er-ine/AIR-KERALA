const mongoose = require('mongoose');

// Sequential numeric IDs (the old MySQL AUTO_INCREMENT behaviour).
// The frontend stores and compares these IDs as numbers (booking_id,
// flight_id, seat_id, passenger_id), so they are kept numeric.
const counterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Reserves `count` consecutive IDs and returns the first one.
async function nextId(name, count = 1) {
    const doc = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: count } },
        { new: true, upsert: true }
    );
    return doc.seq - count + 1;
}

module.exports = Counter;
module.exports.nextId = nextId;