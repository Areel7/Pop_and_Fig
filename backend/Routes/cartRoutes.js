import express from "express";
import { getCart, saveCart, quote } from "../Controllers/userController.js";
import { authenticate } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import { cartSchema, quoteSchema } from "../Validators/schemas.js";

const router = express.Router();

// Public: server-side price calculation for any cart (guest or logged in).
router.post("/quote", validate({ body: quoteSchema }), quote);

// Persistent cart for authenticated customers.
router.route("/").get(authenticate, getCart).put(authenticate, validate({ body: cartSchema }), saveCart);

export default router;
