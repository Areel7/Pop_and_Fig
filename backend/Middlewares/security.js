import rateLimit from "express-rate-limit";

const limiterMessage = (message) => ({ success: false, message });

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: limiterMessage("Too many requests, please try again later"),
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: limiterMessage("Too many attempts, please try again in a few minutes"),
});

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: limiterMessage("Too many password reset requests, please try again later"),
});

// Removes MongoDB operator keys ($gt, $where, ...) and dotted keys from user-controlled objects.
const stripOperators = (value) => {
    if (Array.isArray(value)) return value.map(stripOperators);
    if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !key.startsWith("$") && !key.includes("."))
                .map(([key, nested]) => [key, stripOperators(nested)])
        );
    }
    return value;
};

export const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === "object") req.body = stripOperators(req.body);
    if (req.params) req.params = stripOperators(req.params);
    next();
};
