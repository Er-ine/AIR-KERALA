const express = require('express');
const router = express.Router();

const User = require('../models/User');


/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

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


/* =========================================================
   REGISTER
========================================================= */

router.post('/register', async (req, res) => {

    const {
        name,
        dateOfBirth,
        phoneNumber,
        email,
        password
    } = req.body;


    if (
        !name ||
        !dateOfBirth ||
        !phoneNumber ||
        !email ||
        !password
    ) {

        return res.status(400).json({
            success: false,
            message: 'All fields are required.'
        });
    }


    try {

        const cleanEmail =
            email.trim().toLowerCase();


        const existingUser =
            await User.findOne({
                email: cleanEmail
            });


        if (existingUser) {

            return res.status(409).json({
                success: false,
                message:
                    'An account with this email already exists.'
            });
        }


        const user =
            await User.create({
                name: name.trim(),
                dateOfBirth,
                phoneNumber: phoneNumber.trim(),
                email: cleanEmail,
                password
            });


        /*
         * Create login session immediately
         * after successful registration.
         */

        req.session.userId =
            user._id.toString();


        /*
         * Explicitly save session before
         * sending response.
         */

        req.session.save((err) => {

            if (err) {

                console.error(
                    'REGISTER SESSION ERROR:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Account created, but login session could not be created.'
                });
            }


            console.log('');
            console.log('================================');
            console.log('REGISTER SUCCESS');
            console.log('USER:', user.email);
            console.log('SESSION:', req.sessionID);
            console.log('USER ID:', req.session.userId);
            console.log('================================');
            console.log('');


            return res.json({

                success: true,

                authenticated: true,

                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email
                }

            });

        });


    } catch (error) {

        console.error(
            'REGISTER ERROR:',
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

});


/* =========================================================
   LOGIN
========================================================= */

router.post('/login', async (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (!email || !password) {

        return res.status(400).json({
            success: false,
            message:
                'Email and password are required.'
        });
    }


    try {

        const cleanEmail =
            email.trim().toLowerCase();


        console.log(
            'LOGIN ATTEMPT:',
            cleanEmail
        );


        const user =
            await User.findOne({
                email: cleanEmail
            });


        if (!user) {

            console.log(
                'LOGIN FAILED: USER NOT FOUND'
            );

            return res.status(401).json({
                success: false,
                message:
                    'Invalid email or password.'
            });
        }


        const passwordCorrect =
            await user.comparePassword(
                password
            );


        if (!passwordCorrect) {

            console.log(
                'LOGIN FAILED: WRONG PASSWORD'
            );

            return res.status(401).json({
                success: false,
                message:
                    'Invalid email or password.'
            });
        }


        /*
         * Store MongoDB user ID in session.
         */

        req.session.userId =
            user._id.toString();


        /*
         * IMPORTANT:
         * Force Express to save the session
         * before sending the login response.
         */

        req.session.save((err) => {

            if (err) {

                console.error(
                    'SESSION SAVE ERROR:',
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        'Login succeeded, but the session could not be saved.'
                });
            }


            console.log('');
            console.log('================================');
            console.log('LOGIN SUCCESS');
            console.log('EMAIL:', user.email);
            console.log('SESSION ID:', req.sessionID);
            console.log('SESSION USER ID:', req.session.userId);
            console.log('================================');
            console.log('');


            return res.json({

                success: true,

                authenticated: true,

                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email
                }

            });

        });


    } catch (error) {

        console.error(
            'LOGIN ERROR:',
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

});


/* =========================================================
   CURRENT USER
========================================================= */

router.get('/me', async (req, res) => {

    if (
        !req.session ||
        !req.session.userId
    ) {

        return res.status(401).json({
            success: false,
            authenticated: false,
            message: 'Not logged in.'
        });
    }


    try {

        const user =
            await User.findById(
                req.session.userId
            ).select(
                'name email phoneNumber dateOfBirth'
            );


        if (!user) {

            req.session.destroy(() => {});

            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Not logged in.'
            });
        }


        return res.json({

            success: true,

            authenticated: true,

            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth
            }

        });


    } catch (error) {

        console.error(
            'AUTH CHECK ERROR:',
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

});


/* =========================================================
   LOGOUT
========================================================= */

router.post('/logout', (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                'LOGOUT ERROR:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Logout failed.'
            });
        }


        res.clearCookie(
            'connect.sid',
            {
                httpOnly: true,
                sameSite: 'lax',
                secure: false
            }
        );


        return res.json({
            success: true
        });

    });

});


module.exports = router;
module.exports.requireAuth = requireAuth;