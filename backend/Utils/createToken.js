import jwt from "jsonwebtoken";
import env from "../Config/env.js";

export const AUTH_COOKIE = "jwt";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const authCookieOptions = () => ({
    httpOnly: true,
    secure: env.isProduction || env.COOKIE_SAMESITE === "none",
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
});

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    res.cookie(AUTH_COOKIE, token, { ...authCookieOptions(), maxAge: MAX_AGE_MS });

    return token;
};

export const clearToken = (res) => {
    res.clearCookie(AUTH_COOKIE, authCookieOptions());
};

export default generateToken;
