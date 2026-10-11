import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

// Files

import env, { assertRequiredEnv } from "./Config/env.js";
import connectDB from "./Config/db.js";
import { gmailNotConfiguredMessage, isGmailConfigured } from "./Config/gmail.js";
import authRoutes from "./Routes/authRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import cartRoutes from "./Routes/cartRoutes.js";
import productRoutes from "./Routes/productRoutes.js";
import categoryRoutes from "./Routes/categoryRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import reviewRoutes from "./Routes/reviewRoutes.js";
import publicRoutes from "./Routes/publicRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import { apiLimiter, sanitizeInput } from "./Middlewares/security.js";
import { errorHandler, notFound } from "./Middlewares/errorMiddleware.js";
import { refreshProductPricing } from "./Services/pricingService.js";
import { ensureAdmin } from "./Services/adminBootstrap.js";
import { runMigrations } from "./Services/migrations.js";
import { UPLOAD_DIR } from "./Services/uploadService.js";

// Configuration

assertRequiredEnv();

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Middlewares

app.use(
    helmet({
        // Allow the storefront (a different origin in development) to load uploaded images.
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);
app.use(
    cors({
        origin: env.CLIENT_URL.split(",").map((origin) => origin.trim()),
        credentials: true,
    })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeInput);

if (!env.isProduction) {
    app.use((req, res, next) => {
        console.log("Incoming request: ", req.method, req.url);
        next();
    });
}

// Routes

app.get("/api/health", (req, res) => res.json({ success: true, message: "OK", data: { uptime: process.uptime() } }));

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d", immutable: true, fallthrough: false }));

app.use(notFound);
app.use(errorHandler);

// Server

const PRICING_REFRESH_MS = 5 * 60 * 1000;

const start = async () => {
    await connectDB();

    const admin = await ensureAdmin().catch((error) => ({ status: "error", error }));
    if (admin.status === "created") console.log(`Admin account created for ${admin.email}`);
    if (admin.status === "error") console.error(`Admin bootstrap failed: ${admin.error.message}`);

    const migrated = await runMigrations().catch((error) => ({ error }));
    if (migrated.error) console.error("Data migration failed:", migrated.error.message);
    else if (Object.values(migrated).some(Boolean)) console.log("Data migration:", JSON.stringify(migrated));

    // Keeps denormalised product prices in step with scheduled discounts starting/ending.
    await refreshProductPricing().catch((error) => console.error("Pricing refresh failed:", error.message));
    setInterval(() => {
        refreshProductPricing().catch((error) => console.error("Pricing refresh failed:", error.message));
    }, PRICING_REFRESH_MS).unref();

    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
        console.log(`Gmail API: ${isGmailConfigured() ? "configured" : gmailNotConfiguredMessage()}`);
    });
};

start();
