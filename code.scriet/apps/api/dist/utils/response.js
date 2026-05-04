const isProduction = process.env.NODE_ENV === 'production';
// Filter potentially sensitive information from error details in production
function sanitizeErrorDetails(details, seen) {
    if (!isProduction || details === undefined) {
        return details;
    }
    // Filter out stack traces from error details
    if (typeof details === 'string') {
        // Check for stack trace patterns
        if (details.includes('    at ') || details.includes('Error:')) {
            return '[Error details hidden in production]';
        }
        return details;
    }
    if (typeof details === 'object' && details !== null) {
        // Guard against circular references
        const visited = seen || new WeakSet();
        if (visited.has(details)) {
            return '[Circular]';
        }
        visited.add(details);
        // If it's an Error-like object, strip the stack
        if ('stack' in details) {
            const { stack: _stack, ...rest } = details;
            return sanitizeErrorDetails(rest, visited);
        }
        // Recursively sanitize object properties
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            // Skip stack-like keys
            if (key === 'stack' || key === 'stackTrace')
                continue;
            sanitized[key] = sanitizeErrorDetails(value, visited);
        }
        return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }
    return details;
}
// Error codes
export const ErrorCodes = {
    // Authentication errors
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    FORBIDDEN: 'FORBIDDEN',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_FIELD: 'MISSING_FIELD',
    BAD_REQUEST: 'BAD_REQUEST',
    // Resource errors
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',
    // Rate limiting
    RATE_LIMITED: 'RATE_LIMITED',
    // Server errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    // Business logic errors
    REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
    EVENT_FULL: 'EVENT_FULL',
    ALREADY_REGISTERED: 'ALREADY_REGISTERED',
    REGISTRATION_NOT_STARTED: 'REGISTRATION_NOT_STARTED',
};
// Static response helper
export const ApiResponse = {
    // Success response
    success(res, data, message) {
        const response = {
            success: true,
            data,
            ...(message && { message }),
        };
        return res.status(200).json(response);
    },
    // Created response (201)
    created(res, data, message) {
        const response = {
            success: true,
            data,
            ...(message && { message }),
        };
        return res.status(201).json(response);
    },
    // Paginated response
    paginated(res, data, meta) {
        const response = {
            success: true,
            data,
            meta: {
                ...meta,
                hasMore: meta.page < meta.totalPages,
            },
        };
        return res.status(200).json(response);
    },
    // No content response
    noContent(res) {
        return res.status(204).send();
    },
    // Error response
    error(res, error) {
        // Sanitize error details in production to prevent stack trace leakage
        const sanitizedDetails = sanitizeErrorDetails(error.details);
        const response = {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
            },
        };
        return res.status(error.status || 400).json(response);
    },
    // Convenience methods
    unauthorized(res, message = 'Authentication required') {
        return ApiResponse.error(res, {
            code: ErrorCodes.UNAUTHORIZED,
            message,
            status: 401,
        });
    },
    forbidden(res, message = 'Access denied') {
        return ApiResponse.error(res, {
            code: ErrorCodes.FORBIDDEN,
            message,
            status: 403,
        });
    },
    notFound(res, message = 'Resource not found') {
        return ApiResponse.error(res, {
            code: ErrorCodes.NOT_FOUND,
            message,
            status: 404,
        });
    },
    badRequest(res, message, details) {
        return ApiResponse.error(res, {
            code: ErrorCodes.BAD_REQUEST,
            message,
            details,
            status: 400,
        });
    },
    validationError(res, errors) {
        return ApiResponse.error(res, {
            code: ErrorCodes.VALIDATION_FAILED,
            message: 'Validation failed',
            details: errors,
            status: 400,
        });
    },
    conflict(res, message) {
        return ApiResponse.error(res, {
            code: ErrorCodes.ALREADY_EXISTS,
            message,
            status: 409,
        });
    },
    internal(res, message = 'Internal server error') {
        return ApiResponse.error(res, {
            code: ErrorCodes.INTERNAL_ERROR,
            message,
            status: 500,
        });
    },
    rateLimited(res, message = 'Too many requests') {
        return ApiResponse.error(res, {
            code: ErrorCodes.RATE_LIMITED,
            message,
            status: 429,
        });
    },
};
// Legacy helper function (for backward compatibility)
export const apiResponse = (res) => ({
    success: (data, message) => ApiResponse.success(res, data, message),
    created: (data, message) => ApiResponse.created(res, data, message),
    error: (error) => ApiResponse.error(res, error),
    notFound: (message) => ApiResponse.notFound(res, message),
    unauthorized: (message) => ApiResponse.unauthorized(res, message),
    forbidden: (message) => ApiResponse.forbidden(res, message),
});
