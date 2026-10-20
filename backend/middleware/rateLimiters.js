const rateLimit = require("express-rate-limit");

const minutes = (n) => n * 60 * 1000;
const limiter = (windowMinutes, limit) =>
  rateLimit({ windowMs: minutes(windowMinutes), limit, standardHeaders: true, legacyHeaders: false });

module.exports = {
  generalLimiter: limiter(15, 600),
  authLimiter: limiter(15, 30),
  aiLimiter: limiter(60, 60),
};
