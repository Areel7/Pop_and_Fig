import express from "express";
import { placeOrder, getMyOrders, getOrder, cancelOrder } from "../Controllers/orderController.js";
import { authenticate } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import { createOrderSchema, idParams } from "../Validators/schemas.js";

const router = express.Router();

router.use(authenticate);

router.post("/", validate({ body: createOrderSchema }), placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", validate({ params: idParams }), getOrder);
router.patch("/:id/cancel", validate({ params: idParams }), cancelOrder);

export default router;
