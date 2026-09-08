/** Verifies the bearer token and assigns the authenticated user. */
const jwt = require("jsonwebtoken");

function createAuthError(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      createAuthError("Missing or invalid authorization token")
    );
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured");
    error.status = 500;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    return next();
  } catch (error) {
    return next(
      createAuthError("Invalid or expired token")
    );
  }
}

module.exports = requireAuth;
