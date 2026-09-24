const express = require('express');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

const router = express.Router();


// ============================================================
// AUTH
// ============================================================

function requireAuth(req, res, next) {

  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please login first.'
    });
  }

  next();
}


// ============================================================
// PROCESS PAYMENT
// ============================================================

router.post('/payment', requireAuth, async (req, res) => {

  try {

    const {
      booking_id,
      payment_method
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required.'
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        booking_id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.'
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required.'
      });
    }

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const userId =
      req.session.user._id ||
      req.session.user.id;

    // --------------------------------------------------------
    // BOOKING
    // --------------------------------------------------------

    const booking =
      await Booking.findOne({
        _id: booking_id,
        user: userId
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (
      booking.status === 'CANCELLED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'This booking has been cancelled.'
      });
    }

    // --------------------------------------------------------
    // PREVENT DOUBLE PAYMENT
    // --------------------------------------------------------

    const existingPayment =
      await Payment.findOne({
        booking: booking._id,
        payment_status: 'PAID'
      });

    if (existingPayment) {

      return res.status(400).json({
        success: false,
        message:
          'Payment has already been completed for this booking.',
        amount:
          existingPayment.amount
      });
    }

    // --------------------------------------------------------
    // FLIGHT
    // --------------------------------------------------------

    const flight =
      await Flight.findById(
        booking.flight
      );

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found.'
      });
    }

    // --------------------------------------------------------
    // CALCULATE SERVER-SIDE TOTAL
    // --------------------------------------------------------

    let totalAmount = 0;

    // New multi-passenger booking
    if (
      Array.isArray(booking.passengers) &&
      booking.passengers.length > 0
    ) {

      for (
        const passenger
        of booking.passengers
      ) {

        const seat =
          flight.seats.id(
            passenger.seat_id
          );

        if (!seat) {
          return res.status(400).json({
            success: false,
            message:
              `Seat ${passenger.seat_number} could not be found.`
          });
        }

        totalAmount += Number(
          seat.price || 0
        );
      }

    } else {

      // Legacy single-passenger booking

      const seat =
        flight.seats.id(
          booking.seat_id
        );

      if (!seat) {
        return res.status(400).json({
          success: false,
          message:
            'Could not determine booking amount.'
        });
      }

      totalAmount =
        Number(seat.price || 0);
    }

    // --------------------------------------------------------
    // FINAL VALIDATION
    // --------------------------------------------------------

    if (
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Could not determine booking amount.'
      });
    }

    // --------------------------------------------------------
    // CREATE PAYMENT
    // --------------------------------------------------------

    const payment =
      await Payment.create({

        booking:
          booking._id,

        amount:
          totalAmount,

        payment_method:
          payment_method,

        payment_status:
          'PAID'
      });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.json({

      success: true,

      message:
        'Payment completed successfully.',

      payment_id:
        payment._id,

      booking_id:
        booking._id,

      amount:
        totalAmount,

      payment_status:
        payment.payment_status,

      payment_method:
        payment.payment_method
    });

  } catch (error) {

    console.error(
      'PAYMENT ERROR:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        'Payment processing failed.'
    });
  }
});


module.exports = router;