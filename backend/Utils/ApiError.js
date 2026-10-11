// Operational error carrying an HTTP status code; handled by the central error middleware.
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
    }

    static badRequest(message = "Bad request", details) {
        return new ApiError(400, message, details);
    }

    static unauthorized(message = "Not authorized") {
        return new ApiError(401, message);
    }

    static forbidden(message = "Forbidden") {
        return new ApiError(403, message);
    }

    static notFound(message = "Resource not found") {
        return new ApiError(404, message);
    }

    static conflict(message = "Conflict", details) {
        return new ApiError(409, message, details);
    }
}

export default ApiError;
