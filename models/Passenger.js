const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema(
  {
    // New passenger fields
    first_name: {
      type: String,
      required: true,
      trim: true
    },

    surname: {
      type: String,
      required: true,
      trim: true
    },

    date_of_birth: {
      type: String,
      required: true
    },

    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female', 'Other']
    },

    passport_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    // Passenger-specific preferences
    meal_preference: {
      type: String,
      default: 'None'
    },

    special_assistance: {
      type: String,
      default: 'None'
    },

    wheelchair_required: {
      type: Boolean,
      default: false
    },

    infant_bassinet_required: {
      type: Boolean,
      default: false
    },

    // Legacy fields - kept so older bookings don't break
    name: {
      type: String,
      default: ''
    },

    age: {
      type: Number,
      default: null
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

module.exports = mongoose.model('Passenger', passengerSchema);