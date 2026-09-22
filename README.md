# NAVIERO — Flight Ticket Management System (DBMS Project)

## Project Overview

NAVIERO is a flight booking platform that pulls **real-time live flight data** — actual departures, arrivals, statuses, and aircraft info — instead of static dummy listings. Users can search live flights, pick a cabin class and seat, and complete a booking with payment, all backed by a MongoDB database.

## Tech stack

Backend
* Node.js — Runtime environment
* Express.js — Web framework for building APIs

Database
* MongoDB — Document database (set `MONGODB_URI` in `.env`)
* Mongoose — MongoDB object modelling

## Collections (Mongoose models in `models/`)

1. Flight
2. Seat
3. Passenger
4. Booking (includes the booking–passenger details)
5. Payment
6. Counter (sequential numeric IDs)

## Features
- Sign up / login
- Live flight search by origin and destination
- Domestic flights skip the First Class option
- Cabin class and seat selection
- Passenger details with meal, wheelchair, and medical preferences
- Payment with a printable e-ticket receipt
- Flight booking and cancellation
- Seat availability tracking
- Payment and refund management

## Files

* `schema.sql`, `sample_data.sql`, `queries.sql` – legacy MySQL files, kept only as reference for the old data

## Author
Erine Anna Binu