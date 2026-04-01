export class ValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode ?? 400;
  }
}
