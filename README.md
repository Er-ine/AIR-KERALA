# ✈️ Air Kerala — Ticket Management System

> **Affordable Air Travel, Redefined.**

Air Kerala Ticket Management System is a full-stack airline booking platform designed to provide a smooth and modern experience for searching flights, booking tickets, managing passenger information, processing payments, and viewing electronic tickets.

The project combines a responsive airline-style frontend with a Node.js/Express backend and MongoDB database to manage flight, passenger, booking, authentication, and payment data.

---

## 🌐 Overview

Air Kerala is designed as a digital airline platform where users can:

- Create and manage an account
- Search available flights
- View live flight information
- Select and book flights
- Enter passenger details
- Support multiple passengers within a booking
- Make and track payments
- View generated e-tickets
- Manage upcoming bookings
- View previous bookings
- Cancel eligible bookings
- Access booking and passenger information securely

The application follows a complete booking flow:

**Home → Flight Details → Passenger Details → Payment → E-Ticket → Manage Booking**

---

## ✨ Features

### 🔐 User Authentication

- User registration
- Secure login using server-side sessions
- Authentication state management
- Logout functionality
- Protected booking and account-related operations

### ✈️ Flight Management

- Flight search interface
- Live flight information
- Domestic flight support
- Departure and arrival information
- Flight timing and route information
- Seat availability management
- Cabin/class information

### 🎫 Ticket Booking

- Passenger information collection
- Multiple passengers in a single booking
- Seat selection
- Cabin class selection
- Meal preferences
- Special assistance requirements
- Wheelchair assistance options
- Infant-related assistance options
- Booking status tracking

### 💳 Payment Management

- Payment processing interface
- Payment status tracking
- Booking-payment association
- Payment information stored in MongoDB
- Payment summary linked to the corresponding booking

### 🎟️ E-Ticket

The system generates an airline-style electronic ticket containing:

- Air Kerala branding
- Passenger details
- Booking reference
- Ticket information
- Flight segments
- Departure and arrival information
- Seat information
- Cabin class
- Fare information
- Payment details
- QR code

### 📋 Manage My Booking

Users can access their bookings without repeatedly entering passenger information.

The management section supports:

- Upcoming bookings
- Previous bookings
- Booking status
- Booking details
- Cancellation of eligible bookings
- Check-in related functionality
- Payment completion for pending bookings

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive UI
- Fetch API

### Backend

- Node.js
- Express.js
- REST APIs
- Express Session
- CORS

### Database

- MongoDB
- Mongoose

### Development Tools

- Visual Studio Code
- npm
- Git
- GitHub

---

## 📁 Project Structure

```text
AirKerala-Ticket-Management-System/
│
├── Public/
│   ├── index.html
│   ├── flights.html
│   ├── booking.html
│   ├── payment.html
│   ├── ticket.html
│   ├── manage-booking.html
│   ├── site-common.css
│   ├── site-common.js
│   └── airkeralalogo.png
│
├── models/
│   ├── Booking.js
│   ├── Flight.js
│   ├── Passenger.js
│   ├── Payment.js
│   └── User.js
│
├── routes/
│   ├── auth.js
│   ├── booking.js
│   ├── flights.js
│   ├── liveflights.js
│   └── payment.js
│
├── db.js
├── server.js
├── package.json
├── package-lock.json
├── .env
└── README.md
