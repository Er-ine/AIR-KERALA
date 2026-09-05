--------------------------------------------------
-- TRAVEL AGENTS
--------------------------------------------------

INSERT INTO TRAVEL_AGENT VALUES
(1,'Sky Travels','sky@gmail.com',9876543210),
(2,'Global Tours','global@gmail.com',9876543211),
(3,'FlyEasy','flyeasy@gmail.com',9876543212);


--------------------------------------------------
-- PASSENGERS
--------------------------------------------------

INSERT INTO PASSENGER VALUES
(101,'Anita Joseph',65,'FEMALE','P456123'),
(102,'Rahul Sharma',32,'MALE','P876123'),
(103,'Thomas Mathew',70,'MALE','P762341'),
(104,'Priya Nair',28,'FEMALE','P998321'),
(105,'Arjun Menon',40,'MALE','P123456'),
(106,'Mary Thomas',62,'FEMALE','P321654'),
(107,'David George',45,'MALE','P987123'),
(108,'Sneha Pillai',35,'FEMALE','P654987');


--------------------------------------------------
-- FLIGHTS
--------------------------------------------------

INSERT INTO FLIGHT VALUES
(201,'Air India','Delhi','Dubai','2026-04-10 08:00:00','2026-04-10 12:30:00'),
(202,'Emirates','Mumbai','London','2026-04-11 10:00:00','2026-04-11 18:00:00'),
(203,'Qatar Airways','Kochi','Doha','2026-04-12 09:00:00','2026-04-12 11:30:00'),
(204,'IndiGo','Bangalore','Singapore','2026-04-13 06:00:00','2026-04-13 12:00:00');


--------------------------------------------------
-- SEATS
--------------------------------------------------

INSERT INTO SEAT VALUES
(1,201,'1A','BUSINESS',1,15000),
(2,201,'1B','BUSINESS',1,15000),
(3,201,'2A','ECONOMY',1,5000),
(4,201,'2B','ECONOMY',1,5000),

(5,202,'1A','BUSINESS',1,20000),
(6,202,'1B','BUSINESS',1,20000),
(7,202,'2A','ECONOMY',1,7000),

(8,203,'1A','BUSINESS',1,18000),
(9,203,'2A','ECONOMY',1,6000),

(10,204,'1A','BUSINESS',1,22000),
(11,204,'2A','ECONOMY',1,8000);


--------------------------------------------------
-- BOOKINGS
--------------------------------------------------

INSERT INTO BOOKINGS VALUES
(301,1,201,'2026-04-01','CONFIRMED'),
(302,2,202,'2026-04-02','CONFIRMED'),
(303,1,203,'2026-04-03','CANCELLED'),
(304,3,204,'2026-04-04','CONFIRMED');


--------------------------------------------------
-- BOOKING PASSENGERS
--------------------------------------------------

INSERT INTO Booking_Passenger VALUES
(301,101,1,'VEG','YES','ELDER SUPPORT','NO'),
(301,102,2,'NON-VEG','NO',NULL,'NO'),

(302,103,5,'HINDU NON-VEG','NO','MEDICAL SUPPORT','NO'),

(303,104,8,'VEG','NO',NULL,'NO'),

(304,105,10,'NON-VEG','NO',NULL,'NO'),
(304,106,11,'VEG','YES','ELDER SUPPORT','NO'),

(304,107,3,'HINDU NON-VEG','NO',NULL,'NO'),
(304,108,4,'VEG','NO',NULL,'NO');


--------------------------------------------------
-- PAYMENTS
--------------------------------------------------

INSERT INTO PAYMENT VALUES
(401,301,20000,'CARD','2026-04-01','PAID'),
(402,302,20000,'UPI','2026-04-02','PAID'),
(403,303,18000,'CARD','2026-04-03','REFUNDED'),
(404,304,22000,'NET BANKING','2026-04-04','PAID');