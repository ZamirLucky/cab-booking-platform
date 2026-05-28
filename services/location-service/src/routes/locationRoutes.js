// locationRoutes.js
// CRUD routes for favourite pickup locations plus a live weather lookup.
// All five routes are protected — requireAuth sets req.user before any handler runs.
// Weather data is fetched from WeatherAPI.com (forecast.json) and stored as JSONB.
'use strict';

const express    = require('express');
const crypto     = require('crypto');
const axios      = require('axios');
const pool       = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /locations — add a favourite pickup location
router.post('/locations', requireAuth, async (req, res, next) => {
  try {
    const { label, address, latitude, longitude } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: 'label is required' });
    }
    if (!address || !String(address).trim()) {
      return res.status(400).json({ error: 'address is required' });
    }

    const id = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO favourite_locations
         (id, user_id, label, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, label.trim(), address.trim(), latitude ?? null, longitude ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /locations — list all favourite locations for the logged-in user
router.get('/locations', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, label, address, latitude, longitude,
              weather_snapshot, created_at, updated_at
       FROM favourite_locations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /locations/:id — update label and/or address
router.patch('/locations/:id', requireAuth, async (req, res, next) => {
  try {
    const { id }    = req.params;
    const userId    = req.user.id;
    const { label, address } = req.body;

    if (!label && !address) {
      return res.status(400).json({ error: 'At least one of label or address is required' });
    }

    // Ownership check before update
    const existing = await pool.query(
      'SELECT id FROM favourite_locations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Build dynamic SET clause — only update provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (label)   { fields.push(`label = $${idx++}`);   values.push(label.trim()); }
    if (address) { fields.push(`address = $${idx++}`); values.push(address.trim()); }
    fields.push(`updated_at = NOW()`);

    values.push(id);
    values.push(userId);

    const result = await pool.query(
      `UPDATE favourite_locations
       SET ${fields.join(', ')}
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING *`,
      values
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /locations/:id — remove a favourite location
router.delete('/locations/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM favourite_locations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    return res.status(200).json({ message: 'Location deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /locations/:id/weather — fetch live weather and store JSONB snapshot
router.get('/locations/:id/weather', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Confirm location exists and belongs to this user
    const locResult = await pool.query(
      `SELECT id, label, address
       FROM favourite_locations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (locResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const location = locResult.rows[0];

    // 2. Validate env vars before calling external API
    const WEATHER_API_KEY      = process.env.WEATHER_API_KEY;
    const WEATHER_API_BASE_URL = process.env.WEATHER_API_BASE_URL;

    if (!WEATHER_API_KEY || !WEATHER_API_BASE_URL) {
      console.error('[locationRoutes] WEATHER_API_KEY or WEATHER_API_BASE_URL is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 3. Call WeatherAPI.com — forecast.json with q from saved address
    let weatherSnapshot;

    try {
      const weatherResponse = await axios.get(
        `${WEATHER_API_BASE_URL}/forecast.json`,
        {
          params: {
            key:    WEATHER_API_KEY,
            q:      location.address,
            days:   1,
            aqi:    'no',
            alerts: 'no'
          }
        }
      );
      weatherSnapshot = weatherResponse.data;
    } catch (weatherErr) {
      console.error('[locationRoutes] Weather API error:', weatherErr.message);
      return res.status(503).json({ error: 'Weather service is unavailable' });
    }

    // 4. Persist snapshot in JSONB column
    await pool.query(
      `UPDATE favourite_locations
       SET weather_snapshot = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(weatherSnapshot), id]
    );

    // 5. Build readable summary from API response
    const current = weatherSnapshot.current;
    const weather = {
      temp_c:     current?.temp_c,
      temp_f:     current?.temp_f,
      condition:  current?.condition?.text,
      humidity:   current?.humidity,
      wind_kph:   current?.wind_kph,
      fetched_at: new Date().toISOString()
    };

    return res.status(200).json({
      location: {
        id:      location.id,
        label:   location.label,
        address: location.address
      },
      weather
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
