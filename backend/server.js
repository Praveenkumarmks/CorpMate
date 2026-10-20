const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

async function start() {
  await connectDB(env.mongoUri);
  app.listen(env.port, () => console.log(`CropMate running on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error("Could not start the server:", err.message);
  process.exit(1);
});
