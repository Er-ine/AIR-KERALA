require('dotenv').config();
const db = require('./db');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Passenger = require('./models/Passenger');
const Flight = require('./models/Flight');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for persistent auth
app.use(session({
  secret: process.env.SESSION_SECRET || 'airkerala_session_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false
  }
}));

app.use(express.static('Public'));

// Import routes
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const liveFlightRoutes = require('./routes/liveflights');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', flightRoutes);
app.use('/api', bookingRoutes);
app.use('/api', paymentRoutes);
app.use('/api', liveFlightRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// TOTAL BOOKINGS
app.get('/api/dashboard/bookings', async (req, res) => {
  try {
    const count = await Booking.countDocuments();
    res.json({ totalBookings: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL REVENUE
app.get('/api/dashboard/revenue', async (req, res) => {
  try {
    const result = await Payment.aggregate([
      { $match: { payment_status: 'PAID' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = result.length ? result[0].totalRevenue : 0;
    res.json({ totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL PASSENGERS
app.get('/api/dashboard/passengers', async (req, res) => {
  try {
    const count = await Passenger.countDocuments();
    res.json({ totalPassengers: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL FLIGHTS
app.get('/api/dashboard/flights', async (req, res) => {
  try {
    const count = await Flight.countDocuments();
    res.json({ totalFlights: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});