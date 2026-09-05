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

module.exports = router;