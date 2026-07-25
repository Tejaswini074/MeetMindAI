export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not found'): AppError {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError(message, 409, details);
  }

  static unprocessable(message = 'Unprocessable entity', details?: unknown): AppError {
    return new AppError(message, 422, details);
  }

  static tooMany(message = 'Too many requests'): AppError {
    return new AppError(message, 429);
  }

  static internal(message = 'Internal server error', details?: unknown): AppError {
    return new AppError(message, 500, details);
  }
}
