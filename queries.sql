--------------------------------------------------
-- 1. Display all travel agents
--------------------------------------------------
SELECT * FROM TRAVEL_AGENT;

--------------------------------------------------
-- 2. Display all passengers
--------------------------------------------------
SELECT * FROM PASSENGER;

--------------------------------------------------
-- 3. Display all flights
--------------------------------------------------
SELECT * FROM FLIGHT;

--------------------------------------------------
-- 4. Display all seats
--------------------------------------------------
SELECT * FROM SEAT;

--------------------------------------------------
-- 5. Show only international flights
--------------------------------------------------
SELECT * FROM FLIGHT
WHERE DESTINATION NOT IN ('Delhi','Mumbai','Chennai','Bangalore','Hyderabad');

--------------------------------------------------
-- 6. Show available seats
--------------------------------------------------
SELECT * FROM SEAT
WHERE AVAILABILITY = 1;

--------------------------------------------------
-- 7. Show booked seats
--------------------------------------------------
SELECT * FROM SEAT
WHERE AVAILABILITY = 0;

--------------------------------------------------
-- 8. Show passengers older than 30
--------------------------------------------------
SELECT * FROM PASSENGER
WHERE AGE > 30;

--------------------------------------------------
-- 9. Show confirmed bookings
--------------------------------------------------
SELECT * FROM BOOKINGS
WHERE STATUS_ = 'CONFIRMED';

--------------------------------------------------
-- 10. Show cancelled bookings
--------------------------------------------------
SELECT * FROM BOOKINGS
WHERE STATUS_ = 'CANCELLED';

--------------------------------------------------
-- 11. Display flights sorted by departure time
--------------------------------------------------
SELECT * FROM FLIGHT
ORDER BY DEPARTURE_TIME;

--------------------------------------------------
-- 12. Display passengers sorted by age
--------------------------------------------------
SELECT * FROM PASSENGER
ORDER BY AGE DESC;

--------------------------------------------------
-- 13. Count total passengers
--------------------------------------------------
SELECT COUNT(*) AS TOTAL_PASSENGERS
FROM PASSENGER;

--------------------------------------------------
-- 14. Count total flights
--------------------------------------------------
SELECT COUNT(*) AS TOTAL_FLIGHTS
FROM FLIGHT;

--------------------------------------------------
-- 15. Average passenger age
--------------------------------------------------
SELECT AVG(AGE) AS AVERAGE_AGE
FROM PASSENGER;

--------------------------------------------------
-- 16. Maximum seat price
--------------------------------------------------
SELECT MAX(PRICE) AS HIGHEST_PRICE
FROM SEAT;

--------------------------------------------------
-- 17. Minimum seat price
--------------------------------------------------
SELECT MIN(PRICE) AS LOWEST_PRICE
FROM SEAT;

--------------------------------------------------
-- 18. Total payment amount received
--------------------------------------------------
SELECT SUM(AMOUNT) AS TOTAL_REVENUE
FROM PAYMENT;

--------------------------------------------------
-- 19. Show passengers with their bookings (JOIN)
--------------------------------------------------
SELECT P.NAME, B.BOOKING_ID
FROM PASSENGER P
JOIN Booking_Passenger BP
ON P.PASSENGER_ID = BP.PASSENGER_ID
JOIN BOOKINGS B
ON BP.BOOKING_ID = B.BOOKING_ID;

--------------------------------------------------
-- 20. Show booking details with flight info
--------------------------------------------------
SELECT B.BOOKING_ID, F.AIRLINE_NAME, F.ORIGIN, F.DESTINATION
FROM BOOKINGS B
JOIN FLIGHT F
ON B.FLIGHT_ID = F.FLIGHT_ID;

--------------------------------------------------
-- 21. Show passenger seat allocation
--------------------------------------------------
SELECT P.NAME, S.SEAT_NUMBER, S.CLASS
FROM PASSENGER P
JOIN Booking_Passenger BP
ON P.PASSENGER_ID = BP.PASSENGER_ID
JOIN SEAT S
ON BP.SEAT_ID = S.SEAT_ID;

--------------------------------------------------
-- 22. Show meal preference of passengers
--------------------------------------------------
SELECT P.NAME, BP.MEAL_PREFERENCE
FROM PASSENGER P
JOIN Booking_Passenger BP
ON P.PASSENGER_ID = BP.PASSENGER_ID;

--------------------------------------------------
-- 23. Show passengers requiring wheelchair
--------------------------------------------------
SELECT P.NAME
FROM PASSENGER P
JOIN Booking_Passenger BP
ON P.PASSENGER_ID = BP.PASSENGER_ID
WHERE BP.WHEELCHAIR_REQUIRED = 'YES';

--------------------------------------------------
-- 24. Show booking payment details
--------------------------------------------------
SELECT B.BOOKING_ID, P.AMOUNT, P.PAYMENT_STATUS
FROM BOOKINGS B
JOIN PAYMENT P
ON B.BOOKING_ID = P.BOOKING_ID;

--------------------------------------------------
-- 25. Count passengers per flight
--------------------------------------------------
SELECT F.FLIGHT_ID, COUNT(BP.PASSENGER_ID) AS TOTAL_PASSENGERS
FROM FLIGHT F
JOIN BOOKINGS B
ON F.FLIGHT_ID = B.FLIGHT_ID
JOIN Booking_Passenger BP
ON B.BOOKING_ID = BP.BOOKING_ID
GROUP BY F.FLIGHT_ID;

--------------------------------------------------
-- 26. Show flights having more than 5 passengers
--------------------------------------------------
SELECT F.FLIGHT_ID, COUNT(BP.PASSENGER_ID) AS PASSENGERS
FROM FLIGHT F
JOIN BOOKINGS B ON F.FLIGHT_ID = B.FLIGHT_ID
JOIN Booking_Passenger BP ON B.BOOKING_ID = BP.BOOKING_ID
GROUP BY F.FLIGHT_ID
HAVING COUNT(BP.PASSENGER_ID) > 5;

--------------------------------------------------
-- 27. Update booking status to cancelled
--------------------------------------------------
UPDATE BOOKINGS
SET STATUS_ = 'CANCELLED'
WHERE BOOKING_ID = 3;

--------------------------------------------------
-- 28. Process refund for cancelled bookings
--------------------------------------------------
UPDATE PAYMENT
SET PAYMENT_STATUS = 'REFUNDED'
WHERE BOOKING_ID IN
(SELECT BOOKING_ID FROM BOOKINGS WHERE STATUS_='CANCELLED');

--------------------------------------------------
-- 29. Delete passenger record
--------------------------------------------------
DELETE FROM PASSENGER
WHERE PASSENGER_ID = 15;

--------------------------------------------------
-- 30. Show flights with their available seats
--------------------------------------------------
SELECT F.FLIGHT_ID, F.AIRLINE_NAME, COUNT(S.SEAT_ID) AS AVAILABLE_SEATS
FROM FLIGHT F
JOIN SEAT S ON F.FLIGHT_ID = S.FLIGHT_ID
WHERE S.AVAILABILITY = 1
GROUP BY F.FLIGHT_ID, F.AIRLINE_NAME;