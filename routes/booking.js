const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Flight = require('../models/Flight');
const Passenger = require('../models/Passenger');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const { requireAuth } = require('./auth');


/* =========================================================
   OLD SINGLE PASSENGER ENDPOINT
   Kept for compatibility
========================================================= */

router.post('/passenger', async (req, res) => {

    const {
        name,
        age,
        gender,
        passport_number
    } = req.body;

    try {

        const passenger = await Passenger.create({
            name,
            age,
            gender,
            passport_number
        });

        res.json({
            success: true,
            passenger_id: passenger._id
        });

    } catch (err) {

        console.error(
            'PASSENGER INSERT ERROR:',
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


/* =========================================================
   OLD SEAT LOOKUP ENDPOINT
========================================================= */

router.post('/seat', async (req, res) => {

    const {
        flight_id,
        class: cabinClass
    } = req.body;

    if (!flight_id || !cabinClass) {

        return res.status(400).json({
            success: false,
            message:
                'flight_id and class are required'
        });
    }

    try {

        const flight =
            await Flight.findById(flight_id).lean();

        if (!flight) {

            return res.status(404).json({
                success: false,
                message: 'Flight not found'
            });
        }

        const seat =
            flight.seats.find(
                s =>
                    s.class === cabinClass &&
                    s.availability === true
            );

        if (!seat) {

            return res.status(400).json({
                success: false,
                message:
                    'No seats available in this class'
            });
        }

        res.json({
            success: true,
            seat_id: seat._id,
            seat_number: seat.seat_number,
            price: seat.price
        });

    } catch (err) {

        console.error(
            'SEAT LOOKUP ERROR:',
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


/* =========================================================
   NEW MULTI-PASSENGER BOOKING
========================================================= */

router.post(
    '/booking-group',
    requireAuth,
    async (req, res) => {

        const {
            flight_id,
            cabin_class,
            passengers,
            booking_date
        } = req.body;

        if (!flight_id) {

            return res.status(400).json({
                success: false,
                message: 'Flight is required'
            });
        }

        if (
            !mongoose.isValidObjectId(
                flight_id
            )
        ) {

            return res.status(400).json({
                success: false,
                message: 'Invalid flight ID'
            });
        }

        if (
            !Array.isArray(passengers) ||
            passengers.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'At least one passenger is required'
            });
        }

        if (passengers.length > 9) {

            return res.status(400).json({
                success: false,
                message:
                    'Maximum 9 passengers per booking'
            });
        }

        const cabin =
            cabin_class || 'Economy';

        const createdPassengerIds = [];
        const claimedSeats = [];

        try {

            const flight =
                await Flight.findById(
                    flight_id
                );

            if (!flight) {

                return res.status(404).json({
                    success: false,
                    message: 'Flight not found'
                });
            }


            /*
             * Make sure enough seats exist before
             * modifying inventory.
             */
            const availableSeats =
                flight.seats.filter(
                    s =>
                        s.class === cabin &&
                        s.availability === true
                );

            if (
                availableSeats.length <
                passengers.length
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${availableSeats.length} ${cabin} seat(s) are available.`
                });
            }


            /*
             * Claim one seat at a time.
             *
             * The availability condition makes the
             * operation safe against simultaneous bookings.
             */
            for (
                let i = 0;
                i < passengers.length;
                i++
            ) {

                const requestedPassenger =
                    passengers[i];

                if (
                    !requestedPassenger.name ||
                    !requestedPassenger.age ||
                    !requestedPassenger.gender ||
                    !requestedPassenger.passport_number
                ) {

                    throw new Error(
                        `Complete details are required for Passenger ${i + 1}.`
                    );
                }


                const candidateFlight =
                    await Flight.findById(
                        flight_id
                    ).lean();

                const candidateSeat =
                    candidateFlight.seats.find(
                        seat =>
                            seat.class === cabin &&
                            seat.availability === true &&
                            !claimedSeats.some(
                                claimed =>
                                    String(
                                        claimed.seat_id
                                    ) ===
                                    String(seat._id)
                            )
                    );

                if (!candidateSeat) {

                    throw new Error(
                        'A seat became unavailable. Please try again.'
                    );
                }


                /*
                 * Atomically claim this exact seat.
                 */
                const updatedFlight =
                    await Flight.findOneAndUpdate(

                        {
                            _id: flight_id,
                            'seats._id':
                                candidateSeat._id,
                            'seats.availability':
                                true
                        },

                        {
                            $set: {
                                'seats.$.availability':
                                    false
                            }
                        },

                        {
                            new: true
                        }
                    );

                if (!updatedFlight) {

                    throw new Error(
                        'A selected seat is no longer available.'
                    );
                }


                const claimedSeat =
                    updatedFlight.seats.find(
                        seat =>
                            String(seat._id) ===
                            String(candidateSeat._id)
                    );

                claimedSeats.push({
                    seat_id:
                        claimedSeat._id,
                    seat_number:
                        claimedSeat.seat_number,
                    price:
                        Number(
                            claimedSeat.price
                        )
                });


                /*
                 * Store passenger separately too,
                 * preserving the existing Passenger collection.
                 */
                const passengerDoc =
                    await Passenger.create({

                        name:
                            String(
                                requestedPassenger.name
                            ).trim(),

                        age:
                            Number(
                                requestedPassenger.age
                            ),

                        gender:
                            requestedPassenger.gender,

                        passport_number:
                            String(
                                requestedPassenger.passport_number
                            ).trim()
                    });

                createdPassengerIds.push(
                    passengerDoc._id
                );
            }


            /*
             * Build one booking containing
             * every passenger.
             */
            const passengerEntries =
                passengers.map(
                    (passenger, index) => {

                        const seat =
                            claimedSeats[index];

                        return {

                            passenger_id:
                                createdPassengerIds[index],

                            name:
                                String(
                                    passenger.name
                                ).trim(),

                            age:
                                Number(
                                    passenger.age
                                ),

                            gender:
                                passenger.gender,

                            passport_number:
                                String(
                                    passenger.passport_number
                                ).trim(),

                            seat_id:
                                seat.seat_id,

                            seat_number:
                                seat.seat_number,

                            meal_preference:
                                passenger.meal_preference ||
                                'None',

                            wheelchair_required:
                                passenger.wheelchair_required ===
                                'YES'
                                    ? 'YES'
                                    : 'NO',

                            special_assistance:
                                passenger.special_assistance ||
                                'None',

                            infant_bassinet_required:
                                passenger.infant_bassinet_required ===
                                'YES'
                                    ? 'YES'
                                    : 'NO'
                        };
                    }
                );


            const totalAmount =
                claimedSeats.reduce(
                    (sum, seat) =>
                        sum + Number(seat.price),
                    0
                );


            const booking =
                await Booking.create({

                    user:
                        req.session.userId,

                    flight:
                        flight_id,

                    passengers:
                        passengerEntries,

                    /*
                     * Keep first passenger/seat in
                     * legacy fields.
                     */
                    passenger:
                        createdPassengerIds[0],

                    seat_id:
                        claimedSeats[0].seat_id,

                    seat_number:
                        claimedSeats[0].seat_number,

                    cabin_class:
                        cabin,

                    booking_date:
                        booking_date ||
                        new Date()
                            .toISOString()
                            .split('T')[0],

                    payment_status:
                        'PENDING',

                    status:
                        'CONFIRMED'
                });


            res.json({

                success: true,

                booking_id:
                    booking._id.toString(),

                passenger_count:
                    passengerEntries.length,

                seats:
                    claimedSeats.map(
                        s => s.seat_number
                    ),

                total_amount:
                    totalAmount,

                payment_status:
                    'PENDING',

                message:
                    'Booking created successfully'
            });

        } catch (err) {

            console.error(
                'GROUP BOOKING ERROR:',
                err
            );


            /*
             * Roll back all seats already claimed.
             */
            for (
                const claimed of claimedSeats
            ) {

                try {

                    const currentFlight =
                        await Flight.findById(
                            flight_id
                        );

                    if (!currentFlight)
                        continue;

                    const seatIndex =
                        currentFlight.seats.findIndex(
                            s =>
                                String(s._id) ===
                                String(
                                    claimed.seat_id
                                )
                        );

                    if (seatIndex !== -1) {

                        await Flight.updateOne(
                            {
                                _id:
                                    flight_id
                            },
                            {
                                $set: {
                                    [`seats.${seatIndex}.availability`]:
                                        true
                                }
                            }
                        );
                    }

                } catch (rollbackError) {

                    console.error(
                        'SEAT ROLLBACK ERROR:',
                        rollbackError
                    );
                }
            }


            /*
             * Remove Passenger documents created
             * before the booking failed.
             */
            if (
                createdPassengerIds.length
            ) {

                await Passenger.deleteMany({
                    _id: {
                        $in:
                            createdPassengerIds
                    }
                }).catch(() => {});
            }


            res.status(500).json({

                success: false,

                message:
                    err.message ||
                    'Could not create booking'
            });
        }
    }
);


/* =========================================================
   LEGACY SINGLE BOOKING
========================================================= */

router.post(
    '/booking',
    requireAuth,
    async (req, res) => {

        const {
            flight_id,
            passenger_id,
            seat_id,
            meal_preference,
            wheelchair_required,
            special_assistance,
            infant_bassinet_required
        } = req.body;

        if (
            !flight_id ||
            !passenger_id ||
            !seat_id
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'flight_id, passenger_id and seat_id are required'
            });
        }

        try {

            const flight =
                await Flight.findById(
                    flight_id
                );

            if (!flight) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Flight not found'
                });
            }


            const seatIndex =
                flight.seats.findIndex(
                    s =>
                        String(s._id) ===
                        String(seat_id)
                );

            if (seatIndex === -1) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Seat not found'
                });
            }


            const claim =
                await Flight.findOneAndUpdate(

                    {
                        _id: flight_id,

                        [`seats.${seatIndex}._id`]:
                            seat_id,

                        [`seats.${seatIndex}.availability`]:
                            true
                    },

                    {
                        $set: {
                            [`seats.${seatIndex}.availability`]:
                                false
                        }
                    },

                    {
                        new: true
                    }
                );

            if (!claim) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Seat not available'
                });
            }


            const seat =
                claim.seats.id(
                    seat_id
                );


            try {

                const passenger =
                    await Passenger.findById(
                        passenger_id
                    ).lean();

                if (!passenger) {

                    throw new Error(
                        'Passenger not found'
                    );
                }


                const booking =
                    await Booking.create({

                        user:
                            req.session.userId,

                        flight:
                            flight_id,

                        passenger:
                            passenger_id,

                        seat_id:
                            seat_id,

                        seat_number:
                            seat.seat_number,

                        cabin_class:
                            seat.class,

                        meal_preference:
                            meal_preference ||
                            'None',

                        wheelchair_required:
                            wheelchair_required ||
                            'NO',

                        special_assistance:
                            special_assistance ||
                            'None',

                        infant_bassinet_required:
                            infant_bassinet_required ||
                            'NO',

                        passengers: [
                            {
                                passenger_id:
                                    passenger._id,

                                name:
                                    passenger.name,

                                age:
                                    passenger.age,

                                gender:
                                    passenger.gender,

                                passport_number:
                                    passenger.passport_number,

                                seat_id:
                                    seat._id,

                                seat_number:
                                    seat.seat_number,

                                meal_preference:
                                    meal_preference ||
                                    'None',

                                wheelchair_required:
                                    wheelchair_required ||
                                    'NO',

                                special_assistance:
                                    special_assistance ||
                                    'None',

                                infant_bassinet_required:
                                    infant_bassinet_required ||
                                    'NO'
                            }
                        ],

                        payment_status:
                            'PENDING'
                    });


                res.json({

                    success: true,

                    booking_id:
                        booking._id.toString(),

                    total_amount:
                        Number(seat.price),

                    message:
                        'Booking successful'
                });

            } catch (err) {

                await Flight.updateOne(

                    {
                        _id:
                            flight_id
                    },

                    {
                        $set: {
                            [`seats.${seatIndex}.availability`]:
                                true
                        }
                    }
                );

                throw err;
            }

        } catch (err) {

            console.error(
                'BOOKING INSERT ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);


/* =========================================================
   CANCEL BOOKING
========================================================= */

router.put(
    '/cancel-booking',
    requireAuth,
    async (req, res) => {

        const {
            booking_id
        } = req.body;

        try {

            if (
                !mongoose.isValidObjectId(
                    booking_id
                )
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Booking not found'
                });
            }


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


            if (
                String(booking.user) !==
                String(req.session.userId)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        'Not authorized'
                });
            }


            if (
                booking.status ===
                'CANCELLED'
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Booking already cancelled'
                });
            }


            const flight =
                await Flight.findById(
                    booking.flight
                );


            if (flight) {

                const seatsToRelease = [];


                if (
                    Array.isArray(
                        booking.passengers
                    ) &&
                    booking.passengers.length
                ) {

                    booking.passengers.forEach(
                        passenger => {

                            if (
                                passenger.seat_id
                            ) {

                                seatsToRelease.push(
                                    passenger.seat_id
                                );
                            }
                        }
                    );

                } else if (
                    booking.seat_id
                ) {

                    seatsToRelease.push(
                        booking.seat_id
                    );
                }


                for (
                    const seatId
                    of seatsToRelease
                ) {

                    const index =
                        flight.seats.findIndex(
                            seat =>
                                String(
                                    seat._id
                                ) ===
                                String(seatId)
                        );

                    if (index !== -1) {

                        flight.seats[
                            index
                        ].availability = true;
                    }
                }


                await flight.save();
            }


            booking.status =
                'CANCELLED';


            if (
                booking.payment_status ===
                'PAID'
            ) {

                booking.payment_status =
                    'REFUNDED';

            }


            await booking.save();


            await Payment.updateMany(

                {
                    booking:
                        booking._id
                },

                {
                    $set: {
                        payment_status:
                            'REFUNDED'
                    }
                }
            );


            res.json({

                success: true,

                message:
                    'Booking cancelled successfully'
            });

        } catch (err) {

            console.error(
                'CANCEL BOOKING ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);


/* =========================================================
   BOOKING DETAILS
========================================================= */

function formatDateTime(value) {

    if (!value)
        return null;

    return String(value)
        .slice(0, 16);
}


router.get(
    '/booking-details/:booking_id',
    requireAuth,
    async (req, res) => {

        const {
            booking_id
        } = req.params;

        try {

            if (
                !mongoose.isValidObjectId(
                    booking_id
                )
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Booking not found'
                });
            }


            const booking =
                await Booking.findById(
                    booking_id
                ).lean();


            if (!booking) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Booking not found'
                });
            }


            if (
                String(booking.user) !==
                String(req.session.userId)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        'Not authorized'
                });
            }


            const [
                flight,
                payment
            ] = await Promise.all([

                Flight.findById(
                    booking.flight
                ).lean(),

                Payment.findOne({
                    booking:
                        booking._id
                })
                    .sort({
                        createdAt: -1
                    })
                    .lean()
            ]);


            if (!flight) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Flight not found'
                });
            }


            let passengers = [];


            /*
             * New multi-passenger booking.
             */
            if (
                Array.isArray(
                    booking.passengers
                ) &&
                booking.passengers.length
            ) {

                passengers =
                    booking.passengers.map(
                        passenger => {

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
                                            passenger.seat_id
                                        )
                                );


                            return {

                                NAME:
                                    passenger.name,

                                AGE:
                                    passenger.age,

                                GENDER:
                                    passenger.gender,

                                PASSPORT_NUMBER:
                                    passenger.passport_number,

                                SEAT_NUMBER:
                                    passenger.seat_number ||
                                    (
                                        seat &&
                                        seat.seat_number
                                    ),

                                CLASS:
                                    booking.cabin_class ||
                                    (
                                        seat &&
                                        seat.class
                                    ),

                                PRICE:
                                    seat
                                        ? Number(
                                            seat.price
                                        )
                                        : 0,

                                MEAL_PREFERENCE:
                                    passenger.meal_preference ||
                                    'None',

                                WHEELCHAIR_REQUIRED:
                                    passenger.wheelchair_required ||
                                    'NO',

                                SPECIAL_ASSISTANCE:
                                    passenger.special_assistance ||
                                    'None',

                                INFANT_BASSINET_REQUIRED:
                                    passenger.infant_bassinet_required ||
                                    'NO'
                            };
                        }
                    );

            } else {

                /*
                 * Legacy booking.
                 */
                const passenger =
                    booking.passenger
                        ? await Passenger.findById(
                            booking.passenger
                        ).lean()
                        : null;


                const seat =
                    (
                        flight.seats ||
                        []
                    ).find(
                        s =>
                            String(s._id) ===
                            String(
                                booking.seat_id
                            )
                    );


                if (passenger) {

                    passengers = [
                        {

                            NAME:
                                passenger.name,

                            AGE:
                                passenger.age,

                            GENDER:
                                passenger.gender,

                            PASSPORT_NUMBER:
                                passenger.passport_number,

                            SEAT_NUMBER:
                                booking.seat_number ||
                                (
                                    seat &&
                                    seat.seat_number
                                ),

                            CLASS:
                                booking.cabin_class ||
                                (
                                    seat &&
                                    seat.class
                                ),

                            PRICE:
                                seat
                                    ? Number(
                                        seat.price
                                    )
                                    : 0,

                            MEAL_PREFERENCE:
                                booking.meal_preference ||
                                'None',

                            WHEELCHAIR_REQUIRED:
                                booking.wheelchair_required ||
                                'NO',

                            SPECIAL_ASSISTANCE:
                                booking.special_assistance ||
                                'None',

                            INFANT_BASSINET_REQUIRED:
                                booking.infant_bassinet_required ||
                                'NO'
                        }
                    ];
                }
            }


            const amount =
                passengers.reduce(
                    (sum, passenger) =>
                        sum +
                        Number(
                            passenger.PRICE || 0
                        ),
                    0
                );


            res.json({

                success: true,

                data: {

                    BOOKING_ID:
                        booking._id.toString(),

                    STATUS_:
                        booking.status,

                    PAYMENT_STATUS:
                        payment
                            ? payment.payment_status
                            : (
                                booking.payment_status ||
                                'PENDING'
                            ),

                    BOOKING_DATE:
                        booking.booking_date,

                    FLIGHT_NUMBER:
                        flight.flight_number,

                    AIRLINE_NAME:
                        flight.airline_name,

                    ORIGIN:
                        flight.origin,

                    DESTINATION:
                        flight.destination,

                    DEP_TEXT:
                        formatDateTime(
                            flight.departure_time
                        ),

                    ARR_TEXT:
                        formatDateTime(
                            flight.arrival_time
                        ),

                    PASSENGER_COUNT:
                        passengers.length,

                    PASSENGERS:
                        passengers,

                    AMOUNT:
                        payment
                            ? Number(
                                payment.amount
                            )
                            : amount,

                    PAYMENT_METHOD:
                        payment
                            ? payment.payment_method
                            : null
                }
            });

        } catch (err) {

            console.error(
                'BOOKING DETAILS ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);


/* =========================================================
   MY BOOKINGS
========================================================= */

router.get(
    '/my-bookings',
    requireAuth,
    async (req, res) => {

        try {

            const bookings =
                await Booking.find({
                    user:
                        req.session.userId
                })
                    .sort({
                        createdAt: -1
                    })
                    .lean();


            const result = [];


            for (
                const booking
                of bookings
            ) {

                const [
                    flight,
                    payment
                ] = await Promise.all([

                    Flight.findById(
                        booking.flight
                    ).lean(),

                    Payment.findOne({
                        booking:
                            booking._id
                    })
                        .sort({
                            createdAt: -1
                        })
                        .lean()
                ]);


                if (!flight)
                    continue;


                let passengers = [];


                if (
                    Array.isArray(
                        booking.passengers
                    ) &&
                    booking.passengers.length
                ) {

                    passengers =
                        booking.passengers;

                } else {

                    const passenger =
                        booking.passenger
                            ? await Passenger.findById(
                                booking.passenger
                            ).lean()
                            : null;


                    if (passenger) {

                        passengers = [
                            {

                                name:
                                    passenger.name,

                                age:
                                    passenger.age,

                                gender:
                                    passenger.gender,

                                passport_number:
                                    passenger.passport_number,

                                seat_id:
                                    booking.seat_id,

                                seat_number:
                                    booking.seat_number,

                                meal_preference:
                                    booking.meal_preference,

                                wheelchair_required:
                                    booking.wheelchair_required,

                                special_assistance:
                                    booking.special_assistance,

                                infant_bassinet_required:
                                    booking.infant_bassinet_required
                            }
                        ];
                    }
                }


                let amount = 0;


                passengers.forEach(
                    passenger => {

                        const seat =
                            flight.seats.find(
                                s =>
                                    String(
                                        s._id
                                    ) ===
                                    String(
                                        passenger.seat_id
                                    )
                            );

                        if (seat) {

                            amount +=
                                Number(
                                    seat.price
                                );
                        }
                    }
                );


                const paymentStatus =
                    payment
                        ? payment.payment_status
                        : (
                            booking.payment_status ||
                            'PENDING'
                        );


                result.push({

                    BOOKING_ID:
                        booking._id.toString(),

                    STATUS_:
                        booking.status,

                    PAYMENT_STATUS:
                        paymentStatus,

                    AIRLINE_NAME:
                        flight.airline_name,

                    FLIGHT_NUMBER:
                        flight.flight_number,

                    ORIGIN:
                        flight.origin,

                    DESTINATION:
                        flight.destination,

                    DEP_TEXT:
                        formatDateTime(
                            flight.departure_time
                        ),

                    ARR_TEXT:
                        formatDateTime(
                            flight.arrival_time
                        ),

                    PASSENGER_COUNT:
                        passengers.length,

                    PASSENGER_NAMES:
                        passengers
                            .map(
                                p => p.name
                            )
                            .join(', '),

                    SEATS:
                        passengers
                            .map(
                                p =>
                                    p.seat_number
                            )
                            .join(', '),

                    CLASS:
                        booking.cabin_class ||
                        'Economy',

                    AMOUNT:
                        payment
                            ? Number(
                                payment.amount
                            )
                            : amount,

                    BOOKING_DATE:
                        booking.booking_date
                });
            }


            res.json({

                success: true,

                bookings:
                    result
            });

        } catch (err) {

            console.error(
                'MY BOOKINGS ERROR:',
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);


module.exports = router;