export class ValidationError extends Error {
  statusCode: number;

  /**
   * @description Creates a validation error with message and HTTP status code
   * @param {string} message - Descriptive error message
   * @param {number} [statusCode] - HTTP status code (defaults to 400)
   */
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode ?? 400;
  }
}
