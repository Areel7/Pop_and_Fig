import express from "express";
import { listRecentReviews, updateReview, deleteReview } from "../Controllers/reviewController.js";
import { authenticate } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import { idParams, updateReviewSchema } from "../Validators/schemas.js";

const router = express.Router();

router.get("/", listRecentReviews);

router
    .route("/:id")
    .patch(authenticate, validate({ params: idParams, body: updateReviewSchema }), updateReview)
    .delete(authenticate, validate({ params: idParams }), deleteReview);

export default router;
