const http = require('http');
require('dotenv').config();

const connectDB = require('../db');
const User = require('../models/User');
const Booking = require('../models/Booking');

async function testApiEndpoint() {
  await connectDB();

  // Find a confirmed booking or existing booking in MongoDB
  const booking = await Booking.findOne({
    $or: [{ status: 'CONFIRMED' }, { status: 'PENDING' }, { status: 'CANCELLED' }]
  }).populate('passenger').populate('passengers.passenger');

  if (!booking) {
    console.error('No booking found in DB!');
    process.exit(1);
  }

  console.log(`Found target booking ID: ${booking._id}`);

  // Test the details parser logic directly
  const primaryFlight = booking.flight || booking.flightId;
  const p = (booking.passengers && booking.passengers[0] && booking.passengers[0].passenger) || booking.passenger || {};

  console.log('Target Passenger Raw Doc:', p);

  process.exit(0);
}

testApiEndpoint();
