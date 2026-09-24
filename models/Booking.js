const mongoose = require('mongoose');

const passengerBookingSchema = new mongoose.Schema(
    {
        passenger_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Passenger',
            default: null
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        age: {
            type: Number,
            required: true,
            min: 1,
            max: 120
        },

        gender: {
            type: String,
            required: true
        },

        passport_number: {
            type: String,
            required: true,
            trim: true
        },

        seat_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        seat_number: {
            type: String,
            required: true
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
        }
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

    /*
     * New multi-passenger structure.
     */
    passengers: {
        type: [passengerBookingSchema],
        default: []
    },

    /*
     * Legacy fields kept so older bookings in MongoDB
     * continue to work.
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
        default: 'Economy'
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

    /*
     * PENDING until payment is completed.
     */
    payment_status: {
        type: String,
        enum: ['PENDING', 'PAID', 'REFUNDED'],
        default: 'PENDING'
    },

    booking_date: {
        type: String,
        default: () =>
            new Date().toISOString().split('T')[0]
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

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model(
    'Booking',
    bookingSchema
);