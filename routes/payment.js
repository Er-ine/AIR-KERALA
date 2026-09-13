const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/payment', async (req, res) => {
  const { booking_id, payment_method, payment_date } = req.body;

  if (!booking_id || !payment_method) {
    return res.status(400).json({ success: false, message: 'booking_id and payment_method are required' });
  }

  try {
    const [bookings] = await db.query(
      `SELECT * FROM BOOKINGS WHERE BOOKING_ID = ?`,
      [booking_id]
    );

    if (!bookings.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (bookings[0].STATUS_ === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot pay for cancelled booking' });
    }

    // Real amount comes from the seats actually attached to this booking —
    // never from whatever the client sends.
    const [priceRows] = await db.query(
      `SELECT SUM(S.PRICE) AS total
       FROM Booking_Passenger BP
       JOIN SEAT S ON BP.SEAT_ID = S.SEAT_ID
       WHERE BP.BOOKING_ID = ?`,
      [booking_id]
    );

    const amount = priceRows[0].total;
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Could not determine booking amount' });
    }

    const [result] = await db.query(
      `INSERT INTO PAYMENT (BOOKING_ID, AMOUNT, PAYMENT_METHOD, PAYMENT_DATE, PAYMENT_STATUS)
       VALUES (?, ?, ?, ?, 'PAID')`,
      [booking_id, amount, payment_method, payment_date || new Date()]
    );

    res.json({ success: true, payment_id: result.insertId, amount, message: 'Payment successful' });
  } catch (err) {
    console.error('PAYMENT ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;