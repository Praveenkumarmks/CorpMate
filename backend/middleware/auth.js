const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../utils/AppError");

// Checks the "Authorization: Bearer <token>" header and puts the user id on req.userId.
function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next(new AppError("Please log in", 401));
  try {
    req.userId = jwt.verify(header.slice(7), env.jwtSecret).id;
    next();
  } catch {
    next(new AppError("Your session has expired. Please log in again", 401));
  }
}

module.exports = { protect };
