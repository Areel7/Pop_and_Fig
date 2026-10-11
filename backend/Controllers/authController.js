import crypto from "crypto";
import User from "../Models/User.js";
import env from "../Config/env.js";
import ApiError from "../Utils/ApiError.js";
import generateToken, { clearToken } from "../Utils/createToken.js";
import { sendSuccess } from "../Utils/helpers.js";
import { isGmailConfigured } from "../Config/gmail.js";
import { sendPasswordResetEmail } from "../Services/emailService.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (await User.exists({ email })) {
        throw ApiError.conflict("An account with this email already exists");
    }

    const user = await User.create({ name, email, password, role: "customer", lastLoginAt: new Date() });
    generateToken(res, user._id);

    sendSuccess(res, { status: 201, message: "Account created successfully", data: user.toProfile() });
};

const verifyCredentials = async (email, password) => {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) return null;
    return user;
};

const login = async (req, res) => {
    const user = await verifyCredentials(req.body.email, req.body.password);
    if (!user) throw ApiError.unauthorized("Invalid email or password");
    if (user.status === "blocked") throw ApiError.forbidden("This account has been suspended. Please contact us.");

    user.lastLoginAt = new Date();
    await user.save();
    generateToken(res, user._id);

    sendSuccess(res, { message: "Logged in successfully", data: user.toProfile() });
};

// Separate admin login: same credentials check, but only admin accounts receive a session.
const adminLogin = async (req, res) => {
    const user = await verifyCredentials(req.body.email, req.body.password);
    if (!user || user.role !== "admin" || user.status === "blocked") {
        throw ApiError.unauthorized("Invalid admin credentials");
    }

    user.lastLoginAt = new Date();
    await user.save();
    generateToken(res, user._id);

    sendSuccess(res, { message: "Welcome back", data: user.toProfile() });
};

const logout = (req, res) => {
    clearToken(res);
    sendSuccess(res, { message: "Logged out successfully" });
};

const getMe = (req, res) => {
    sendSuccess(res, { message: "Current user", data: req.user.toProfile() });
};

const GENERIC_RESET_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

const forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email, status: "active" });

    if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = hashToken(token);
        user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await user.save({ validateModifiedOnly: true });

        const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

        if (isGmailConfigured()) {
            try {
                await sendPasswordResetEmail({ user, resetUrl });
            } catch (error) {
                console.error(`[password-reset] Email to user ${user._id} failed: ${error.message}`);
            }
        } else if (!env.isProduction) {
            // Development convenience only: Gmail is not configured, so surface the link locally.
            console.warn(`[password-reset] Gmail not configured. Development reset link for ${user.email}: ${resetUrl}`);
        } else {
            console.error("[password-reset] Gmail API is not configured; reset email could not be sent.");
        }
    }

    // Same response whether or not the account exists (prevents account enumeration).
    sendSuccess(res, { message: GENERIC_RESET_MESSAGE });
};

const resetPassword = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: hashToken(req.body.token),
        resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) throw ApiError.badRequest("This reset link is invalid or has expired");

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    clearToken(res);
    sendSuccess(res, { message: "Password updated. You can now log in with your new password." });
};

export { register, login, adminLogin, logout, getMe, forgotPassword, resetPassword };
