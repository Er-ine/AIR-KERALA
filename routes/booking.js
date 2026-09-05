const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/passenger', async (req, res) => {
    const { name, age, gender, passport_number } = req.body;
    try {
        const [maxRow] = await db.query(`SELECT MAX(PASSENGER_ID) AS maxId FROM PASSENGER`);
        const nextId = (maxRow[0].maxId || 0) + 1;

        await db.query(
            `INSERT INTO PASSENGER (PASSENGER_ID, NAME, AGE, GENDER, PASSPORT_NUMBER) VALUES (?, ?, ?, ?, ?)`,
            [nextId, name, age, gender, passport_number]
        );
        res.json({ success: true, passenger_id: nextId });
    } catch (err) {
        console.error('PASSENGER INSERT ERROR:', err);
        res.status(500).json({ success: false, message: err.message, code: err.code });
    }
});

router.post('/seat', async (req, res) => {
    const { flight_id, class: cls, price } = req.body;
    try {
        const [maxRow] = await db.query(`SELECT MAX(SEAT_ID) AS maxId FROM SEAT`);
        const nextId = (maxRow[0].maxId || 0) + 1;

        const seatNum = Math.floor(Math.random() * 30) + 1 + ['A','B','C'][Math.floor(Math.random()*3)];
        await db.query(
            `INSERT INTO SEAT (SEAT_ID, FLIGHT_ID, SEAT_NUMBER, CLASS, AVAILABILITY, PRICE) VALUES (?, ?, ?, ?, 1, ?)`,
            [nextId, flight_id, seatNum, cls, price]
        );
        res.json({ success: true, seat_id: nextId });
    } catch (err) {
        console.error('SEAT INSERT ERROR:', err);
        res.status(500).json({ success: false, message: err.message, code: err.code });
    }
});

router.post('/booking', async (req, res) => {
  const { agent_id, flight_id, booking_date, passenger_id, seat_id, meal_preference, wheelchair_required, special_assistance, infant_bassinet_required } = req.body;

  try {
    const [seats] = await db.query(
      `SELECT * FROM SEAT WHERE SEAT_ID = ? AND AVAILABILITY = 1`,
      [seat_id]
    );

    if (!seats.length) {
      return res.status(400).json({ success: false, message: 'Seat not available' });
    }

    const [booking] = await db.query(
      `INSERT INTO BOOKINGS (AGENT_ID, FLIGHT_ID, BOOKING_DATE, STATUS_)
       VALUES (?, ?, ?, 'CONFIRMED')`,
      [agent_id, flight_id, booking_date]
    );

    await db.query(
      `INSERT INTO Booking_Passenger
       (BOOKING_ID, PASSENGER_ID, SEAT_ID, MEAL_PREFERENCE, WHEELCHAIR_REQUIRED, SPECIAL_ASSISTANCE, INFANT_BASSINET_REQUIRED)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [booking.insertId, passenger_id, seat_id, meal_preference, wheelchair_required, special_assistance, infant_bassinet_required]
    );

    await db.query(
      `UPDATE SEAT SET AVAILABILITY = 0 WHERE SEAT_ID = ?`,
      [seat_id]
    );

    res.json({ success: true, booking_id: booking.insertId, message: 'Booking successful' });
  } catch (err) {
    console.error('BOOKING INSERT ERROR:', err);
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

router.put('/cancel-booking', async (req, res) => {
  const { booking_id } = req.body;

  try {
    const [bookings] = await db.query(
      `SELECT * FROM BOOKINGS WHERE BOOKING_ID = ?`,
      [booking_id]
    );

    if (!bookings.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (bookings[0].STATUS_ === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Already cancelled' });
    }

    await db.query(
      `UPDATE BOOKINGS SET STATUS_ = 'CANCELLED' WHERE BOOKING_ID = ?`,
      [booking_id]
    );

    await db.query(`
      UPDATE SEAT SET AVAILABILITY = 1
      WHERE SEAT_ID IN (
        SELECT SEAT_ID FROM Booking_Passenger WHERE BOOKING_ID = ?
      )`, [booking_id]
    );

    await db.query(
      `UPDATE PAYMENT SET PAYMENT_STATUS = 'REFUNDED' WHERE BOOKING_ID = ?`,
      [booking_id]
    );

    res.json({ success: true, message: 'Booking cancelled and payment refunded' });
  } catch (err) {
    console.error('CANCEL BOOKING ERROR:', err);
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

router.get('/booking-details/:booking_id', async (req, res) => {
  const { booking_id } = req.params;

  try {
    const [result] = await db.query(`
      SELECT B.BOOKING_ID, B.STATUS_, B.BOOKING_DATE,
             F.AIRLINE_NAME, F.ORIGIN, F.DESTINATION,
             F.DEPARTURE_TIME, F.ARRIVAL_TIME,
             P.NAME, P.AGE, P.GENDER,
             S.SEAT_NUMBER, S.CLASS, S.PRICE,
             BP.MEAL_PREFERENCE, BP.WHEELCHAIR_REQUIRED,
             BP.SPECIAL_ASSISTANCE, BP.INFANT_BASSINET_REQUIRED,
             PAY.AMOUNT, PAY.PAYMENT_METHOD, PAY.PAYMENT_STATUS
      FROM BOOKINGS B
      JOIN FLIGHT F ON B.FLIGHT_ID = F.FLIGHT_ID
      JOIN Booking_Passenger BP ON B.BOOKING_ID = BP.BOOKING_ID
      JOIN PASSENGER P ON BP.PASSENGER_ID = P.PASSENGER_ID
      JOIN SEAT S ON BP.SEAT_ID = S.SEAT_ID
      LEFT JOIN PAYMENT PAY ON B.BOOKING_ID = PAY.BOOKING_ID
      WHERE B.BOOKING_ID = ?
    `, [booking_id]);

    if (!result.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('BOOKING DETAILS ERROR:', err);
    res.status(500).json({ success: false, message: err.message, code: err.code });
  }
});

module.exports = router;
