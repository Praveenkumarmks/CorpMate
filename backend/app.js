const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const env = require("./config/env");
const routes = require("./routes");
const { generalLimiter } = require("./middleware/rateLimiters");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: null, // lets the app run over plain http on localhost
      },
    },
  })
);
if (env.clientOrigins.length) app.use(cors({ origin: env.clientOrigins }));
app.use(express.json({ limit: "6mb" })); // large enough for a resized crop photo

app.use("/api", generalLimiter, routes);
app.use("/api", notFound);

// The backend also serves the frontend, so one server runs the whole app.
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use(errorHandler);

module.exports = app;
