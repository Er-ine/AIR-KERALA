const express = require("express");
const router = express.Router();

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

function generateTransactionReference() {
  return (
    "AKTX" +
    Date.now().toString() +
    Math.floor(1000 + Math.random() * 9000)
  );
}

function generateTicketNumber() {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `AK-${timestamp}-${random}`;
}

function generateBookingReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "AK";

  for (let i = 0; i < 6; i++) {
    reference += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return reference;
}

async function createUniqueBookingReference() {
  let reference;
  let exists = true;

  while (exists) {
    reference = generateBookingReference();

    exists = await Booking.exists({
      bookingReference: reference,
    });
  }

  return reference;
}

async function createUniqueTicketNumber() {
  let ticketNumber;
  let exists = true;

  while (exists) {
    ticketNumber = generateTicketNumber();

    exists = await Booking.exists({
      ticketNumber,
    });
  }

  return ticketNumber;
}

/*
|--------------------------------------------------------------------------
| PAYMENT SUCCESS
|--------------------------------------------------------------------------
*/

router.post("/success", async (req, res) => {
  try {
    const {
      bookingId,
      booking_id,
      paymentMethod = "CARD",
      payment_method,
      transactionReference,
    } = req.body;

    const targetBookingId = bookingId || booking_id;

    if (!targetBookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    const booking = await Booking.findById(targetBookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    /*
     * Prevent accidentally issuing another ticket
     * when the success endpoint is called twice.
     */
    if (
      booking.status === "CONFIRMED" &&
      booking.ticketStatus === "ISSUED" &&
      booking.ticketNumber
    ) {
      return res.json({
        success: true,
        message: "Booking is already confirmed.",
        booking,
        ticket: {
          bookingReference: booking.bookingReference,
          ticketNumber: booking.ticketNumber,
        },
      });
    }

    const finalTransactionReference =
      transactionReference || generateTransactionReference();

    const selectedMethod = paymentMethod || payment_method || "CARD";

    /*
     * Generate PNR if the booking does not already have one.
     */
    if (!booking.bookingReference) {
      booking.bookingReference =
        await createUniqueBookingReference();
    }

    /*
     * Generate ticket number only after successful payment.
     */
    if (!booking.ticketNumber) {
      booking.ticketNumber =
        await createUniqueTicketNumber();
    }

    booking.paymentStatus = "PAID";
    booking.paymentMethod = selectedMethod;
    booking.transactionReference = finalTransactionReference;

    booking.status = "CONFIRMED";
    booking.ticketStatus = "ISSUED";
    booking.issuedAt = new Date();

    const payment = await Payment.create({
      booking: booking._id,
      amount: booking.totalAmount || 0,
      payment_method: selectedMethod,
      payment_status: "PAID",
      payment_date: new Date()
    });

    booking.paymentId = payment._id;

    await booking.save();

    return res.json({
      success: true,
      message: "Payment successful. Ticket issued.",
      amount: booking.totalAmount,
      booking,
      ticket: {
        bookingReference: booking.bookingReference,
        ticketNumber: booking.ticketNumber,
        status: "CONFIRMED",
        issuedAt: booking.issuedAt,
      },
    });
  } catch (error) {
    console.error("Payment success error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment could not be completed.",
      error: error.message,
    });
  }
});


/*
|--------------------------------------------------------------------------
| PAYMENT FAILURE
|--------------------------------------------------------------------------
*/

router.post("/failure", async (req, res) => {
  try {
    const {
      bookingId,
      booking_id,
      reason = "Payment failed",
    } = req.body;

    const targetBookingId = bookingId || booking_id;

    if (!targetBookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    const booking = await Booking.findById(targetBookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    booking.paymentStatus = "FAILED";

    if (booking.status !== "CANCELLED") {
      booking.status = "PENDING";
    }

    booking.ticketStatus = "NOT_ISSUED";

    await booking.save();

    return res.json({
      success: true,
      message: "Payment failure recorded.",
      booking,
    });
  } catch (error) {
    console.error("Payment failure error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not record payment failure.",
      error: error.message,
    });
  }
});


/*
|--------------------------------------------------------------------------
| GET PAYMENT / BOOKING DETAILS
|--------------------------------------------------------------------------
*/

router.get("/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("flight")
      .populate("flightId")
      .populate("passengers.passenger")
      .populate("passenger")
      .populate("paymentId")
      .populate("user")
      .populate("userId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Payment lookup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment details.",
      error: error.message,
    });
  }
});


module.exports = router;