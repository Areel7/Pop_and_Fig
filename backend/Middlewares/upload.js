import multer from "multer";
import ApiError from "../Utils/ApiError.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

// Files are kept in memory and handed to the upload service (Cloudinary or local disk).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 8 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
        cb(ApiError.badRequest("Only JPEG, PNG, WebP, GIF or AVIF images are allowed"));
    },
});

export default upload;
