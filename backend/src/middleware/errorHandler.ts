import { Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from 'express';
import { LoggerService } from '../services/loggerService';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: unknown;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code ?? 'INTERNAL_ERROR';
    this.details = details;
    this.isOperational = isOperational;

    // Keep V8 stack capture if available
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, details?: unknown) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

// Narrow `SyntaxError` thrown by body-parser safely
const isBodyParserSyntaxError = (err: unknown): err is SyntaxError & { status?: number; body?: unknown } => {
  return err instanceof SyntaxError && typeof (err as any).status === 'number' && 'body' in (err as any);
};

// Keep 4 args to satisfy Express' error handler contract.
// Prefix `_next` to avoid eslint no-unused-vars.
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const logger = LoggerService.getInstance();

  // Defaults
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  // Known types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    if (error.name === 'ValidationError') {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      code = 'INVALID_ID_FORMAT';
      message = 'Invalid ID format';
    } else if (isBodyParserSyntaxError(error)) {
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON in request body';
    } else if (error.message?.includes?.('SQLITE_CONSTRAINT')) {
      statusCode = 409;
      code = 'DATABASE_CONSTRAINT';
      message = 'Database constraint violation';
    } else {
      // fall back to Error
      message = error.message || message;
    }
  }

  // Log with context (avoid leaking body in logs if too large)
  const errorContext = {
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    statusCode,
    code,
    stack: error instanceof Error ? error.stack : undefined,
    body: req.body,
    params: req.params,
    query: req.query
  };

  if (statusCode >= 500) {
    logger.error(`Server Error: ${message}`, errorContext);
  } else {
    logger.warn(`Client Error: ${message}`, errorContext);
  }

  // Safer env check (treat anything but 'production' as dev)
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const errorResponse: {
    error: {
      code: string;
      message: string;
      timestamp: string;
      path: string;
      method: string;
      details?: unknown;
      stack?: string;
      correlationId?: string;
    };
  } = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Include details in development; include for 4xx in prod if available
  if (isDevelopment) {
    if (typeof details !== 'undefined') errorResponse.error.details = details;
    if (error instanceof Error && error.stack) errorResponse.error.stack = error.stack;
  } else if (typeof details !== 'undefined' && statusCode < 500) {
    errorResponse.error.details = details;
  }

  const correlationId = req.headers['x-correlation-id'];
  if (typeof correlationId === 'string') {
    errorResponse.error.correlationId = correlationId;
  } else if (Array.isArray(correlationId) && correlationId.length > 0) {
    errorResponse.error.correlationId = correlationId[0];
  }

  res.status(statusCode).json(errorResponse);
};

// Async wrapper with precise typing (no broad `Function`)
export const asyncHandler =
  <T extends (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>>(fn: T): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('Route'));
};

// Global uncaught exception/rejection handlers
export const setupGlobalErrorHandlers = () => {
  const logger = LoggerService.getInstance();

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      type: 'uncaughtException'
    });
    // Consider allowing the process manager to restart the app.
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      type: 'unhandledRejection'
    });
    process.exit(1);
  });
};