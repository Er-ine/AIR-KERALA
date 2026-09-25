const mongoose = require('mongoose');


const passengerBookingSchema =
    new mongoose.Schema({

        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Passenger',
            required: true
        },

        seat_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        seat_number: {
            type: String,
            required: true
        },

        cabin_class: {
            type: String,
            required: true
        }

    }, {
        _id: false
    });


const bookingSchema =
    new mongoose.Schema({

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        agent_id: {
            type: Number,
            default: 1
        },

        flight: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Flight',
            required: true
        },


        passengers: {
            type: [passengerBookingSchema],
            default: []
        },


        /*
         * Legacy fields
         * kept for compatibility.
         */

        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Passenger',
            default: null
        },

        seat_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        seat_number: {
            type: String,
            default: null
        },

        cabin_class: {
            type: String,
            default: null
        },


        meal_preference: {
            type: String,
            default: 'None'
        },

        wheelchair_required: {
            type: String,
            default: 'NO'
        },

        special_assistance: {
            type: String,
            default: 'None'
        },

        infant_bassinet_required: {
            type: String,
            default: 'NO'
        },


        booking_date: {
            type: String,
            default: () =>
                new Date()
                    .toISOString()
                    .split('T')[0]
        },


        status: {
            type: String,

            enum: [
                'CONFIRMED',
                'CANCELLED',
                'CHECKED_IN'
            ],

            default: 'CONFIRMED'
        },


        payment_status: {
            type: String,

            enum: [
                'PENDING',
                'PAID',
                'REFUNDED'
            ],

            default: 'PENDING'
        },


        createdAt: {
            type: Date,
            default: Date.now
        }

    });


module.exports =
    mongoose.model(
        'Booking',
        bookingSchema
    );