import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load the project-root .env regardless of the directory the server is started from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(ROOT_DIR, ".env"), quiet: true });

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const env = {
    NODE_ENV: clean(process.env.NODE_ENV) || "development",
    PORT: Number(clean(process.env.PORT)) || 5000,
    // MONGO_URI is kept for backwards compatibility with the original .env.
    MONGODB_URI: clean(process.env.MONGODB_URI) || clean(process.env.MONGO_URI),
    JWT_SECRET: clean(process.env.JWT_SECRET),
    JWT_EXPIRES_IN: clean(process.env.JWT_EXPIRES_IN) || "7d",
    CLIENT_URL: (clean(process.env.CLIENT_URL) || "http://localhost:5173").replace(/\/$/, ""),
    COOKIE_SAMESITE: clean(process.env.COOKIE_SAMESITE) || "lax",

    GMAIL_CLIENT_ID: clean(process.env.GMAIL_CLIENT_ID),
    GMAIL_CLIENT_SECRET: clean(process.env.GMAIL_CLIENT_SECRET),
    GMAIL_REDIRECT_URI: clean(process.env.GMAIL_REDIRECT_URI),
    GMAIL_REFRESH_TOKEN: clean(process.env.GMAIL_REFRESH_TOKEN),
    GMAIL_SENDER_EMAIL: clean(process.env.GMAIL_SENDER_EMAIL),
    GMAIL_SENDER_NAME: clean(process.env.GMAIL_SENDER_NAME) || "Pop & Figs",
    GMAIL_OAUTH_SETUP_ENABLED: clean(process.env.GMAIL_OAUTH_SETUP_ENABLED) !== "false",

    CLOUDINARY_CLOUD_NAME: clean(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: clean(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: clean(process.env.CLOUDINARY_API_SECRET),
    CLOUDINARY_FOLDER: clean(process.env.CLOUDINARY_FOLDER) || "pop-and-figs",

    ADMIN_NAME: clean(process.env.ADMIN_NAME) || "Store Admin",
    ADMIN_EMAIL: clean(process.env.ADMIN_EMAIL),
    ADMIN_PASSWORD: clean(process.env.ADMIN_PASSWORD),

    // Public URL of this API (used to build absolute URLs for locally stored uploads).
    SERVER_URL: (clean(process.env.SERVER_URL) || "").replace(/\/$/, ""),
};

env.isProduction = env.NODE_ENV === "production";

export const assertRequiredEnv = () => {
    const missing = ["MONGODB_URI", "JWT_SECRET"].filter((key) => !env[key]);
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    if (env.isProduction && env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
};

export default env;
