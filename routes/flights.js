const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');

router.get('/flights', async (req, res) => {
  try {
    const flights = await Flight.find();
    const data = flights.map(f => {
      const availableSeats = f.seats ? f.seats.filter(s => s.availability).length : 0;
      return {
        FLIGHT_ID: f._id,
        flight_id: f._id,
        FLIGHT_NUMBER: f.flight_number,
        AIRLINE_NAME: f.airline_name,
        ORIGIN: f.origin,
        DESTINATION: f.destination,
        DEPARTURE_TIME: f.departure_time,
        ARRIVAL_TIME: f.arrival_time,
        AVAILABLE_SEATS: availableSeats
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const CLASS_TEMPLATE = [
  { name: 'Economy', count: 42, basePrice: 5500 },
  { name: 'Business', count: 12, basePrice: 12500 },
  { name: 'First', count: 4, basePrice: 25000 }
];

function priceVariance(flightNumber, basePrice) {
  let hash = 0;
  for (let i = 0; i < flightNumber.length; i++) {
    hash = (hash * 31 + flightNumber.charCodeAt(i)) % 1000;
  }
  const swing = (hash % 800) - 400;
  return Math.round(basePrice + (basePrice * swing) / 5000);
}

router.post('/flights/ensure', async (req, res) => {
  const { flight_number, airline_name, origin, destination, departure_time, arrival_time } = req.body;

  if (!flight_number) {
    return res.status(400).json({ success: false, message: 'flight_number is required' });
  }

  try {
    let flight = await Flight.findOne({ flight_number });

    if (!flight) {
      const seats = [];
      for (const cls of CLASS_TEMPLATE) {
        const price = priceVariance(flight_number, cls.basePrice);
        for (let i = 1; i <= cls.count; i++) {
          const seatLetter = ['A', 'B', 'C', 'D'][i % 4];
          const seatNumber = `${Math.ceil(i / 4) + (cls.name === 'First' ? 0 : cls.name === 'Business' ? 3 : 10)}${seatLetter}`;
          seats.push({
            seat_number: seatNumber,
            class: cls.name,
            availability: true,
            price: price
          });
        }
      }

      flight = await Flight.create({
        flight_number,
        airline_name,
        origin,
        destination,
        departure_time,
        arrival_time,
        seats
      });
    }

    const classSummaryMap = {};
    for (const s of flight.seats) {
      if (s.availability) {
        if (!classSummaryMap[s.class]) {
          classSummaryMap[s.class] = { CLASS: s.class, available: 0, price: s.price };
        }
        classSummaryMap[s.class].available++;
        classSummaryMap[s.class].price = Math.min(classSummaryMap[s.class].price, s.price);
      }
    }

    const seatSummary = Object.values(classSummaryMap);

    res.json({ success: true, flight_id: flight._id, seats: seatSummary });
  } catch (err) {
    console.error('FLIGHT ENSURE ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;