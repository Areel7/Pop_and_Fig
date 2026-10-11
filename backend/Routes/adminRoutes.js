import express from "express";
import {
    getDashboard,
    listCustomers,
    getCustomer,
    updateCustomerStatus,
    uploadImages,
    getEmailStatus,
    sendTestEmailHandler,
} from "../Controllers/adminController.js";
import {
    getOrder,
    listOrders,
    updateOrderStatus,
    updatePaymentStatus,
    resendCompletionEmail,
} from "../Controllers/orderController.js";
import { listReviews, moderateReview, deleteReview } from "../Controllers/reviewController.js";
import { listDiscounts, createDiscount, updateDiscount, deleteDiscount } from "../Controllers/discountController.js";
import { updateSettings } from "../Controllers/settingsController.js";
import { authenticate, authorizeAdmin } from "../Middlewares/authMiddleware.js";
import validate from "../Middlewares/validate.js";
import upload from "../Middlewares/upload.js";
import {
    adminListQuerySchema,
    adminOrderQuerySchema,
    createDiscountSchema,
    customerStatusSchema,
    dashboardQuerySchema,
    idParams,
    orderStatusSchema,
    paymentStatusSchema,
    reviewModerationSchema,
    settingsSchema,
    testEmailSchema,
    updateDiscountSchema,
} from "../Validators/schemas.js";

const router = express.Router();

// Every admin endpoint requires (1) an authenticated user and (2) the admin role.
router.use(authenticate, authorizeAdmin);

router.get("/dashboard", validate({ query: dashboardQuerySchema }), getDashboard);

router.get("/customers", validate({ query: adminListQuerySchema }), listCustomers);
router.get("/customers/:id", validate({ params: idParams }), getCustomer);
router.patch("/customers/:id/status", validate({ params: idParams, body: customerStatusSchema }), updateCustomerStatus);

router.get("/orders", validate({ query: adminOrderQuerySchema }), listOrders);
router.get("/orders/:id", validate({ params: idParams }), getOrder);
router.patch("/orders/:id/status", validate({ params: idParams, body: orderStatusSchema }), updateOrderStatus);
router.patch("/orders/:id/payment", validate({ params: idParams, body: paymentStatusSchema }), updatePaymentStatus);
router.post("/orders/:id/resend-email", validate({ params: idParams }), resendCompletionEmail);

router.get("/reviews", validate({ query: adminListQuerySchema }), listReviews);
router
    .route("/reviews/:id")
    .patch(validate({ params: idParams, body: reviewModerationSchema }), moderateReview)
    .delete(validate({ params: idParams }), deleteReview);

router.route("/discounts").get(listDiscounts).post(validate({ body: createDiscountSchema }), createDiscount);
router
    .route("/discounts/:id")
    .patch(validate({ params: idParams, body: updateDiscountSchema }), updateDiscount)
    .delete(validate({ params: idParams }), deleteDiscount);

router.patch("/settings", validate({ body: settingsSchema }), updateSettings);

router.post("/uploads", upload.array("images", 8), uploadImages);

router.get("/email/status", getEmailStatus);
router.post("/email/test", validate({ body: testEmailSchema }), sendTestEmailHandler);

export default router;
