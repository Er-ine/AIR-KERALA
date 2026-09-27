require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const liveflightRoutes = require('./routes/liveflights');


/* =========================================================
   CREATE EXPRESS APP
========================================================= */

const app = express();

const PORT = process.env.PORT || 3000;


/* =========================================================
   CORS
========================================================= */

app.use(
    cors({
        origin: true,
        credentials: true
    })
);


/* =========================================================
   BODY PARSING
========================================================= */

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


/* =========================================================
   SESSION
========================================================= */

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            'air-kerala-session-secret',

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure: false,

            sameSite: 'lax',

            maxAge:
                1000 *
                60 *
                60 *
                24
        }
    })
);


/* =========================================================
   STATIC FRONTEND
========================================================= */

app.use(
    express.static(
        path.join(
            __dirname,
            'Public'
        )
    )
);

app.use(
    '/assets',
    express.static(
        path.join(
            __dirname,
            'Public'
        )
    )
);


/* =========================================================
   API ROUTES
========================================================= */

/* AUTH */
app.use(
    '/api/auth',
    authRoutes
);


/* FLIGHTS */
app.use(
    '/api',
    flightRoutes
);


/* BOOKINGS */
app.use(
    '/api',
    bookingRoutes
);


/* PAYMENT */
app.use(
    '/api/payment',
    paymentRoutes
);


/* LIVE FLIGHTS */
app.use(
    '/api',
    liveflightRoutes
);


/* =========================================================
   SESSION DEBUG ROUTE
========================================================= */

app.get(
    '/api/session-test',
    (req, res) => {

        return res.json({

            success: true,

            loggedIn:
                !!(
                    req.session &&
                    req.session.userId
                ),

            userId:
                req.session
                    ? req.session.userId || null
                    : null,

            sessionId:
                req.sessionID || null

        });

    }
);


/* =========================================================
   ROOT ROUTE
========================================================= */

app.get(
    '/',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'Public',
                'index.html'
            )
        );

    }
);


/* =========================================================
   DATABASE + SERVER
========================================================= */

connectDB()

    .then(() => {

        app.listen(
            PORT,
            () => {

                console.log('');
                console.log(
                    '======================================'
                );

                console.log(
                    '        AIR KERALA SERVER'
                );

                console.log(
                    '======================================'
                );

                console.log(
                    `http://localhost:${PORT}`
                );

                console.log(
                    '======================================'
                );

                console.log('');
                console.log(
                    'MongoDB connected successfully.'
                );

                console.log(
                    'Server is running successfully.'
                );

                console.log('');

            }
        );

    })

    .catch((error) => {

        console.error(
            'MongoDB connection failed:',
            error.message
        );

        process.exit(1);

    });