const PROTECTED_KEYS = ["user", "_id", "id", "createdAt", "updatedAt", "__v"];

// Copies only safe keys from a request body, so a client can never set "user"
// or inject MongoDB operators such as { "$set": ... }.
function pickBody(body) {
  const clean = {};
  for (const key of Object.keys(body || {})) {
    if (key.startsWith("$") || key.includes(".") || PROTECTED_KEYS.includes(key)) continue;
    clean[key] = body[key];
  }
  return clean;
}

module.exports = { pickBody };
