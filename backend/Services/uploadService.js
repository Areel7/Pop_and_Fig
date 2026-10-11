import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import env, { ROOT_DIR } from "../Config/env.js";

export const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
};

export const isCloudinaryConfigured = () =>
    Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

// Signed upload to Cloudinary's REST API (the API secret never leaves the server).
const uploadToCloudinary = async (file) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = env.CLOUDINARY_FOLDER;
    const signature = crypto
        .createHash("sha1")
        .update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
        .digest("hex");

    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname || "upload");
    form.append("api_key", env.CLOUDINARY_API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || "Cloudinary upload failed");
    return body.secure_url;
};

// Local fallback for development: files are stored in /uploads and served statically.
const uploadToDisk = async (file) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${EXTENSIONS[file.mimetype] || "img"}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
    return `${env.SERVER_URL}/uploads/${name}`;
};

export const storeImage = (file) => (isCloudinaryConfigured() ? uploadToCloudinary(file) : uploadToDisk(file));
