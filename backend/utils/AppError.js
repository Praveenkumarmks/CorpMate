// An error with an HTTP status code and a message that is safe to show to the user.
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.isAppError = true;
  }
}

module.exports = AppError;
