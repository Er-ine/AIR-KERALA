const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../db');
const Booking = require('../models/Booking');
const Passenger = require('../models/Passenger');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

async function testBookingDetailsEndpoint() {
  await connectDB();

  // Find any existing booking in MongoDB
  const bookings = await Booking.find().limit(5);

  console.log(`Found ${bookings.length} bookings in MongoDB.`);

  for (const b of bookings) {
    console.log(`\n========================================`);
    console.log(`Testing Booking ID: ${b._id}`);
    console.log(`========================================`);

    // Emulate /api/booking-details/:booking_id logic
    const primaryFlight = await Flight.findById(b.flight || b.flightId);
    const payment = await Payment.findOne({
      $or: [{ booking: b._id }, { bookingId: b._id }]
    });

    async function resolvePassengerDoc(passRef) {
      if (!passRef) return null;
      if (typeof passRef === 'object' && (passRef.name || passRef.first_name || passRef.firstName)) {
        return passRef;
      }
      try {
        const id = passRef._id || passRef;
        const doc = await Passenger.findById(id);
        if (doc) return doc;
      } catch (e) {
        console.error('Error resolving passenger doc:', e);
      }
      return null;
    }

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

      const seatNum = b.seat_number || b.seatNumber || p.seat_number || p.seatNumber || b.seat_number || b.seatNumber || 'Unassigned';
      const cabinCls = b.cabin_class || b.cabinClass || p.cabin_class || p.cabinClass || b.cabin_class || b.cabinClass || 'Economy';

      const mealPref = p.meal_preference || p.mealPreference || b.meal_preference || b.mealPreference || b.meal_preference || 'None';
      const specAssist = p.special_assistance || p.specialAssistance || p.medicalPreference || b.special_assistance || b.specialAssistance || b.special_assistance || 'None';

      const wheelchair = (p.wheelchair_required || p.wheelchair || b.wheelchair_required === 'YES' || b.wheelchair === 'YES' || b.wheelchair_required === 'YES' || b.wheelchair_required === true) ? 'YES' : 'NO';
      const infantBassinet = (p.infant_bassinet_required || p.infantBassinet || b.infant_bassinet_required === 'YES' || b.infant_bassinet_required === true || b.infant_bassinet_required === 'YES' || b.infant_bassinet_required === true) ? 'YES' : 'NO';

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

    const passengerDetails = [];
    if (Array.isArray(b.passengers) && b.passengers.length > 0) {
      for (const item of b.passengers) {
        const rawP = await resolvePassengerDoc(item.passenger);
        passengerDetails.push(parsePassenger(rawP, item));
      }
    } else if (b.passenger) {
      const rawP = await resolvePassengerDoc(b.passenger);
      passengerDetails.push(parsePassenger(rawP, b));
    }

    console.log(`PNR: ${b.bookingReference || 'N/A'}`);
    console.log(`Flight No: ${b.flightNumber || primaryFlight?.flight_number || 'AK-101'}`);
    console.log(`Passengers (${passengerDetails.length}):`);
    passengerDetails.forEach((p, idx) => {
      console.log(`  [P${idx + 1}] Name: "${p.NAME}" | Name Parts: ${p.FIRST_NAME} ${p.SURNAME} | DOB: ${p.DOB} | Gender: ${p.GENDER} | Passport: ${p.PASSPORT_NUMBER} | Seat: ${p.SEAT_NUMBER} (${p.CLASS}) | Meal: ${p.MEAL_PREFERENCE} | Special: ${p.SPECIAL_ASSISTANCE} | Wheelchair: ${p.WHEELCHAIR_REQUIRED} | Infant: ${p.INFANT_BASSINET_REQUIRED}`);
    });
  }

  process.exit(0);
}

testBookingDetailsEndpoint();
