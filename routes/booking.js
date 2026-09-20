const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Passenger = require('../models/Passenger');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

router.post('/passenger', async (req, res) => {
  const { name, age, gender, passport_number } = req.body;
  try {
    const passenger = await Passenger.create({ name, age, gender, passport_number });
    res.json({ success: true, passenger_id: passenger._id });
  } catch (err) {
    console.error('PASSENGER INSERT ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/seat', async (req, res) => {
  const { flight_id, class: cls } = req.body;

  if (!flight_id || !cls) {
    return res.status(400).json({ success: false, message: 'flight_id and class are required' });
  }

  try {
    const flight = await Flight.findById(flight_id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }

    const seat = flight.seats.find(s => s.class === cls && s.availability === true);

    if (!seat) {
      return res.status(400).json({ success: false, message: 'No seats available in this class' });
    }

    res.json({
      success: true,
      seat_id: seat._id,
      seat_number: seat.seat_number,
      price: seat.price
    });
  } catch (err) {
    console.error('SEAT ASSIGN ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/booking', async (req, res) => {
  const { agent_id, flight_id, booking_date, passenger_id, seat_id, meal_preference, wheelchair_required, special_assistance, infant_bassinet_required } = req.body;

  if (!flight_id || !passenger_id || !seat_id) {
    return res.status(400).json({ success: false, message: 'flight_id, passenger_id and seat_id are required' });
  }

  try {
    const flight = await Flight.findById(flight_id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }

    const seat = flight.seats.id(seat_id);
    if (!seat || !seat.availability) {
      return res.status(400).json({ success: false, message: 'Seat not available' });
    }

    seat.availability = false;
    await flight.save();

    const booking = await Booking.create({
      agent_id: agent_id || 1,
      flight: flight_id,
      passenger: passenger_id,
      seat_id: seat._id,
      seat_number: seat.seat_number,
      cabin_class: seat.class,
      booking_date: booking_date || new Date().toISOString().split('T')[0],
      meal_preference: meal_preference || 'None',
      wheelchair_required: wheelchair_required || 'NO',
      special_assistance: special_assistance || null,
      infant_bassinet_required: infant_bassinet_required || 'NO',
      status: 'CONFIRMED'
    });

    res.json({ success: true, booking_id: booking._id, message: 'Booking successful' });
  } catch (err) {
    console.error('BOOKING INSERT ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/cancel-booking', async (req, res) => {
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({ success: false, message: 'booking_id is required' });
  }

  try {
    const booking = await Booking.findById(booking_id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Already cancelled' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    const flight = await Flight.findById(booking.flight);
    if (flight) {
      const seat = flight.seats.id(booking.seat_id);
      if (seat) {
        seat.availability = true;
        await flight.save();
      }
    }

    await Payment.updateMany({ booking: booking._id }, { payment_status: 'REFUNDED' });

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('CANCEL BOOKING ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/booking-details/:booking_id', async (req, res) => {
  const { booking_id } = req.params;

  try {
    const booking = await Booking.findById(booking_id)
      .populate('flight')
      .populate('passenger');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payment = await Payment.findOne({ booking: booking._id });
    const flight = booking.flight;
    const passenger = booking.passenger;

    let seat = null;
    if (flight && flight.seats) {
      seat = flight.seats.id(booking.seat_id);
    }

    const formatted = {
      BOOKING_ID: booking._id,
      booking_id: booking._id,
      STATUS_: booking.status,
      status: booking.status,
      BOOKING_DATE: booking.booking_date,
      AIRLINE_NAME: flight ? flight.airline_name : '',
      ORIGIN: flight ? flight.origin : '',
      DESTINATION: flight ? flight.destination : '',
      DEPARTURE_TIME: flight ? flight.departure_time : '',
      ARRIVAL_TIME: flight ? flight.arrival_time : '',
      NAME: passenger ? passenger.name : '',
      AGE: passenger ? passenger.age : '',
      GENDER: passenger ? passenger.gender : '',
      SEAT_NUMBER: seat ? seat.seat_number : booking.seat_number || '',
      CLASS: seat ? seat.class : booking.cabin_class || '',
      PRICE: seat ? seat.price : 0,
      MEAL_PREFERENCE: booking.meal_preference,
      WHEELCHAIR_REQUIRED: booking.wheelchair_required,
      SPECIAL_ASSISTANCE: booking.special_assistance,
      INFANT_BASSINET_REQUIRED: booking.infant_bassinet_required,
      AMOUNT: payment ? payment.amount : 0,
      PAYMENT_METHOD: payment ? payment.payment_method : '',
      PAYMENT_STATUS: payment ? payment.payment_status : ''
    };

    res.json({ success: true, data: [formatted] });
  } catch (err) {
    console.error('BOOKING DETAILS ERROR:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;