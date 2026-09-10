const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/payment', async (req, res) => {
  const { booking_id, amount, payment_method, payment_date } = req.body;

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

    const [result] = await db.query(
      `INSERT INTO PAYMENT (BOOKING_ID, AMOUNT, PAYMENT_METHOD, PAYMENT_DATE, PAYMENT_STATUS)
       VALUES (?, ?, ?, ?, 'PAID')`,
      [booking_id, amount, payment_method, payment_date]
    );

    res.json({ success: true, payment_id: result.insertId, message: 'Payment successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;