"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.RateLimitError = exports.ConflictError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = void 0;
const loggerService_1 = require("../services/loggerService");
class AppError extends Error {
    constructor(message, statusCode = 500, code, details, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code ?? 'INTERNAL_ERROR';
        this.details = details;
        this.isOperational = isOperational;
        // Keep V8 stack capture if available
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
        super(message, 404, 'RESOURCE_NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT', details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}
exports.RateLimitError = RateLimitError;
class ServiceUnavailableError extends AppError {
    constructor(service, details) {
        super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', details);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
// Narrow `SyntaxError` thrown by body-parser safely
const isBodyParserSyntaxError = (err) => {
    return err instanceof SyntaxError && typeof err.status === 'number' && 'body' in err;
};
// Keep 4 args to satisfy Express' error handler contract.
// Prefix `_next` to avoid eslint no-unused-vars.
const errorHandler = (error, req, res, _next) => {
    const logger = loggerService_1.LoggerService.getInstance();
    // Defaults
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details;
    // Known types
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        code = error.code;
        message = error.message;
        details = error.details;
    }
    else if (error instanceof Error) {
        if (error.name === 'ValidationError') {
            statusCode = 400;
            code = 'VALIDATION_ERROR';
            message = error.message;
        }
        else if (error.name === 'CastError') {
            statusCode = 400;
            code = 'INVALID_ID_FORMAT';
            message = 'Invalid ID format';
        }
        else if (isBodyParserSyntaxError(error)) {
            statusCode = 400;
            code = 'INVALID_JSON';
            message = 'Invalid JSON in request body';
        }
        else if (error.message?.includes?.('SQLITE_CONSTRAINT')) {
            statusCode = 409;
            code = 'DATABASE_CONSTRAINT';
            message = 'Database constraint violation';
        }
        else {
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
    }
    else {
        logger.warn(`Client Error: ${message}`, errorContext);
    }
    // Safer env check (treat anything but 'production' as dev)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorResponse = {
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
        if (typeof details !== 'undefined')
            errorResponse.error.details = details;
        if (error instanceof Error && error.stack)
            errorResponse.error.stack = error.stack;
    }
    else if (typeof details !== 'undefined' && statusCode < 500) {
        errorResponse.error.details = details;
    }
    const correlationId = req.headers['x-correlation-id'];
    if (typeof correlationId === 'string') {
        errorResponse.error.correlationId = correlationId;
    }
    else if (Array.isArray(correlationId) && correlationId.length > 0) {
        errorResponse.error.correlationId = correlationId[0];
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async wrapper with precise typing (no broad `Function`)
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
// 404 handler for unmatched routes
const notFoundHandler = (req, _res, next) => {
    next(new NotFoundError('Route'));
};
exports.notFoundHandler = notFoundHandler;
// Global uncaught exception/rejection handlers
const setupGlobalErrorHandlers = () => {
    const logger = loggerService_1.LoggerService.getInstance();
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
            type: 'uncaughtException'
        });
        // Consider allowing the process manager to restart the app.
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, _promise) => {
        logger.error('Unhandled Promise Rejection', {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
            type: 'unhandledRejection'
        });
        process.exit(1);
    });
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
