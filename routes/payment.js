const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

router.post('/payment', async (req, res) => {
    const {
        booking_id,
        payment_method,
        payment_date
    } = req.body;

    // Validate required fields
    if (!booking_id || !payment_method) {
        return res.status(400).json({
            success: false,
            message: 'booking_id and payment_method are required'
        });
    }

    // MongoDB ObjectId validation
    if (!mongoose.isValidObjectId(booking_id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid booking ID'
        });
    }

    try {
        // Find the booking
        const booking = await Booking.findById(booking_id).lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Don't allow payment for cancelled bookings
        if (booking.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot pay for cancelled booking'
            });
        }

        // Find the flight associated with the booking
        const flight = await Flight.findById(booking.flight).lean();

        if (!flight) {
            return res.status(404).json({
                success: false,
                message: 'Flight not found'
            });
        }

        // Find the booked seat
        const seat = (flight.seats || []).find(
            s => String(s._id) === String(booking.seat_id)
        );

        if (!seat) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine booking amount'
            });
        }

        // Use the actual seat price from MongoDB.
        // Do NOT trust the amount sent by the frontend.
        const amount = Number(seat.price);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking amount'
            });
        }

        // Prevent duplicate payment records for the same booking
        const existingPayment = await Payment.findOne({
            booking: booking._id,
            payment_status: 'PAID'
        }).lean();

        if (existingPayment) {
            return res.status(400).json({
                success: false,
                message: 'Payment has already been completed for this booking',
                payment_id: existingPayment._id.toString(),
                amount: existingPayment.amount
            });
        }

        // Create payment
        const payment = await Payment.create({
            booking: booking._id,
            amount: amount,
            payment_method: payment_method,
            payment_date: payment_date
                ? new Date(payment_date)
                : new Date(),
            payment_status: 'PAID'
        });

        // Send MongoDB IDs as strings
        res.json({
            success: true,
            payment_id: payment._id.toString(),
            booking_id: booking._id.toString(),
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            message: 'Payment successful'
        });

    } catch (err) {
        console.error('PAYMENT ERROR:', err);

        res.status(500).json({
            success: false,
            message: err.message || 'Payment processing failed'
        });
    }
});

module.exports = router;