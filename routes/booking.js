const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Flight = require('../models/Flight');
const Passenger = require('../models/Passenger');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { requireAuth } = require('./auth');

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

// Finds (without claiming) the first available seat of the requested class.
router.post('/seat', async (req, res) => {
    const { flight_id, class: cls } = req.body;

    if (!flight_id || !cls) {
        return res.status(400).json({ success: false, message: 'flight_id and class are required' });
    }

    try {
        const flight = await Flight.findById(flight_id).lean();
        if (!flight) return res.status(404).json({ success: false, message: 'Flight not found' });

        const seat = flight.seats.find(s => s.class === cls && s.availability);
        if (!seat) return res.status(400).json({ success: false, message: 'No seats available in this class' });

        res.json({ success: true, seat_id: seat._id, seat_number: seat.seat_number, price: seat.price });
    } catch (err) {
        console.error('SEAT ASSIGN ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Booking requires a logged-in user — bookings are tied to req.session.userId.
router.post('/booking', requireAuth, async (req, res) => {
    const { flight_id, passenger_id, seat_id, meal_preference, wheelchair_required, special_assistance, infant_bassinet_required } = req.body;

    if (!flight_id || !passenger_id || !seat_id) {
        return res.status(400).json({ success: false, message: 'flight_id, passenger_id and seat_id are required' });
    }

    try {
        const flightDoc = await Flight.findById(flight_id).lean();
        if (!flightDoc) return res.status(404).json({ success: false, message: 'Flight not found' });

        const idx = flightDoc.seats.findIndex(s => String(s._id) === String(seat_id));
        if (idx === -1) return res.status(404).json({ success: false, message: 'Seat not found' });

        // Atomically claim the seat by its array index: only matches while
        // it's still available, so two simultaneous requests for the same
        // seat can't both succeed.
        const claim = await Flight.findOneAndUpdate(
            { _id: flight_id, [`seats.${idx}._id`]: seat_id, [`seats.${idx}.availability`]: true },
            { $set: { [`seats.${idx}.availability`]: false } },
            { new: true }
        );

        if (!claim) {
            return res.status(400).json({ success: false, message: 'Seat not available' });
        }

        const seat = claim.seats.id(seat_id);

        try {
            const booking = await Booking.create({
                user: req.session.userId,
                flight: flight_id,
                passenger: passenger_id,
                seat_id,
                seat_number: seat.seat_number,
                cabin_class: seat.class,
                meal_preference,
                wheelchair_required,
                special_assistance,
                infant_bassinet_required
            });

            res.json({ success: true, booking_id: booking._id, message: 'Booking successful' });
        } catch (err) {
            // Booking failed after the seat was claimed — release it.
            await Flight.updateOne(
                { _id: flight_id },
                { $set: { [`seats.${idx}.availability`]: true } }
            ).catch(() => {});
            throw err;
        }
    } catch (err) {
        console.error('BOOKING INSERT ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Cancelling requires a logged-in user, and only the booking's own owner
// may cancel it — prevents cancelling someone else's booking by guessing
// its id.
router.put('/cancel-booking', requireAuth, async (req, res) => {
    const { booking_id } = req.body;

    try {
        const booking = mongoose.isValidObjectId(booking_id) ? await Booking.findById(booking_id) : null;
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (String(booking.user) !== String(req.session.userId)) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
        }
        if (booking.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Already cancelled' });

        const flightForCancel = await Flight.findById(booking.flight).lean();
        if (flightForCancel) {
            const idx = flightForCancel.seats.findIndex(s => String(s._id) === String(booking.seat_id));
            if (idx !== -1) {
                await Flight.updateOne(
                    { _id: booking.flight },
                    { $set: { [`seats.${idx}.availability`]: true } }
                );
            }
        }

        booking.status = 'CANCELLED';
        await booking.save();

        await Payment.updateMany({ booking: booking._id }, { $set: { payment_status: 'REFUNDED' } });

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        console.error('CANCEL BOOKING ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

function wallClockText(str) {
    // departure_time/arrival_time are already "YYYY-MM-DD HH:MM:SS" strings
    return str ? str.slice(0, 16) : null;
}

// Booking details are personal (passenger name, passport number, payment
// info) — only available to a logged-in user, and only for their own
// booking. Prevents viewing another user's booking by guessing its id.
router.get('/booking-details/:booking_id', requireAuth, async (req, res) => {
    const { booking_id } = req.params;

    try {
        if (!mongoose.isValidObjectId(booking_id)) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const booking = await Booking.findById(booking_id).lean();
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (String(booking.user) !== String(req.session.userId)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
        }

        const [flight, passenger, payment] = await Promise.all([
            Flight.findById(booking.flight).lean(),
            Passenger.findById(booking.passenger).lean(),
            Payment.findOne({ booking: booking._id }).sort({ createdAt: -1 }).lean()
        ]);

        if (!flight || !passenger) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const seat = (flight.seats || []).find(s => String(s._id) === String(booking.seat_id));

        res.json({
            success: true,
            data: [{
                BOOKING_ID: booking._id,
                STATUS_: booking.status,
                BOOKING_DATE: booking.booking_date,
                FLIGHT_NUMBER: flight.flight_number,
                AIRLINE_NAME: flight.airline_name,
                ORIGIN: flight.origin,
                DESTINATION: flight.destination,
                DEP_TEXT: wallClockText(flight.departure_time),
                ARR_TEXT: wallClockText(flight.arrival_time),
                NAME: passenger.name,
                AGE: passenger.age,
                GENDER: passenger.gender,
                PASSPORT_NUMBER: passenger.passport_number,
                SEAT_NUMBER: booking.seat_number || (seat && seat.seat_number),
                CLASS: booking.cabin_class || (seat && seat.class),
                PRICE: seat ? seat.price : null,
                MEAL_PREFERENCE: booking.meal_preference,
                WHEELCHAIR_REQUIRED: booking.wheelchair_required,
                SPECIAL_ASSISTANCE: booking.special_assistance,
                INFANT_BASSINET_REQUIRED: booking.infant_bassinet_required,
                AMOUNT: payment ? payment.amount : null,
                PAYMENT_METHOD: payment ? payment.payment_method : null,
                PAYMENT_STATUS: payment ? payment.payment_status : null
            }]
        });
    } catch (err) {
        console.error('BOOKING DETAILS ERROR:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// A logged-in user's own bookings, for Manage Booking.
router.get('/my-bookings', requireAuth, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.session.userId }).select('_id').lean();
        res.json({ success: true, booking_ids: bookings.map(b => b._id) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;