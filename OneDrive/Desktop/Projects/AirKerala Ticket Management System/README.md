# NAVIERO — Flight Ticket Management System (DBMS Project)

## Project Overview

NAVIERO is a flight booking platform that pulls **real-time live flight data** — actual departures, arrivals, statuses, and aircraft info — instead of static dummy listings. Users can search live flights, pick a cabin class and seat, and complete a booking with payment, all backed by a MySQL database.

## Tech stack

Backend
* Node.js — Runtime environment
* Express.js — Web framework for building APIs

Database
* MySQL — Relational database
* mysql2 — Node.js MySQL driver

## Database Tables

1. Travel_Agent
2. Passenger
3. Flight
4. Seat
5. Bookings
6. Booking_Passenger
7. Payment

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

* `schema.sql` – Database table creation
* `sample_data.sql` – Sample records
* `queries.sql` – Important SQL queries

## Author
Aleena Benny

Erine Anna Binu

Gayathry S

Parvathy KK
