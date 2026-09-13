require('dotenv').config();
const db = require('./db');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.static('Public'));
app.use(cors());
app.use(express.json());

// Import routes
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const liveFlightRoutes = require('./routes/liveflights');

// Use routes
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
    const [result] = await db.query(`SELECT COUNT(*) AS totalBookings FROM BOOKINGS`);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL REVENUE
app.get('/api/dashboard/revenue', async (req, res) => {
  try {
    const [result] = await db.query(
      `SELECT IFNULL(SUM(AMOUNT),0) AS totalRevenue FROM PAYMENT WHERE PAYMENT_STATUS='PAID'`
    );
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL PASSENGERS
app.get('/api/dashboard/passengers', async (req, res) => {
  try {
    const [result] = await db.query(`SELECT COUNT(*) AS totalPassengers FROM PASSENGER`);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TOTAL FLIGHTS
app.get('/api/dashboard/flights', async (req, res) => {
  try {
    const [result] = await db.query(`SELECT COUNT(*) AS totalFlights FROM FLIGHT`);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});