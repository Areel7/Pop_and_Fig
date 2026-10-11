import express from "express";
import {
    updateProfile,
    changePassword,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    getMyReviews,
} from "../Controllers/userController.js";
import { getMe } from "../Controllers/authController.js";
import { authenticate } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import { changePasswordSchema, productIdParams, updateProfileSchema, wishlistSchema } from "../Validators/schemas.js";

const router = express.Router();

router.use(authenticate);

router.route("/profile").get(getMe).patch(validate({ body: updateProfileSchema }), updateProfile);
router.patch("/password", validate({ body: changePasswordSchema }), changePassword);
router.route("/wishlist").get(getWishlist).post(validate({ body: wishlistSchema }), addToWishlist);
router.delete("/wishlist/:productId", validate({ params: productIdParams }), removeFromWishlist);
router.get("/reviews", getMyReviews);

export default router;
