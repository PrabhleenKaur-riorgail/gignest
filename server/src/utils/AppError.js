// An error that carries an HTTP status code, so we can send a clean message to the client.
export default class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
