const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: String,
      default: "",
    },

    nationality: {
      type: String,
      default: "",
    },

    passportNumber: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    mealPreference: {
      type: String,
      default: "",
    },

    wheelchair: {
      type: Boolean,
      default: false,
    },

    medicalPreference: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const flightSegmentSchema = new mongoose.Schema(
  {
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
    },
    flightNumber: {
      type: String,
      default: "",
    },
    airlineName: {
      type: String,
      default: "Air Kerala",
    },
    origin: {
      type: String,
      default: "",
    },
    originCode: {
      type: String,
      default: "",
    },
    destination: {
      type: String,
      default: "",
    },
    destinationCode: {
      type: String,
      default: "",
    },
    departureDate: {
      type: String,
      default: "",
    },
    departureTime: {
      type: String,
      default: "",
    },
    arrivalDate: {
      type: String,
      default: "",
    },
    arrivalTime: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    ticketNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    ticketStatus: {
      type: String,
      enum: [
        "NOT_ISSUED",
        "ISSUED",
        "CANCELLED",
      ],
      default: "NOT_ISSUED",
    },

    issuedAt: {
      type: Date,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: false,
    },

    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: false,
    },

    tripType: {
      type: String,
      enum: ["ONE_WAY", "ROUND_TRIP", "MULTI_CITY"],
      default: "ONE_WAY",
    },

    flights: {
      type: [flightSegmentSchema],
      default: [],
    },

    flightNumber: {
      type: String,
      default: "",
    },

    origin: {
      type: String,
      default: "",
    },

    originCode: {
      type: String,
      default: "",
    },

    destination: {
      type: String,
      default: "",
    },

    destinationCode: {
      type: String,
      default: "",
    },

    departureDate: {
      type: String,
      default: "",
    },

    departureTime: {
      type: String,
      default: "",
    },

    arrivalDate: {
      type: String,
      default: "",
    },

    arrivalTime: {
      type: String,
      default: "",
    },

    cabinClass: {
      type: String,
      default: "Economy",
    },

    seatNumber: {
      type: String,
      default: "",
    },

    passenger: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Passenger",
      required: false,
    },

    passengers: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    booking_date: {
      type: String,
      default: "",
    },

    baseFare: {
      type: Number,
      default: 0,
    },

    taxes: {
      type: Number,
      default: 0,
    },

    fees: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
      ],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      default: "",
    },

    transactionReference: {
      type: String,
      default: "",
    },

    baggageAllowance: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
      ],
      default: "PENDING",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);