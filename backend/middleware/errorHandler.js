function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

// Turns any error into a clean JSON message. Unexpected errors are logged, not shown.
function errorHandler(err, req, res, next) {
  if (err.isAppError) return res.status(err.status).json({ error: err.message });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: "That record already exists" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That upload is too large" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}

module.exports = { notFound, errorHandler };
