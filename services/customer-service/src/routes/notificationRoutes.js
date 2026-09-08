// Notification routes
const express = require("express");
const pool = require("../db/pool");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Inbox
router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          user_id,
          type,
          title,
          message,
          payload,
          is_read,
          read_at,
          created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      notifications: result.rows
    });
  } catch (err) {
    return next(err);
  }
});

// Read status
router.patch("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE notifications
        SET
          is_read = true,
          read_at = NOW()
        WHERE id = $1
          AND user_id = $2
        RETURNING id
      `,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return next(createError(404, "Notification not found"));
    }

    return res.status(200).json({
      message: "Notification marked as read"
    });
  } catch (err) {
    return next(err);
  }
});

// Internal creation
router.post("/notifications", async (req, res, next) => {
  try {
    const { user_id, type, title, message, payload } = req.body;

    if (
      !user_id ||
      !type ||
      !title ||
      !message ||
      String(user_id).trim() === "" ||
      String(type).trim() === "" ||
      String(title).trim() === "" ||
      String(message).trim() === ""
    ) {
      return next(
        createError(400, "user_id, type, title, and message are required")
      );
    }

    const result = await pool.query(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          payload
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        String(user_id).trim(),
        String(type).trim(),
        String(title).trim(),
        String(message).trim(),
        payload || null
      ]
    );

    return res.status(201).json({
      message: "Notification created",
      notificationId: result.rows[0].id
    });
  } catch (err) {
    if (err.code === "23503") {
      return next(createError(404, "User not found"));
    }

    return next(err);
  }
});

module.exports = router;
