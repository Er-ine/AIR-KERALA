const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');

const CLASS_TEMPLATE = [
    { name: 'Economy', count: 42, basePrice: 5500 },
    { name: 'Business', count: 12, basePrice: 12500 },
    { name: 'First', count: 4, basePrice: 25000 }
];

// Deterministic +/- ~8% price variance per flight number, so prices differ
// across flights without needing external pricing data.
function priceVariance(flightNumber, basePrice) {
    let hash = 0;
    for (let i = 0; i < flightNumber.length; i++) {
        hash = (hash * 31 + flightNumber.charCodeAt(i)) % 1000;
    }
    const swing = (hash % 800) - 400;
    return Math.round(basePrice + (basePrice * swing) / 5000);
}

function buildSeats(flightNumber) {
    const seats = [];
    for (const cls of CLASS_TEMPLATE) {
        const price = priceVariance(flightNumber, cls.basePrice);
        for (let i = 1; i <= cls.count; i++) {
            const seatLetter = ['A', 'B', 'C', 'D'][i % 4];
            const row = Math.ceil(i / 4) + (cls.name === 'First' ? 0 : cls.name === 'Business' ? 3 : 10);
            seats.push({ seat_number: `${row}${seatLetter}`, class: cls.name, availability: true, price });
        }
    }
    return seats;
}

router.get('/flights', async (req, res) => {
    try {
        const flights = await Flight.find().lean();
        const data = flights
            .map(f => ({
                FLIGHT_ID: f._id,
                FLIGHT_NUMBER: f.flight_number,
                AIRLINE_NAME: f.airline_name,
                ORIGIN: f.origin,
                DESTINATION: f.destination,
                DEPARTURE_TIME: f.departure_time,
                ARRIVAL_TIME: f.arrival_time,
                AVAILABLE_SEATS: (f.seats || []).filter(s => s.availability).length
            }))
            .filter(f => f.AVAILABLE_SEATS > 0);

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Finds an existing flight by flight_number, or creates one with a fresh
// seat map. Always returns live per-class availability and price.
router.post('/flights/ensure', async (req, res) => {
    const { flight_number, airline_name, origin, destination, departure_time, arrival_time } = req.body;

    if (!flight_number) {
        return res.status(400).json({ success: false, message: 'flight_number is required' });
    }

    try {
        let flight = await Flight.findOne({ flight_number });

        if (!flight) {
            try {
                flight = await Flight.create({
                    flight_number,
                    airline_name,
                    origin,
                    destination,
                    departure_time,
                    arrival_time,
                    seats: buildSeats(flight_number)
                });
            } catch (err) {
                if (err.code === 11000) {
                    flight = await Flight.findOne({ flight_number });
                } else {
                    throw err;
                }
            }
        }

        const byClass = new Map();
        for (const s of flight.seats) {
            if (!s.availability) continue;
            const entry = byClass.get(s.class) || { CLASS: s.class, available: 0, price: s.price };
            entry.available += 1;
            entry.price = Math.min(entry.price, s.price);
            byClass.set(s.class, entry);
        }

        res.json({
            success: true,
            flight_id: flight._id,
            seats: Array.from(byClass.values())
        });
    } catch (err) {
        console.error('FLIGHT ENSURE ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;