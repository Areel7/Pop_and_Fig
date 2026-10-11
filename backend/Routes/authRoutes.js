import express from "express";
import { register, login, adminLogin, logout, getMe, forgotPassword, resetPassword } from "../Controllers/authController.js";
import { startGoogleAuth, googleAuthCallback } from "../Controllers/googleAuthController.js";
import { authenticate, optionalAuth } from "../Middlewares/authMiddleware.js";
import { authLimiter, passwordResetLimiter } from "../Middlewares/security.js";
import validate from "../Middlewares/validate.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../Validators/schemas.js";

const router = express.Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.post("/admin/login", authLimiter, validate({ body: loginSchema }), adminLogin);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.post("/forgot-password", passwordResetLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), resetPassword);

// Store-owner Gmail OAuth setup (admin session required to start; see README).
router.get("/google", optionalAuth, startGoogleAuth);
router.get("/google/callback", googleAuthCallback);

export default router;
