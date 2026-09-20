const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

router.post('/payment', async (req, res) => {
  const { booking_id, payment_method, payment_date } = req.body;

  if (!booking_id || !payment_method) {
    return res.status(400).json({ success: false, message: 'booking_id and payment_method are required' });
  }

  try {
    const booking = await Booking.findById(booking_id).populate('flight');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot pay for cancelled booking' });
    }

    let amount = 0;
    const flight = booking.flight;
    if (flight && flight.seats) {
      const seat = flight.seats.id(booking.seat_id);
      if (seat) amount = seat.price;
    }

    if (!amount) {
      amount = req.body.amount || 5500;
    }

    const payment = await Payment.create({
      booking: booking._id,
      amount,
      payment_method,
      payment_date: payment_date || new Date(),
      payment_status: 'PAID'
    });

    res.json({ success: true, payment_id: payment._id, amount, message: 'Payment successful' });
  } catch (err) {
    console.error('PAYMENT ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;