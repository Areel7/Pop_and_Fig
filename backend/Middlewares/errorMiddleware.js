import multer from "multer";
import env from "../Config/env.js";

export const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    let errors = err.details;

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}`;
    } else if (err.name === "ValidationError") {
        statusCode = 400;
        errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        message = errors[0]?.message || "Validation failed";
    } else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `A record with this ${field} already exists`;
    } else if (err instanceof multer.MulterError) {
        statusCode = 400;
        message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller" : err.message;
    } else if (err.type === "entity.parse.failed") {
        statusCode = 400;
        message = "Malformed JSON body";
    } else if (err.type === "entity.too.large") {
        statusCode = 413;
        message = "Request body too large";
    }

    if (statusCode >= 500) {
        console.error(`[${req.method} ${req.originalUrl}]`, err);
        if (env.isProduction) message = "Internal server error";
    }

    const body = { success: false, message };
    if (errors) body.errors = errors;
    res.status(statusCode).json(body);
};
