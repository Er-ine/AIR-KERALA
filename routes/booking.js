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
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      authenticated: false,
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
        `No ${cabinClass} seats are currently available for flight ${flight.flight_number}.`
      );
    }

    const updateField = `seats.${seatIndex}.availability`;

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
// MULTI-PASSENGER & MULTI-FLIGHT GROUP BOOKING
// ============================================================

router.post('/booking-group', requireAuth, async (req, res) => {

  const createdPassengerIds = [];
  const claimedSeatsByFlight = []; // array of { flightId, seatId }

  try {
    const {
      flight_id,
      flight_ids,
      passengers,
      booking_date,
      trip_type
    } = req.body;

    const userId = req.session.userId;

    // Collect all target flight IDs (support single flight or list of flight segments)
    const targetFlightIds = [];
    if (Array.isArray(flight_ids) && flight_ids.length > 0) {
      targetFlightIds.push(...flight_ids);
    } else if (flight_id) {
      targetFlightIds.push(flight_id);
    }

    if (targetFlightIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one flight ID is required.'
      });
    }

    for (const fId of targetFlightIds) {
      if (!mongoose.Types.ObjectId.isValid(fId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid flight ID: ${fId}`
        });
      }
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
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

    // Validate all target flights exist in MongoDB
    const flightDocuments = [];
    for (const fId of targetFlightIds) {
      const flight = await Flight.findById(fId);
      if (!flight) {
        return res.status(404).json({
          success: false,
          message: `Flight not found: ${fId}`
        });
      }
      flightDocuments.push(flight);
    }

    // Validate passenger details
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
          message: `Please complete all required fields for Passenger ${i + 1}.`
        });
      }

      if (!['Male', 'Female', 'Other'].includes(passenger.gender)) {
        return res.status(400).json({
          success: false,
          message: `Invalid gender for Passenger ${i + 1}.`
        });
      }

      if (!passenger.cabin_class) {
        return res.status(400).json({
          success: false,
          message: `Cabin class is required for Passenger ${i + 1}.`
        });
      }
    }

    // Process passenger DB documents and claim seats on each flight segment
    const bookingPassengers = [];
    let totalAmount = 0;

    for (let i = 0; i < passengers.length; i++) {
      const data = passengers[i];

      const passengerDocument = await Passenger.create({
        first_name: data.first_name.trim(),
        surname: data.surname.trim(),
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        passport_number: data.passport_number.trim().toUpperCase(),
        meal_preference: data.meal_preference || 'None',
        special_assistance: data.special_assistance || 'None',
        wheelchair_required: Boolean(data.wheelchair_required),
        infant_bassinet_required: Boolean(data.infant_bassinet_required),
        name: `${data.first_name.trim()} ${data.surname.trim()}`,
        age: calculateAge(data.date_of_birth)
      });

      createdPassengerIds.push(passengerDocument._id);

      // Claim seat for EACH flight segment
      for (const flightDoc of flightDocuments) {
        const claimedSeat = await claimSeat(flightDoc._id, data.cabin_class);
        claimedSeatsByFlight.push({
          flightId: flightDoc._id,
          seatId: claimedSeat._id
        });

        totalAmount += Number(claimedSeat.price || 0);

        bookingPassengers.push({
          passenger: passengerDocument._id,
          flight_id: flightDoc._id,
          seat_id: claimedSeat._id,
          seat_number: claimedSeat.seat_number,
          cabin_class: claimedSeat.class
        });
      }
    }

    // Build flight segments list
    const flightSegments = flightDocuments.map(f => ({
      flightId: f._id,
      flightNumber: f.flight_number,
      airlineName: f.airline_name,
      origin: f.origin,
      destination: f.destination,
      departureTime: f.departure_time,
      arrivalTime: f.arrival_time,
      departureDate: booking_date || new Date().toISOString().split('T')[0]
    }));

    const primaryFlight = flightDocuments[0];

    const booking = await Booking.create({
      userId: userId,
      user: userId,
      flightId: primaryFlight._id,
      flight: primaryFlight._id,
      flightNumber: primaryFlight.flight_number,
      origin: primaryFlight.origin,
      destination: primaryFlight.destination,
      departureTime: primaryFlight.departure_time,
      arrivalTime: primaryFlight.arrival_time,
      departureDate: booking_date || new Date().toISOString().split('T')[0],
      tripType: trip_type || (flightDocuments.length > 1 ? (flightDocuments.length === 2 ? 'ROUND_TRIP' : 'MULTI_CITY') : 'ONE_WAY'),
      flights: flightSegments,
      passengers: bookingPassengers,
      booking_date: booking_date || new Date().toISOString().split('T')[0],
      totalAmount: totalAmount,
      paymentStatus: 'PENDING',
      status: 'CONFIRMED'
    });

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      booking_id: booking._id,
      amount: totalAmount,
      passengers: bookingPassengers.map(item => ({
        passenger_id: item.passenger,
        flight_id: item.flight_id,
        seat_id: item.seat_id,
        seat_number: item.seat_number,
        cabin_class: item.cabin_class
      }))
    });

  } catch (error) {
    console.error('GROUP BOOKING ERROR:', error);

    // Rollback claimed seats
    try {
      for (const item of claimedSeatsByFlight) {
        await releaseSeats(item.flightId, [item.seatId]);
      }
    } catch (relErr) {
      console.error('Seat rollback error:', relErr);
    }

    // Rollback created passengers
    try {
      if (createdPassengerIds.length > 0) {
        await Passenger.deleteMany({ _id: { $in: createdPassengerIds } });
      }
    } catch (delErr) {
      console.error('Passenger rollback error:', delErr);
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create booking.'
    });
  }
});


// ============================================================
// SINGLE PASSENGER LEGACY BOOKING
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

    const userId = req.session.userId;

    if (!flight_id || !passenger_id || !seat_id) {
      return res.status(400).json({
        success: false,
        message: 'Flight, passenger and seat are required.'
      });
    }

    const flight = await Flight.findById(flight_id);
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found.'
      });
    }

    const seat = flight.seats.id(seat_id);
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
      userId: userId,
      user: userId,
      flightId: flight._id,
      flight: flight._id,
      flightNumber: flight.flight_number,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: flight.departure_time,
      arrivalTime: flight.arrival_time,
      passenger: passenger_id,
      seat_id: seat._id,
      seat_number: seat.seat_number,
      cabin_class: seat.class,
      meal_preference: meal_preference || 'None',
      wheelchair_required: wheelchair_required || 'NO',
      special_assistance: special_assistance || null,
      infant_bassinet_required: infant_bassinet_required || 'NO',
      booking_date: booking_date || new Date().toISOString().split('T')[0],
      departureDate: booking_date || new Date().toISOString().split('T')[0],
      totalAmount: seat.price,
      paymentStatus: 'PENDING',
      status: 'CONFIRMED'
    });

    res.json({
      success: true,
      booking_id: booking._id,
      amount: seat.price
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// MY BOOKINGS (MANAGE MY BOOKING API)
// ============================================================

router.get('/my-bookings', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const bookings = await Booking
      .find({
        $or: [
          { userId: userId },
          { user: userId }
        ]
      })
      .populate('flight')
      .populate('flightId')
      .populate('passengers.passenger')
      .populate('passenger')
      .sort({ createdAt: -1 });

    const formattedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const payment = await Payment.findOne({
          $or: [{ booking: booking._id }, { bookingId: booking._id }]
        }).sort({ createdAt: -1 });

        const primaryFlight = booking.flight || booking.flightId;

        let flightNumber = booking.flightNumber || primaryFlight?.flight_number || 'AK-101';
        let airlineName = primaryFlight?.airline_name || 'Air Kerala';
        let origin = booking.origin || primaryFlight?.origin || 'Kochi';
        let destination = booking.destination || primaryFlight?.destination || 'Trivandrum';
        let departureDate = booking.departureDate || booking.booking_date || (booking.createdAt ? booking.createdAt.toISOString().split('T')[0] : '');

        // Extract Passengers List
        const passengerList = [];
        if (Array.isArray(booking.passengers) && booking.passengers.length > 0) {
          booking.passengers.forEach(item => {
            const p = item.passenger || item;
            const name = (p && typeof p === 'object')
              ? (p.name || `${p.first_name || p.firstName || ''} ${p.surname || p.lastName || ''}`.trim())
              : 'Passenger';

            passengerList.push({
              name: name || 'Passenger',
              seatNumber: item.seat_number || item.seatNumber || booking.seatNumber || 'Unassigned',
              cabinClass: item.cabin_class || item.cabinClass || booking.cabinClass || 'Economy',
              mealPreference: p?.meal_preference || p?.mealPreference || booking.meal_preference || 'None',
              specialAssistance: p?.special_assistance || p?.specialAssistance || booking.special_assistance || 'None',
              wheelchairRequired: p?.wheelchair_required || p?.wheelchair || booking.wheelchair_required ? 'YES' : 'NO'
            });
          });
        } else if (booking.passenger) {
          const p = booking.passenger;
          const name = (typeof p === 'object')
            ? (p.name || `${p.firstName || p.first_name || ''} ${p.lastName || p.surname || ''}`.trim())
            : 'Passenger';

          passengerList.push({
            name: name || 'Passenger',
            seatNumber: booking.seatNumber || booking.seat_number || 'Unassigned',
            cabinClass: booking.cabinClass || booking.cabin_class || 'Economy',
            mealPreference: booking.meal_preference || p?.mealPreference || 'None',
            specialAssistance: booking.special_assistance || p?.medicalPreference || 'None',
            wheelchairRequired: (booking.wheelchair_required === 'YES' || p?.wheelchair) ? 'YES' : 'NO'
          });
        }

        // Amount & Payment Status
        let totalAmount = booking.totalAmount || booking.baseFare || 0;
        if (!totalAmount && payment) {
          totalAmount = payment.amount || 0;
        }

        let paymentStatus = payment
          ? (payment.payment_status || payment.status)
          : (booking.paymentStatus || 'PENDING');

        return {
          id: booking._id,
          booking_id: booking._id,
          bookingReference: booking.bookingReference || 'AK' + String(booking._id).slice(-6).toUpperCase(),
          ticketNumber: booking.ticketNumber || (booking.ticketStatus === 'ISSUED' ? 'AK-' + String(booking._id).slice(-8) : null),
          ticketStatus: booking.ticketStatus || (paymentStatus === 'PAID' ? 'ISSUED' : 'NOT_ISSUED'),
          status: booking.status || 'CONFIRMED',
          paymentStatus: paymentStatus,
          totalAmount: totalAmount,
          flightNumber: flightNumber,
          airlineName: airlineName,
          origin: origin,
          destination: destination,
          departureDate: departureDate,
          departureTime: booking.departureTime || primaryFlight?.departure_time || '10:00 AM',
          arrivalTime: booking.arrivalTime || primaryFlight?.arrival_time || '12:00 PM',
          tripType: booking.tripType || (booking.flights && booking.flights.length > 1 ? 'MULTI_CITY' : 'ONE_WAY'),
          flights: (booking.flights && booking.flights.length > 0) ? booking.flights : [{
            flightNumber, airlineName, origin, destination, departureDate,
            departureTime: booking.departureTime || primaryFlight?.departure_time || '',
            arrivalTime: booking.arrivalTime || primaryFlight?.arrival_time || ''
          }],
          passengers: passengerList,
          createdAt: booking.createdAt
        };
      })
    );

    res.json({
      success: true,
      bookings: formattedBookings,
      booking_ids: formattedBookings.map(b => ({
        id: b.id,
        status: b.status,
        booking_date: b.departureDate,
        createdAt: b.createdAt
      }))
    });

  } catch (error) {
    console.error('My bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// BOOKING DETAILS
// ============================================================

router.get('/booking-details/:booking_id', requireAuth, async (req, res) => {
  try {
    const { booking_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(booking_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.'
      });
    }

    const userId = req.session.userId;

    const booking = await Booking.findOne({
      _id: booking_id,
      $or: [
        { userId: userId },
        { user: userId }
      ]
    })
      .populate('flight')
      .populate('flightId')
      .populate('passengers.passenger')
      .populate('passenger');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const payment = await Payment.findOne({
      $or: [{ booking: booking._id }, { bookingId: booking._id }]
    }).sort({ createdAt: -1 });

    const primaryFlight = booking.flight || booking.flightId;

    const passengerDetails = [];
    let calculatedTotal = booking.totalAmount || 0;

    function parsePassenger(passengerObj, itemOrBooking) {
      let p = {};
      if (passengerObj && typeof passengerObj === 'object') {
        p = passengerObj.toObject ? passengerObj.toObject() : passengerObj;
      }
      let b = {};
      if (itemOrBooking && typeof itemOrBooking === 'object') {
        b = itemOrBooking.toObject ? itemOrBooking.toObject() : itemOrBooking;
      }

      let name = p.name || p.fullName || '';
      if (!name) {
        const fn = p.first_name || p.firstName || '';
        const sn = p.surname || p.lastName || '';
        name = `${fn} ${sn}`.trim();
      }
      if (!name) name = b.name || 'Passenger';

      const parts = name.split(' ');
      const firstName = p.first_name || p.firstName || parts[0] || 'Passenger';
      const surname = p.surname || p.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : '—');

      const dob = p.date_of_birth || p.dateOfBirth || p.dob || (p.age ? `Age: ${p.age}` : '') || b.date_of_birth || b.dateOfBirth || '—';
      const gender = p.gender || b.gender || 'Unspecified';
      const passport = p.passport_number || p.passportNumber || b.passport_number || b.passportNumber || '—';

      const seatNum = b.seat_number || b.seatNumber || p.seat_number || p.seatNumber || booking.seat_number || booking.seatNumber || 'Unassigned';
      const cabinCls = b.cabin_class || b.cabinClass || p.cabin_class || p.cabinClass || booking.cabin_class || booking.cabinClass || 'Economy';

      const mealPref = p.meal_preference || p.mealPreference || b.meal_preference || b.mealPreference || booking.meal_preference || 'None';
      const specAssist = p.special_assistance || p.specialAssistance || p.medicalPreference || b.special_assistance || b.specialAssistance || booking.special_assistance || 'None';

      const wheelchair = (p.wheelchair_required || p.wheelchair || b.wheelchair_required === 'YES' || b.wheelchair === 'YES' || booking.wheelchair_required === 'YES' || booking.wheelchair_required === true) ? 'YES' : 'NO';
      const infantBassinet = (p.infant_bassinet_required || p.infantBassinet || b.infant_bassinet_required === 'YES' || b.infant_bassinet_required === true || booking.infant_bassinet_required === 'YES' || booking.infant_bassinet_required === true) ? 'YES' : 'NO';

      return {
        FIRST_NAME: firstName,
        SURNAME: surname,
        NAME: name,
        DOB: dob,
        GENDER: gender,
        PASSPORT_NUMBER: passport,
        SEAT_NUMBER: seatNum,
        CLASS: cabinCls,
        MEAL_PREFERENCE: mealPref,
        SPECIAL_ASSISTANCE: specAssist,
        WHEELCHAIR_REQUIRED: wheelchair,
        INFANT_BASSINET_REQUIRED: infantBassinet
      };
    }

    async function resolvePassengerDoc(passRef) {
      if (!passRef) return null;
      if (typeof passRef === 'object' && (passRef.name || passRef.first_name || passRef.firstName)) {
        return passRef;
      }
      try {
        const id = passRef._id || passRef;
        const doc = await Passenger.findById(id).lean();
        if (doc) return doc;
      } catch (e) {}
      return null;
    }

    if (Array.isArray(booking.passengers) && booking.passengers.length > 0) {
      for (const item of booking.passengers) {
        const rawPassenger = await resolvePassengerDoc(item.passenger);
        const seat = primaryFlight?.seats ? primaryFlight.seats.id(item.seat_id) : null;
        const price = seat ? Number(seat.price || 0) : 0;

        if (!booking.totalAmount && price > 0) {
          calculatedTotal += price;
        }

        const parsed = parsePassenger(rawPassenger, item);
        parsed.PRICE = price;
        passengerDetails.push(parsed);
      }
    } else if (booking.passenger) {
      const rawPassenger = await resolvePassengerDoc(booking.passenger);
      const seat = primaryFlight?.seats ? primaryFlight.seats.id(booking.seat_id) : null;
      const price = seat ? Number(seat.price || 0) : (booking.totalAmount || 0);

      const parsed = parsePassenger(rawPassenger, booking);
      parsed.PRICE = price;
      passengerDetails.push(parsed);
    }

    const finalAmount = calculatedTotal > 0 ? calculatedTotal : (payment ? payment.amount : (booking.totalAmount || 0));

    let baseFare = booking.baseFare || 0;
    let taxes = booking.taxes || 0;
    let fees = booking.fees || 0;

    if (baseFare === 0 && finalAmount > 0) {
      baseFare = Math.round(finalAmount * 0.85);
      taxes = Math.round(finalAmount * 0.10);
      fees = finalAmount - baseFare - taxes;
    }

    return res.json({
      success: true,
      data: {
        BOOKING_ID: booking._id,
        PNR: booking.bookingReference || ('AK' + String(booking._id).slice(-6).toUpperCase()),
        TICKET_NUMBER: booking.ticketNumber || (booking.ticketStatus === 'ISSUED' ? ('AK-' + String(booking._id).slice(-8)) : null),
        TICKET_STATUS: booking.ticketStatus || (payment?.payment_status === 'PAID' ? 'ISSUED' : 'NOT_ISSUED'),
        ISSUED_AT: booking.issuedAt || booking.createdAt,
        STATUS: booking.status || 'CONFIRMED',
        BOOKING_DATE: booking.departureDate || booking.booking_date,
        FLIGHT_NUMBER: booking.flightNumber || primaryFlight?.flight_number || 'AK-101',
        AIRLINE_NAME: primaryFlight?.airline_name || 'Air Kerala',
        ORIGIN: booking.origin || primaryFlight?.origin || '',
        DESTINATION: booking.destination || primaryFlight?.destination || '',
        DEP_TEXT: booking.departureTime || primaryFlight?.departure_time || '',
        ARR_TEXT: booking.arrivalTime || primaryFlight?.arrival_time || '',
        TRIP_TYPE: booking.tripType || (booking.flights && booking.flights.length > 1 ? (booking.flights.length === 2 ? 'ROUND_TRIP' : 'MULTI_CITY') : 'ONE_WAY'),
        FLIGHTS: (booking.flights && booking.flights.length > 0) ? booking.flights : [{
          flightNumber: booking.flightNumber || primaryFlight?.flight_number || 'AK-101',
          airlineName: primaryFlight?.airline_name || 'Air Kerala',
          origin: booking.origin || primaryFlight?.origin || '',
          destination: booking.destination || primaryFlight?.destination || '',
          departureTime: booking.departureTime || primaryFlight?.departure_time || '',
          arrivalTime: booking.arrivalTime || primaryFlight?.arrival_time || '',
          departureDate: booking.departureDate || booking.booking_date
        }],
        PASSENGERS: passengerDetails,
        AMOUNT: finalAmount,
        BASE_FARE: baseFare,
        TAXES: taxes,
        FEES: fees,
        PAYMENT_STATUS: payment ? (payment.payment_status || payment.status) : (booking.paymentStatus || 'PENDING'),
        PAYMENT_METHOD: payment ? (payment.payment_method || payment.method) : (booking.paymentMethod || null),
        TRANSACTION_REF: booking.transactionReference || (payment ? payment._id : null)
      }
    });

  } catch (error) {
    console.error('Booking details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// CANCEL BOOKING
// ============================================================

router.put('/cancel-booking', requireAuth, async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(booking_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.'
      });
    }

    const userId = req.session.userId;

    const booking = await Booking.findOne({
      _id: booking_id,
      $or: [
        { userId: userId },
        { user: userId }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled.'
      });
    }

    // Collect seats and release them for each flight
    if (Array.isArray(booking.passengers) && booking.passengers.length > 0) {
      const seatsByFlight = new Map();
      booking.passengers.forEach(p => {
        const fId = String(p.flight_id || booking.flight || booking.flightId);
        if (p.seat_id && fId) {
          const list = seatsByFlight.get(fId) || [];
          list.push(p.seat_id);
          seatsByFlight.set(fId, list);
        }
      });

      for (const [fId, seatIds] of seatsByFlight.entries()) {
        await releaseSeats(fId, seatIds);
      }
    }

    if (booking.seat_id && (booking.flight || booking.flightId)) {
      await releaseSeats(booking.flight || booking.flightId, [booking.seat_id]);
    }

    booking.status = 'CANCELLED';
    booking.paymentStatus = 'REFUNDED';
    booking.ticketStatus = 'CANCELLED';
    booking.cancelledAt = new Date();

    await booking.save();

    await Payment.updateMany(
      {
        $or: [{ booking: booking._id }, { bookingId: booking._id }]
      },
      {
        $set: {
          payment_status: 'REFUNDED',
          status: 'REFUNDED'
        }
      }
    );

    return res.json({
      success: true,
      message: 'Booking cancelled successfully.'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


module.exports = router;