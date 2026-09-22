const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

router.post('/payment', async (req, res) => {
    const { booking_id, payment_method, payment_date } = req.body;

    if (!booking_id || !payment_method) {
        return res.status(400).json({ success: false, message: 'booking_id and payment_method are required' });
    }

    try {
        const booking = mongoose.isValidObjectId(booking_id) ? await Booking.findById(booking_id).lean() : null;
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Cannot pay for cancelled booking' });

        // Real amount comes from the seat actually attached to this booking,
        // never from whatever the client sends.
        const flight = await Flight.findById(booking.flight).lean();
        const seat = flight && flight.seats.find(s => String(s._id) === String(booking.seat_id));

        if (!seat) return res.status(400).json({ success: false, message: 'Could not determine booking amount' });

        const payment = await Payment.create({
            booking: booking._id,
            amount: seat.price,
            payment_method,
            payment_date: payment_date ? new Date(payment_date) : new Date(),
            payment_status: 'PAID'
        });

        res.json({ success: true, payment_id: payment._id, amount: payment.amount, message: 'Payment successful' });
    } catch (err) {
        console.error('PAYMENT ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;