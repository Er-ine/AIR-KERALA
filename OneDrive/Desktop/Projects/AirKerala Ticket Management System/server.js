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
app.get('/api/dashboard/bookings', (req, res) => {
    const sql = `
        SELECT COUNT(*) AS totalBookings
        FROM BOOKINGS
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});

// TOTAL REVENUE
app.get('/api/dashboard/revenue', (req, res) => {
    const sql = `
        SELECT IFNULL(SUM(AMOUNT),0) AS totalRevenue
        FROM PAYMENT
        WHERE PAYMENT_STATUS='Completed'
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});

// TOTAL PASSENGERS
app.get('/api/dashboard/passengers', (req, res) => {
    const sql = `
        SELECT COUNT(*) AS totalPassengers
        FROM PASSENGER
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});

// TOTAL FLIGHTS
app.get('/api/dashboard/flights', (req, res) => {
    const sql = `
        SELECT COUNT(*) AS totalFlights
        FROM FLIGHT
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});
app.get('/api/debugdb', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) AS count FROM PASSENGER');
        res.json({ success: true, rows });
    } catch (err) {
        res.json({ success: false, message: err.message, code: err.code, stack: err.stack });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
