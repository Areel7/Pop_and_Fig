import express from "express";
import {
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../Controllers/categoryController.js";
import { authenticate, authorizeAdmin, optionalAuth } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import { categorySchema, idOrSlugParams, idParams, updateCategorySchema } from "../Validators/schemas.js";

const router = express.Router();

router
    .route("/")
    .get(optionalAuth, listCategories)
    .post(authenticate, authorizeAdmin, validate({ body: categorySchema }), createCategory);

router
    .route("/:id")
    .get(optionalAuth, validate({ params: idOrSlugParams }), getCategory)
    .patch(authenticate, authorizeAdmin, validate({ params: idParams, body: updateCategorySchema }), updateCategory)
    .delete(authenticate, authorizeAdmin, validate({ params: idParams }), deleteCategory);

export default router;
