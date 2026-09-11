const express = require('express');
const router = express.Router();

/*
 * Indian airports we currently want to monitor.
 */
const airports = [
    'COK', // Kochi
    'TRV', // Thiruvananthapuram
    'CCJ', // Kozhikode
    'CNN', // Kannur
    'BLR', // Bengaluru
    'MAA', // Chennai
    'HYD', // Hyderabad
    'BOM', // Mumbai
    'DEL', // Delhi
    'CCU', // Kolkata
    'PNQ', // Pune
    'GOI', // Goa
    'AMD', // Ahmedabad
    'JAI', // Jaipur
    'LKO', // Lucknow
    'IXC', // Chandigarh
    'BBI', // Bhubaneswar
    'PAT', // Patna
    'GAU', // Guwahati
    'IXE'  // Mangaluru
];

const AERODATABOX_HOST =
    'aerodatabox.p.rapidapi.com';

const REQUEST_TIMEOUT_MS = 10000;

/*
 * Get today's date in India.
 */
function getIndiaDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

/*
 * Fetch one airport with a hard timeout.
 */
async function fetchAirportDepartures(code, date, apiKey) {

    const url =
        `https://${AERODATABOX_HOST}/flights/airports/iata/${code}/` +
        `${date}T00:00/${date}T23:59` +
        `?withLeg=true&direction=Departure&withCancelled=false`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {

        const response = await fetch(url, {
            method: 'GET',

            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': AERODATABOX_HOST
            },

            signal: controller.signal
        });

        if (!response.ok) {

            const body = await response.text().catch(() => '');

            console.error(
                `AeroDataBox ${code}: HTTP ${response.status}`,
                body
            );

            return {
                airport: code,
                departures: [],
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();

        let departures = Array.isArray(data.departures)
            ? data.departures
            : [];

        /*
         * Keep only domestic Indian destinations.
         */
        departures = departures.filter(flight => {

            const arrivalAirport =
                flight?.arrival?.airport;

            if (!arrivalAirport) {
                return false;
            }

            /*
             * Best case: AeroDataBox provides countryCode.
             */
            if (arrivalAirport.countryCode) {

                return (
                    arrivalAirport.countryCode
                        .toUpperCase() === 'IN'
                );
            }

            /*
             * Fallback to our known Indian airport list.
             */
            const destinationCode =
                String(
                    arrivalAirport.iata || ''
                ).toUpperCase();

            return airports.includes(destinationCode);
        });

        return {
            airport: code,
            departures,
            error: null
        };

    } catch (error) {

        if (error.name === 'AbortError') {

            console.error(
                `AeroDataBox ${code}: request timed out`
            );

            return {
                airport: code,
                departures: [],
                error: 'TIMEOUT'
            };
        }

        console.error(
            `AeroDataBox ${code}:`,
            error.message
        );

        return {
            airport: code,
            departures: [],
            error: error.message
        };

    } finally {

        clearTimeout(timeout);
    }
}

/*
 * Remove duplicate flights.
 */
function deduplicateFlights(results) {

    const map = new Map();

    for (const airportResult of results) {

        for (const flight of airportResult.departures) {

            /*
             * Prefer a real flight identifier.
             * Fall back to a combination of fields.
             */
            const key =
                flight?.number ||
                [
                    flight?.airline?.iata,
                    flight?.number,
                    flight?.departure?.airport?.iata,
                    flight?.arrival?.airport?.iata,
                    flight?.departure?.scheduledTime?.local
                ].join('|');

            if (!map.has(key)) {
                map.set(key, flight);
            }
        }
    }

    return Array.from(map.values());
}


router.get('/live-flights', async (req, res) => {

    const startedAt = Date.now();

    try {

        const apiKey =
            process.env.RAPIDAPI_KEY;

        if (!apiKey) {

            return res.status(500).json({
                success: false,
                message:
                    'RAPIDAPI_KEY is not configured.'
            });
        }

        /*
         * Allow an explicit date, otherwise use
         * today's date in India.
         */
        const date =
            req.query.date || getIndiaDate();

        /*
         * Basic date validation.
         */
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid date. Use YYYY-MM-DD.'
            });
        }

        console.log(
            `Fetching domestic flights for ${date}`
        );

        /*
         * IMPORTANT:
         *
         * This is ONE batch.
         *
         * There is NO retry loop.
         * There is NO recursive search.
         *
         * Once these requests finish, we return.
         */
        const results = await Promise.all(
            airports.map(code =>
                fetchAirportDepartures(
                    code,
                    date,
                    apiKey
                )
            )
        );

        const flights =
            deduplicateFlights(results);

        const successfulAirports =
            results.filter(
                result => !result.error
            ).length;

        const failedAirports =
            results.filter(
                result => result.error
            ).length;

        return res.json({

            success: true,

            domesticOnly: true,

            date,

            generatedAt:
                new Date().toISOString(),

            processingTimeMs:
                Date.now() - startedAt,

            airportsRequested:
                airports.length,

            airportsSuccessful:
                successfulAirports,

            airportsFailed:
                failedAirports,

            flightCount:
                flights.length,

            flights,

            airportResults:
                results
        });

    } catch (error) {

        console.error(
            'LIVE FLIGHTS ERROR:',
            error
        );

        return res.status(500).json({

            success: false,

            message:
                'Unable to retrieve live flight data.',

            error:
                error.message
        });
    }
});


module.exports = router;
