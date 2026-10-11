import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import env from "../Config/env.js";
import ApiError from "../Utils/ApiError.js";
import { AUTH_COOKIE, clearToken } from "../Utils/createToken.js";

const readToken = (req) => {
    if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return null;
};

const resolveUser = async (token) => {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return null;
    // Tokens issued before a password change are no longer valid.
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
    return user;
};

const authenticate = async (req, res, next) => {
    const token = readToken(req);
    if (!token) throw ApiError.unauthorized("Not authorized, please log in");

    let user;
    try {
        user = await resolveUser(token);
    } catch {
        clearToken(res);
        throw ApiError.unauthorized("Session expired, please log in again");
    }

    if (!user) {
        clearToken(res);
        throw ApiError.unauthorized("Session expired, please log in again");
    }
    if (user.status === "blocked") throw ApiError.forbidden("This account has been suspended");

    req.user = user;
    next();
};

// Attaches req.user when a valid session exists, but never rejects the request.
const optionalAuth = async (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try {
            const user = await resolveUser(token);
            if (user && user.status !== "blocked") req.user = user;
        } catch {
            // Ignore invalid tokens on public routes.
        }
    }
    next();
};

const authorizeAdmin = (req, res, next) => {
    if (req.user?.role === "admin") return next();
    throw ApiError.forbidden("Admin access required");
};

export { authenticate, authorizeAdmin, optionalAuth };
