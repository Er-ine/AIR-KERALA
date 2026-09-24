const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');

const { requireAuth } = require('./auth');


router.post(
    '/payment',
    requireAuth,
    async (req, res) => {

        const {
            booking_id,
            payment_method,
            payment_date
        } = req.body;


        if (
            !booking_id ||
            !payment_method
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'booking_id and payment_method are required'
            });
        }


        if (
            !mongoose.isValidObjectId(
                booking_id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid booking ID'
            });
        }


        try {

            const booking =
                await Booking.findById(
                    booking_id
                );


            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Booking not found'
                });
            }


            /*
             * Only the owner can pay.
             */
            if (
                String(booking.user) !==
                String(req.session.userId)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        'Not authorized to pay for this booking'
                });
            }


            if (
                booking.status ===
                'CANCELLED'
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Cannot pay for cancelled booking'
                });
            }


            /*
             * Prevent duplicate payment.
             */
            const existingPayment =
                await Payment.findOne({

                    booking:
                        booking._id,

                    payment_status:
                        'PAID'

                }).lean();


            if (existingPayment) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Payment has already been completed for this booking',

                    payment_id:
                        existingPayment._id.toString(),

                    amount:
                        existingPayment.amount
                });
            }


            const flight =
                await Flight.findById(
                    booking.flight
                ).lean();


            if (!flight) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Flight not found'
                });
            }


            /*
             * Determine every booked seat.
             */
            let seatIds = [];


            if (
                Array.isArray(
                    booking.passengers
                ) &&
                booking.passengers.length
            ) {

                seatIds =
                    booking.passengers
                        .map(
                            passenger =>
                                passenger.seat_id
                        )
                        .filter(Boolean);

            } else if (
                booking.seat_id
            ) {

                /*
                 * Legacy booking support.
                 */
                seatIds = [
                    booking.seat_id
                ];
            }


            if (!seatIds.length) {

                return res.status(400).json({

                    success: false,

                    message:
                        'No booked seats found for this booking'
                });
            }


            /*
             * Calculate the amount directly
             * from MongoDB flight inventory.
             */
            let amount = 0;


            for (
                const seatId
                of seatIds
            ) {

                const seat =
                    (
                        flight.seats ||
                        []
                    ).find(
                        s =>
                            String(
                                s._id
                            ) ===
                            String(
                                seatId
                            )
                    );


                if (!seat) {

                    return res.status(400).json({

                        success: false,

                        message:
                            'Could not determine booking amount. One or more booked seats could not be found.'
                    });
                }


                const price =
                    Number(
                        seat.price
                    );


                if (
                    !Number.isFinite(
                        price
                    ) ||
                    price <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            'Invalid seat price'
                    });
                }


                amount += price;
            }


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Could not determine booking amount'
                });
            }


            /*
             * Create payment.
             *
             * Card number, CVV and UPI ID are
             * intentionally NOT stored.
             */
            const payment =
                await Payment.create({

                    booking:
                        booking._id,

                    amount:
                        amount,

                    payment_method:
                        payment_method,

                    payment_date:
                        payment_date
                            ? new Date(
                                payment_date
                            )
                            : new Date(),

                    payment_status:
                        'PAID'
                });


            booking.payment_status =
                'PAID';

            await booking.save();


            res.json({

                success: true,

                payment_id:
                    payment._id.toString(),

                booking_id:
                    booking._id.toString(),

                amount:
                    payment.amount,

                payment_method:
                    payment.payment_method,

                payment_status:
                    payment.payment_status,

                message:
                    'Payment successful'
            });

        } catch (err) {

            console.error(
                'PAYMENT ERROR:',
                err
            );

            res.status(500).json({

                success: false,

                message:
                    err.message ||
                    'Payment processing failed'
            });
        }
    }
);


module.exports = router;