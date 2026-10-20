// Lets controllers use async/await without try/catch. Errors go to the error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
