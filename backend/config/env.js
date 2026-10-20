require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET || "";
if (jwtSecret.length < 16) {
  console.error("Missing JWT_SECRET. Add a long random value (16+ characters) to backend/.env");
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cropmate",
  jwtSecret,
  appUrl: process.env.APP_URL || "http://localhost:5000",
  clientOrigins: (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  dataGovApiKey: process.env.DATA_GOV_API_KEY || "",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "CropMate <no-reply@example.com>",
  },
};
