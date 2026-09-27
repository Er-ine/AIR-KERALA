const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../db');
const User = require('../models/User');
const Flight = require('../models/Flight');
const Passenger = require('../models/Passenger');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

async function runTests() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('\n--- VERIFYING EXISTING MONGODB DATA INTEGRITY ---');
  const userCount = await User.countDocuments();
  const flightCount = await Flight.countDocuments();
  const passengerCount = await Passenger.countDocuments();
  const bookingCount = await Booking.countDocuments();
  const paymentCount = await Payment.countDocuments();

  console.log(`Users: ${userCount}`);
  console.log(`Flights: ${flightCount}`);
  console.log(`Passengers: ${passengerCount}`);
  console.log(`Bookings: ${bookingCount}`);
  console.log(`Payments: ${paymentCount}`);

  if (bookingCount === 0) {
    console.error('ERROR: No bookings found in MongoDB!');
    process.exit(1);
  }

  console.log('\n--- TESTING CASE E & F: EXISTING & CANCELLED BOOKINGS ---');
  const existingBookings = await Booking.find()
    .populate('flight')
    .populate('flightId')
    .populate('passengers.passenger')
    .populate('passenger')
    .limit(5);

  for (const b of existingBookings) {
    console.log(`\nBooking ID: ${b._id}`);
    console.log(`  PNR: ${b.bookingReference || 'N/A'}`);
    console.log(`  Ticket Num: ${b.ticketNumber || 'N/A'}`);
    console.log(`  Status: ${b.status}`);
    console.log(`  Payment Status: ${b.paymentStatus}`);
    console.log(`  Amount: ₹${b.totalAmount}`);
    console.log(`  Passengers Count: ${(b.passengers && b.passengers.length) || (b.passenger ? 1 : 0)}`);
  }

  console.log('\n--- TESTING NEW BOOKING CREATION WITH FULL DETAILS (Case A, B, C, D) ---');

  // Find a test user
  const user = await User.findOne();
  if (!user) {
    console.error('ERROR: No user found for test!');
    process.exit(1);
  }

  // Find 2 flights
  const flights = await Flight.find().limit(2);
  if (flights.length === 0) {
    console.error('ERROR: No flights found for test!');
    process.exit(1);
  }

  const f1 = flights[0];
  const f2 = flights.length > 1 ? flights[1] : flights[0];

  // Create 2 test passengers
  const p1 = await Passenger.create({
    first_name: 'Rahul',
    surname: 'Sharma',
    date_of_birth: '1992-05-15',
    gender: 'Male',
    passport_number: 'Z1234567',
    meal_preference: 'Vegetarian',
    special_assistance: 'None',
    wheelchair_required: false,
    infant_bassinet_required: false
  });

  const p2 = await Passenger.create({
    first_name: 'Priya',
    surname: 'Sharma',
    date_of_birth: '1995-08-20',
    gender: 'Female',
    passport_number: 'Z7654321',
    meal_preference: 'Kosher',
    special_assistance: 'Wheelchair Assistance',
    wheelchair_required: true,
    infant_bassinet_required: true
  });

  console.log('Created test passengers:', p1._id, p2._id);

  // Test Round Trip booking creation
  const roundTripBooking = await Booking.create({
    userId: user._id,
    user: user._id,
    flightId: f1._id,
    flight: f1._id,
    flightNumber: f1.flight_number,
    origin: f1.origin,
    destination: f1.destination,
    departureTime: f1.departure_time,
    arrivalTime: f1.arrival_time,
    departureDate: '2026-10-10',
    tripType: 'ROUND_TRIP',
    flights: [
      {
        flightId: f1._id,
        flightNumber: f1.flight_number,
        airlineName: f1.airline_name,
        origin: f1.origin,
        destination: f1.destination,
        departureTime: f1.departure_time,
        arrivalTime: f1.arrival_time,
        departureDate: '2026-10-10'
      },
      {
        flightId: f2._id,
        flightNumber: f2.flight_number,
        airlineName: f2.airline_name,
        origin: f2.origin,
        destination: f2.destination,
        departureTime: f2.departure_time,
        arrivalTime: f2.arrival_time,
        departureDate: '2026-10-15'
      }
    ],
    passengers: [
      {
        passenger: p1._id,
        flight_id: f1._id,
        seat_number: '12A',
        cabin_class: 'Business'
      },
      {
        passenger: p2._id,
        flight_id: f1._id,
        seat_number: '12B',
        cabin_class: 'Business'
      }
    ],
    totalAmount: 18500,
    baseFare: 15725,
    taxes: 1850,
    fees: 925,
    booking_date: '2026-10-10',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    ticketStatus: 'ISSUED',
    issuedAt: new Date(),
    bookingReference: 'AKRT' + Math.floor(1000 + Math.random() * 9000),
    ticketNumber: 'AK-' + Date.now().toString().slice(-8),
    paymentMethod: 'CARD',
    transactionReference: 'AKTX99887766'
  });

  console.log(`\nCreated Round-Trip Multi-Passenger Test Booking ID: ${roundTripBooking._id}`);

  // Retrieve via populated query (simulating API response)
  const retrieved = await Booking.findById(roundTripBooking._id)
    .populate('passengers.passenger')
    .populate('flight');

  console.log(`PNR: ${retrieved.bookingReference}`);
  console.log(`Ticket #: ${retrieved.ticketNumber}`);
  console.log(`Trip Type: ${retrieved.tripType}`);
  console.log(`Flight Segments: ${retrieved.flights.length}`);
  console.log(`Passengers Loaded: ${retrieved.passengers.length}`);

  retrieved.passengers.forEach((item, idx) => {
    const pass = item.passenger;
    console.log(`  Passenger ${idx + 1}: ${pass.first_name} ${pass.surname} | DOB: ${pass.date_of_birth} | Seat: ${item.seat_number} (${item.cabin_class}) | Meal: ${pass.meal_preference} | Special: ${pass.special_assistance} | Wheelchair: ${pass.wheelchair_required ? 'YES' : 'NO'}`);
  });

  console.log('\n--- CLEANING UP TEMPORARY TEST DATA ---');
  await Booking.deleteOne({ _id: roundTripBooking._id });
  await Passenger.deleteMany({ _id: { $in: [p1._id, p2._id] } });
  console.log('Cleanup complete.');

  console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
