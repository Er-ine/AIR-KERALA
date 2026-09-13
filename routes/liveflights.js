const express = require('express');
const router = express.Router();

/*
 * Indian airports we know about — used for validating the 'from'
 * param and for the domestic-destination fallback filter.
 */
const airports = [
    'COK', 'TRV', 'CCJ', 'CNN', 'BLR', 'MAA', 'HYD', 'BOM', 'DEL',
    'CCU', 'PNQ', 'GOI', 'AMD', 'JAI', 'LKO', 'IXC', 'BBI', 'PAT',
    'GAU', 'IXE'
];

const AERODATABOX_HOST = 'aerodatabox.p.rapidapi.com';
const REQUEST_TIMEOUT_MS = 10000;
const REQUEST_SPACING_MS = 1100;
const RETRY_BACKOFF_MS = 2000;

// Your BASIC plan caps a single request window at 12 hours, so a full
// day has to be split into two half-day windows.
const HALF_DAY_WINDOWS = [
    { start: '00:00', end: '11:59' },
    { start: '12:00', end: '23:59' }
];

// Cache successful (or genuinely-empty) results for a few minutes so
// page reloads and repeat searches don't re-spend API quota.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getIndiaDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

/*
 * Fetch ONE half-day window for ONE airport.
 */
async function fetchAirportWindow(code, date, window, apiKey) {
    const url =
        `https://${AERODATABOX_HOST}/flights/airports/iata/${code}/` +
        `${date}T${window.start}/${date}T${window.end}` +
        `?withLeg=true&direction=Departure&withCancelled=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
            console.error(`AeroDataBox ${code} [${window.start}-${window.end}]: HTTP ${response.status}`, body);
            return { departures: [], error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        let departures = Array.isArray(data.departures) ? data.departures : [];

        departures = departures.filter(flight => {
            const arrivalAirport = flight?.arrival?.airport;
            if (!arrivalAirport) return false;

            if (arrivalAirport.countryCode) {
                return arrivalAirport.countryCode.toUpperCase() === 'IN';
            }

            const destinationCode = String(arrivalAirport.iata || '').toUpperCase();
            return airports.includes(destinationCode);
        });

        return { departures, error: null };

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`AeroDataBox ${code} [${window.start}-${window.end}]: request timed out`);
            return { departures: [], error: 'TIMEOUT' };
        }
        console.error(`AeroDataBox ${code} [${window.start}-${window.end}]:`, error.message);
        return { departures: [], error: error.message };

    } finally {
        clearTimeout(timeout);
    }
}

/*
 * Fetch a full day for ONE airport by combining two 12-hour windows.
 */
async function fetchAirportFullDay(code, date, apiKey) {
    const allDepartures = [];
    let lastError = null;

    for (const window of HALF_DAY_WINDOWS) {
        let result = await fetchAirportWindow(code, date, window, apiKey);

        if (result.error === 'HTTP 429' && !result.isMonthlyQuotaError) {
        await sleep(RETRY_BACKOFF_MS);
        result = await fetchAirportWindow(code, date, window, apiKey);
        }

        if (result.error) {
            lastError = result.error;
        } else {
            allDepartures.push(...result.departures);
        }

        await sleep(REQUEST_SPACING_MS);
    }

    // Only report an error if BOTH windows failed — a single half-day
    // failure still leaves us with real data from the other half.
    const bothFailed = allDepartures.length === 0 && lastError;

    return {
        airport: code,
        departures: allDepartures,
        error: bothFailed ? lastError : null
    };
}

function deduplicateFlights(results) {
    const map = new Map();
    for (const airportResult of results) {
        for (const flight of airportResult.departures) {
            const key =
                flight?.number ||
                [
                    flight?.airline?.iata,
                    flight?.number,
                    flight?.departure?.airport?.iata,
                    flight?.arrival?.airport?.iata,
                    flight?.departure?.scheduledTime?.local
                ].join('|');

            if (!map.has(key)) map.set(key, flight);
        }
    }
    return Array.from(map.values());
}

router.get('/live-flights', async (req, res) => {
    const startedAt = Date.now();

    try {
        const apiKey = process.env.RAPIDAPI_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'RAPIDAPI_KEY is not configured.' });
        }

        const date = req.query.date || getIndiaDate();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
        }

        // IMPORTANT: only query the airport the user actually searched
        // for, not all 20 every time. This is what was burning through
        // the monthly quota on every single page load.
        const from = String(req.query.from || '').toUpperCase();

        if (!from || !airports.includes(from)) {
            return res.status(400).json({
                success: false,
                message: 'A valid "from" airport code is required, e.g. ?from=TRV'
            });
        }

        const cacheKey = `${from}_${date}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return res.json({ ...cached.data, cached: true });
        }

        console.log(`Fetching domestic flights for ${from} on ${date}`);

        const result = await fetchAirportFullDay(from, date, apiKey);
        const flights = deduplicateFlights([result]);

        const responseBody = {
            success: true,
            domesticOnly: true,
            date,
            from,
            generatedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startedAt,
            airportError: result.error,
            flightCount: flights.length,
            flights
        };

        // Cache successful responses (including genuinely-empty ones)
        // so retries and reloads don't cost more quota.
        if (!result.error) {
            cache.set(cacheKey, { timestamp: Date.now(), data: responseBody });
        }

        return res.json(responseBody);

    } catch (error) {
        console.error('LIVE FLIGHTS ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve live flight data.',
            error: error.message
        });
    }
});

module.exports = router;