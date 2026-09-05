const express = require('express');
const router = express.Router();

const airports = ['DEL', 'BOM', 'BLR', 'MAA', 'CCU', 'HYD', 'COK', 'DXB', 'LHR', 'JFK', 'SIN', 'DOH'];

router.get('/live-flights', async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    const apiKey = process.env.RAPIDAPI_KEY;

    const results = await Promise.all(
      airports.map(code =>
        fetch(`https://aerodatabox.p.rapidapi.com/flights/airports/iata/${code}/${today}T06:00/${today}T18:00?withLeg=true&direction=Departure&withCancelled=false`, {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
          }
        }).then(r => r.json()).then(d => ({ airport: code, departures: d.departures || [] })).catch(() => ({ airport: code, departures: [] }))
      )
    );

    res.json({ success: true, flights: results });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;