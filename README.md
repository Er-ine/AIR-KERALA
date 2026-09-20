# AIR KERALA — Flight Ticket Management System

## Project Overview

AIR KERALA is a flight booking platform that pulls **real-time live flight data** — actual departures, arrivals, statuses, and aircraft info — instead of static dummy listings. Users can search live flights, pick a cabin class and seat, and complete a booking with payment, backed by MongoDB.

## Tech stack

Backend:
* Node.js — Runtime environment
* Express.js — Web framework for building APIs

Database:
* MongoDB — Document database
* Mongoose — MongoDB object modeling for Node.js

## MongoDB Models

1. User
2. Passenger
3. Flight (with embedded seats)
4. Booking
5. Payment

## Features
- Live flight search by origin and destination
- Domestic flights skip the First Class option
- Cabin class and seat selection
- Passenger details with meal, wheelchair, and medical preferences
- Payment with printable e-ticket receipt
- Flight booking and cancellation
- Seat availability tracking
- Payment and refund management
