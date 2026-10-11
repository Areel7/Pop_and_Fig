import express from "express";
import {
    listProducts,
    getPriceRange,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
} from "../Controllers/productController.js";
import { getProductReviews, createReview } from "../Controllers/reviewController.js";
import { authenticate, authorizeAdmin, optionalAuth } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import {
    createProductSchema,
    createReviewSchema,
    idOrSlugParams,
    idParams,
    productQuerySchema,
    updateProductSchema,
} from "../Validators/schemas.js";

const router = express.Router();

router
    .route("/")
    .get(optionalAuth, validate({ query: productQuerySchema }), listProducts)
    .post(authenticate, authorizeAdmin, validate({ body: createProductSchema }), createProduct);

router.get("/price-range", getPriceRange);

router
    .route("/:id")
    .get(optionalAuth, validate({ params: idOrSlugParams }), getProduct)
    .patch(authenticate, authorizeAdmin, validate({ params: idParams, body: updateProductSchema }), updateProduct)
    .delete(authenticate, authorizeAdmin, validate({ params: idParams }), deleteProduct);

router
    .route("/:id/reviews")
    .get(optionalAuth, validate({ params: idOrSlugParams }), getProductReviews)
    .post(authenticate, validate({ params: idOrSlugParams, body: createReviewSchema }), createReview);

export default router;
