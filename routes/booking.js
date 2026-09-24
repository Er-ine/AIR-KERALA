const express = require('express');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Passenger = require('../models/Passenger');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

const router = express.Router();


// ============================================================
// AUTH MIDDLEWARE
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
// AGE CALCULATOR
// ============================================================

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const monthDifference = today.getMonth() - dob.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
}


// ============================================================
// CLAIM ONE AVAILABLE SEAT SAFELY
// ============================================================

async function claimSeat(flightId, cabinClass) {
  for (let attempt = 0; attempt < 5; attempt++) {

    const flight = await Flight.findById(flightId);

    if (!flight) {
      throw new Error('Flight not found.');
    }

    const seatIndex = flight.seats.findIndex(
      seat =>
        seat.class === cabinClass &&
        seat.availability === true
    );

    if (seatIndex === -1) {
      throw new Error(
        `No ${cabinClass} seats are currently available.`
      );
    }

    const seat = flight.seats[seatIndex];

    const updateField =
      `seats.${seatIndex}.availability`;

    const updatedFlight = await Flight.findOneAndUpdate(
      {
        _id: flightId,
        [updateField]: true
      },
      {
        $set: {
          [updateField]: false
        }
      },
      {
        new: true
      }
    );

    if (updatedFlight) {
      return updatedFlight.seats[seatIndex];
    }
  }

  throw new Error(
    'The selected seat became unavailable. Please try again.'
  );
}


// ============================================================
// RELEASE SEATS
// ============================================================

async function releaseSeats(flightId, seatIds) {
  if (!seatIds || seatIds.length === 0) {
    return;
  }

  const flight = await Flight.findById(flightId);

  if (!flight) {
    return;
  }

  const seatIdStrings = seatIds.map(id => String(id));

  let changed = false;

  flight.seats.forEach(seat => {
    if (
      seatIdStrings.includes(String(seat._id)) &&
      seat.availability === false
    ) {
      seat.availability = true;
      changed = true;
    }
  });

  if (changed) {
    await flight.save();
  }
}


// ============================================================
// OLD: CREATE PASSENGER
// ============================================================

router.post('/passenger', requireAuth, async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      passport_number
    } = req.body;

    if (!name || !age || !gender || !passport_number) {
      return res.status(400).json({
        success: false,
        message: 'All passenger fields are required.'
      });
    }

    const passenger = await Passenger.create({
      name,
      age,
      gender,
      passport_number
    });

    res.json({
      success: true,
      passenger_id: passenger._id
    });

  } catch (error) {
    console.error('Passenger creation error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// OLD: FIND AVAILABLE SEAT
// ============================================================

router.post('/seat', requireAuth, async (req, res) => {
  try {
    const {
      flight_id,
      cabin_class
    } = req.body;

    if (!flight_id || !cabin_class) {
      return res.status(400).json({
        success: false,
        message: 'Flight ID and cabin class are required.'
      });
    }

    const flight = await Flight.findById(flight_id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found.'
      });
    }

    const seat = flight.seats.find(
      s =>
        s.class === cabin_class &&
        s.availability === true
    );

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: `No ${cabin_class} seats available.`
      });
    }

    res.json({
      success: true,
      seat_id: seat._id,
      seat_number: seat.seat_number,
      price: seat.price,
      cabin_class: seat.class
    });

  } catch (error) {
    console.error('Seat lookup error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// NEW: MULTI-PASSENGER BOOKING
// ============================================================

router.post('/booking-group', requireAuth, async (req, res) => {

  const createdPassengerIds = [];
  const claimedSeatIds = [];

  try {

    const {
      flight_id,
      passengers,
      booking_date
    } = req.body;

    // --------------------------------------------------------
    // VALIDATE REQUEST
    // --------------------------------------------------------

    if (!flight_id) {
      return res.status(400).json({
        success: false,
        message: 'Flight ID is required.'
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(flight_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid flight ID.'
      });
    }

    if (
      !Array.isArray(passengers) ||
      passengers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'At least one passenger is required.'
      });
    }

    if (passengers.length > 9) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 9 passengers are allowed per booking.'
      });
    }

    // --------------------------------------------------------
    // CHECK FLIGHT
    // --------------------------------------------------------

    const flight = await Flight.findById(flight_id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found.'
      });
    }

    // --------------------------------------------------------
    // VALIDATE ALL PASSENGERS BEFORE CHANGING DB
    // --------------------------------------------------------

    for (let i = 0; i < passengers.length; i++) {

      const passenger = passengers[i];

      if (
        !passenger.first_name ||
        !passenger.surname ||
        !passenger.date_of_birth ||
        !passenger.gender ||
        !passenger.passport_number
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Please complete all required fields for Passenger ${i + 1}.`
        });
      }

      if (
        !['Male', 'Female', 'Other'].includes(
          passenger.gender
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid gender for Passenger ${i + 1}.`
        });
      }

      if (
        !passenger.cabin_class
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cabin class is required for Passenger ${i + 1}.`
        });
      }
    }

    // --------------------------------------------------------
    // CREATE PASSENGERS + CLAIM SEATS
    // --------------------------------------------------------

    const bookingPassengers = [];
    let totalAmount = 0;

    for (let i = 0; i < passengers.length; i++) {

      const data = passengers[i];

      const passengerDocument = await Passenger.create({
        first_name: data.first_name.trim(),
        surname: data.surname.trim(),
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        passport_number:
          data.passport_number.trim().toUpperCase(),

        meal_preference:
          data.meal_preference || 'None',

        special_assistance:
          data.special_assistance || 'None',

        wheelchair_required:
          Boolean(data.wheelchair_required),

        infant_bassinet_required:
          Boolean(data.infant_bassinet_required),

        // Legacy compatibility
        name:
          `${data.first_name.trim()} ${data.surname.trim()}`,

        age:
          calculateAge(data.date_of_birth)
      });

      createdPassengerIds.push(
        passengerDocument._id
      );

      // Claim seat
      const claimedSeat = await claimSeat(
        flight_id,
        data.cabin_class
      );

      claimedSeatIds.push(
        claimedSeat._id
      );

      totalAmount += Number(
        claimedSeat.price || 0
      );

      bookingPassengers.push({
        passenger: passengerDocument._id,
        seat_id: claimedSeat._id,
        seat_number: claimedSeat.seat_number,
        cabin_class: claimedSeat.class
      });
    }

    // --------------------------------------------------------
    // CREATE ONE BOOKING FOR THE WHOLE GROUP
    // --------------------------------------------------------

    const booking = await Booking.create({
      user: req.session.user._id ||
            req.session.user.id,

      flight: flight_id,

      passengers: bookingPassengers,

      booking_date:
        booking_date ||
        new Date().toISOString().split('T')[0],

      status: 'CONFIRMED'
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(201).json({
      success: true,

      message:
        'Booking created successfully.',

      booking_id: booking._id,

      amount: totalAmount,

      passengers:
        bookingPassengers.map(item => ({
          passenger_id: item.passenger,
          seat_id: item.seat_id,
          seat_number: item.seat_number,
          cabin_class: item.cabin_class
        }))
    });

  } catch (error) {

    console.error(
      'GROUP BOOKING ERROR:',
      error
    );

    // --------------------------------------------------------
    // ROLLBACK SEATS
    // --------------------------------------------------------

    try {

      if (claimedSeatIds.length > 0) {

        await releaseSeats(
          req.body.flight_id,
          claimedSeatIds
        );
      }

    } catch (releaseError) {

      console.error(
        'Seat rollback failed:',
        releaseError
      );
    }

    // --------------------------------------------------------
    // ROLLBACK PASSENGERS
    // --------------------------------------------------------

    try {

      if (createdPassengerIds.length > 0) {

        await Passenger.deleteMany({
          _id: {
            $in: createdPassengerIds
          }
        });
      }

    } catch (deleteError) {

      console.error(
        'Passenger rollback failed:',
        deleteError
      );
    }

    res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to create booking.'
    });
  }
});


// ============================================================
// OLD: SINGLE-PASSENGER BOOKING
// ============================================================

router.post('/booking', requireAuth, async (req, res) => {

  try {

    const {
      flight_id,
      passenger_id,
      seat_id,
      booking_date,
      meal_preference,
      wheelchair_required,
      special_assistance,
      infant_bassinet_required
    } = req.body;

    if (
      !flight_id ||
      !passenger_id ||
      !seat_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Flight, passenger and seat are required.'
      });
    }

    const flight = await Flight.findById(
      flight_id
    );

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found.'
      });
    }

    const seat = flight.seats.id(
      seat_id
    );

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Seat not found.'
      });
    }

    if (!seat.availability) {
      return res.status(409).json({
        success: false,
        message: 'Seat is no longer available.'
      });
    }

    seat.availability = false;

    await flight.save();

    const booking = await Booking.create({
      user:
        req.session.user._id ||
        req.session.user.id,

      flight: flight_id,

      passenger: passenger_id,

      seat_id: seat._id,

      seat_number: seat.seat_number,

      cabin_class: seat.class,

      meal_preference:
        meal_preference || 'None',

      wheelchair_required:
        wheelchair_required || 'NO',

      special_assistance:
        special_assistance || null,

      infant_bassinet_required:
        infant_bassinet_required || 'NO',

      booking_date:
        booking_date ||
        new Date().toISOString().split('T')[0],

      status: 'CONFIRMED'
    });

    res.json({
      success: true,
      booking_id: booking._id,
      amount: seat.price
    });

  } catch (error) {

    console.error(
      'Booking creation error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// MY BOOKINGS
// ============================================================

router.get('/my-bookings', requireAuth, async (req, res) => {

  try {

    const userId =
      req.session.user._id ||
      req.session.user.id;

    const bookings = await Booking
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .select('_id status booking_date createdAt');

    res.json({
      success: true,
      booking_ids:
        bookings.map(booking => ({
          id: booking._id,
          status: booking.status,
          booking_date: booking.booking_date,
          createdAt: booking.createdAt
        }))
    });

  } catch (error) {

    console.error(
      'My bookings error:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// BOOKING DETAILS
// ============================================================

router.get(
  '/booking-details/:booking_id',
  requireAuth,
  async (req, res) => {

    try {

      const {
        booking_id
      } = req.params;

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

      const userId =
        req.session.user._id ||
        req.session.user.id;

      const booking = await Booking
        .findOne({
          _id: booking_id,
          user: userId
        })
        .populate('flight')
        .populate('passengers.passenger')
        .populate('passenger');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found.'
        });
      }

      // ------------------------------------------------------
      // PAYMENT
      // ------------------------------------------------------

      const payment = await Payment
        .findOne({
          booking: booking._id
        })
        .sort({ createdAt: -1 });

      // ------------------------------------------------------
      // NEW MULTI-PASSENGER BOOKING
      // ------------------------------------------------------

      if (
        Array.isArray(booking.passengers) &&
        booking.passengers.length > 0
      ) {

        const passengerDetails = [];

        let totalAmount = 0;

        for (
          const item of booking.passengers
        ) {

          const passenger =
            item.passenger;

          const seat =
            booking.flight.seats.id(
              item.seat_id
            );

          const price =
            seat
              ? Number(seat.price || 0)
              : 0;

          totalAmount += price;

          passengerDetails.push({

            FIRST_NAME:
              passenger?.first_name || '',

            SURNAME:
              passenger?.surname || '',

            NAME:
              passenger
                ? `${passenger.first_name || ''} ${passenger.surname || ''}`.trim()
                : '',

            DOB:
              passenger?.date_of_birth || '',

            GENDER:
              passenger?.gender || '',

            PASSPORT_NUMBER:
              passenger?.passport_number || '',

            SEAT_NUMBER:
              item.seat_number,

            CLASS:
              item.cabin_class,

            PRICE:
              price,

            MEAL_PREFERENCE:
              passenger?.meal_preference ||
              'None',

            SPECIAL_ASSISTANCE:
              passenger?.special_assistance ||
              'None',

            WHEELCHAIR_REQUIRED:
              passenger?.wheelchair_required
                ? 'YES'
                : 'NO',

            INFANT_BASSINET_REQUIRED:
              passenger?.infant_bassinet_required
                ? 'YES'
                : 'NO'
          });
        }

        return res.json({
          success: true,

          data: {

            BOOKING_ID:
              booking._id,

            STATUS:
              booking.status,

            BOOKING_DATE:
              booking.booking_date,

            FLIGHT_NUMBER:
              booking.flight.flight_number,

            AIRLINE_NAME:
              booking.flight.airline_name,

            ORIGIN:
              booking.flight.origin,

            DESTINATION:
              booking.flight.destination,

            DEP_TEXT:
              booking.flight.departure_time,

            ARR_TEXT:
              booking.flight.arrival_time,

            PASSENGERS:
              passengerDetails,

            AMOUNT:
              totalAmount,

            PAYMENT_STATUS:
              payment
                ? payment.payment_status
                : 'PENDING',

            PAYMENT_METHOD:
              payment
                ? payment.payment_method
                : null
          }
        });
      }


      // ------------------------------------------------------
      // LEGACY SINGLE-PASSENGER BOOKING
      // ------------------------------------------------------

      const passenger =
        booking.passenger;

      const seat =
        booking.flight.seats.id(
          booking.seat_id
        );

      const amount =
        seat
          ? Number(seat.price || 0)
          : 0;

      return res.json({

        success: true,

        data: {

          BOOKING_ID:
            booking._id,

          STATUS:
            booking.status,

          BOOKING_DATE:
            booking.booking_date,

          FLIGHT_NUMBER:
            booking.flight.flight_number,

          AIRLINE_NAME:
            booking.flight.airline_name,

          ORIGIN:
            booking.flight.origin,

          DESTINATION:
            booking.flight.destination,

          DEP_TEXT:
            booking.flight.departure_time,

          ARR_TEXT:
            booking.flight.arrival_time,

          NAME:
            passenger?.name || '',

          AGE:
            passenger?.age || '',

          GENDER:
            passenger?.gender || '',

          PASSPORT_NUMBER:
            passenger?.passport_number || '',

          SEAT_NUMBER:
            booking.seat_number,

          CLASS:
            booking.cabin_class,

          PRICE:
            amount,

          MEAL_PREFERENCE:
            booking.meal_preference,

          WHEELCHAIR_REQUIRED:
            booking.wheelchair_required,

          SPECIAL_ASSISTANCE:
            booking.special_assistance,

          INFANT_BASSINET_REQUIRED:
            booking.infant_bassinet_required,

          PASSENGERS: [
            {
              NAME:
                passenger?.name || '',

              GENDER:
                passenger?.gender || '',

              PASSPORT_NUMBER:
                passenger?.passport_number || '',

              SEAT_NUMBER:
                booking.seat_number,

              CLASS:
                booking.cabin_class,

              PRICE:
                amount,

              MEAL_PREFERENCE:
                booking.meal_preference,

              SPECIAL_ASSISTANCE:
                booking.special_assistance,

              WHEELCHAIR_REQUIRED:
                booking.wheelchair_required,

              INFANT_BASSINET_REQUIRED:
                booking.infant_bassinet_required
            }
          ],

          AMOUNT:
            amount,

          PAYMENT_STATUS:
            payment
              ? payment.payment_status
              : 'PENDING',

          PAYMENT_METHOD:
            payment
              ? payment.payment_method
              : null
        }
      });

    } catch (error) {

      console.error(
        'Booking details error:',
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ============================================================
// CANCEL BOOKING
// ============================================================

router.put(
  '/cancel-booking',
  requireAuth,
  async (req, res) => {

    try {

      const {
        booking_id
      } = req.body;

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

      const userId =
        req.session.user._id ||
        req.session.user.id;

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
          message: 'Booking is already cancelled.'
        });
      }

      const seatIds = [];

      // New group booking
      if (
        Array.isArray(booking.passengers)
      ) {
        booking.passengers.forEach(
          passenger => {

            if (passenger.seat_id) {
              seatIds.push(
                passenger.seat_id
              );
            }
          }
        );
      }

      // Legacy booking
      if (booking.seat_id) {
        seatIds.push(
          booking.seat_id
        );
      }

      await releaseSeats(
        booking.flight,
        seatIds
      );

      booking.status = 'CANCELLED';

      await booking.save();

      // Refund payment record
      await Payment.updateMany(
        {
          booking: booking._id,
          payment_status: 'PAID'
        },
        {
          $set: {
            payment_status: 'REFUNDED'
          }
        }
      );

      res.json({
        success: true,
        message:
          'Booking cancelled successfully.'
      });

    } catch (error) {

      console.error(
        'Cancel booking error:',
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


module.exports = router;