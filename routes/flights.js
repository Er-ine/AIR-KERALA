const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/flights', async (req, res) => {
  try {
    const [flights] = await db.query(`
      SELECT F.FLIGHT_ID, F.AIRLINE_NAME, F.ORIGIN, F.DESTINATION,
             F.DEPARTURE_TIME, F.ARRIVAL_TIME,
             COUNT(S.SEAT_ID) AS AVAILABLE_SEATS
      FROM FLIGHT F
      JOIN SEAT S ON F.FLIGHT_ID = S.FLIGHT_ID
      WHERE S.AVAILABILITY = 1
      GROUP BY F.FLIGHT_ID, F.AIRLINE_NAME, F.ORIGIN,
               F.DESTINATION, F.DEPARTURE_TIME, F.ARRIVAL_TIME
    `);
    res.json({ success: true, data: flights });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seat inventory pricing — base fare per class. Live flights get a small
// deterministic variation based on their flight number so prices don't
// look identical across every flight, without needing external pricing data.
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
  // +/- up to ~8% of base price, deterministic per flight number
  const swing = (hash % 800) - 400; // -400..399
  return Math.round(basePrice + (basePrice * swing) / 5000);
}

// Finds an existing DB flight matching this live flight number, or creates
// one and seeds real seat inventory for it. Always returns live seat
// counts and prices per class.
router.post('/flights/ensure', async (req, res) => {
  const { flight_number, airline_name, origin, destination, departure_time, arrival_time } = req.body;

  if (!flight_number) {
    return res.status(400).json({ success: false, message: 'flight_number is required' });
  }

  try {
    const [existing] = await db.query(
      `SELECT FLIGHT_ID FROM FLIGHT WHERE FLIGHT_NUMBER = ?`,
      [flight_number]
    );

    let flightId;

    if (existing.length) {
      flightId = existing[0].FLIGHT_ID;
    } else {
      const [result] = await db.query(
        `INSERT INTO FLIGHT (FLIGHT_NUMBER, AIRLINE_NAME, ORIGIN, DESTINATION, DEPARTURE_TIME, ARRIVAL_TIME)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [flight_number, airline_name, origin, destination, departure_time, arrival_time]
      );
      flightId = result.insertId;

      for (const cls of CLASS_TEMPLATE) {
        const price = priceVariance(flight_number, cls.basePrice);
        const rows = [];
        const values = [];

        for (let i = 1; i <= cls.count; i++) {
          const seatLetter = ['A', 'B', 'C', 'D'][i % 4];
          const seatNumber = `${Math.ceil(i / 4) + (cls.name === 'First' ? 0 : cls.name === 'Business' ? 3 : 10)}${seatLetter}`;
          rows.push('(?, ?, ?, 1, ?)');
          values.push(flightId, seatNumber, cls.name, price);
        }

        await db.query(
          `INSERT INTO SEAT (FLIGHT_ID, SEAT_NUMBER, CLASS, AVAILABILITY, PRICE) VALUES ${rows.join(',')}`,
          values
        );
      }
    }

    const [seatSummary] = await db.query(
      `SELECT CLASS, COUNT(*) AS available, MIN(PRICE) AS price
       FROM SEAT
       WHERE FLIGHT_ID = ? AND AVAILABILITY = 1
       GROUP BY CLASS`,
      [flightId]
    );

    res.json({ success: true, flight_id: flightId, seats: seatSummary });
  } catch (err) {
    console.error('FLIGHT ENSURE ERROR:', err);
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

module.exports = router;