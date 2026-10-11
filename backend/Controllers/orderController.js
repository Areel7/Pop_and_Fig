import Order from "../Models/Order.js";
import ApiError from "../Utils/ApiError.js";
import { buildMeta, escapeRegex, getPagination, sendSuccess } from "../Utils/helpers.js";
import { cancelOwnOrder, changeOrderStatus, createOrder, retryCompletionEmail } from "../Services/orderService.js";

const EMAIL_MESSAGES = {
    sent: "Completion email sent to the customer.",
    failed: "Order completed, but the completion email failed. You can retry from the order page.",
};

// POST /api/orders
const placeOrder = async (req, res) => {
    const order = await createOrder(req.user, req.body);
    sendSuccess(res, { status: 201, message: "Order placed successfully", data: order });
};

// GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
    const pagination = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const filter = { user: req.user._id };
    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .select("-statusHistory.changedBy -emailError -emailLockedAt")
            .lean(),
        Order.countDocuments(filter),
    ]);
    sendSuccess(res, { message: "Your orders", data: orders, meta: buildMeta(pagination, total) });
};

// GET /api/orders/:id — the owner or an admin only.
const getOrder = async (req, res) => {
    const isAdmin = req.user.role === "admin";
    const order = await Order.findById(req.params.id)
        .populate(isAdmin ? { path: "user", select: "name email phone createdAt status" } : [])
        .populate(isAdmin ? { path: "statusHistory.changedBy", select: "name role" } : [])
        .lean();

    // Respond 404 rather than 403 so order IDs belonging to others are not confirmed.
    if (!order || (!isAdmin && String(order.user) !== String(req.user._id))) throw ApiError.notFound("Order not found");

    if (!isAdmin) {
        delete order.emailError;
        delete order.emailLockedAt;
        order.statusHistory = order.statusHistory.map(({ status, note, changedAt }) => ({ status, note, changedAt }));
    }
    sendSuccess(res, { message: "Order", data: order });
};

// PATCH /api/orders/:id/cancel — customer cancels their own pending order.
const cancelOrder = async (req, res) => {
    const order = await cancelOwnOrder(req.params.id, req.user);
    sendSuccess(res, { message: "Order cancelled", data: order });
};

// GET /api/admin/orders
const listOrders = async (req, res) => {
    const q = req.validatedQuery;
    const pagination = getPagination(q, { defaultLimit: 20, maxLimit: 100 });
    const filter = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.customer) filter.user = q.customer;
    if (q.emailStatus) filter.emailStatus = q.emailStatus;
    if (q.search) {
        const pattern = new RegExp(escapeRegex(q.search), "i");
        filter.$or = [{ orderNumber: pattern }, { "customer.name": pattern }, { "customer.email": pattern }, { "customer.phone": pattern }];
    }

    const [orders, total, statusCounts] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .select("orderNumber customer items.quantity items.name total status paymentStatus emailStatus createdAt user")
            .lean(),
        Order.countDocuments(filter),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const data = orders.map((o) => ({ ...o, itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0) }));
    sendSuccess(res, {
        message: "Orders",
        data,
        meta: { ...buildMeta(pagination, total), statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])) },
    });
};

// PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res) => {
    const { order, changed, email } = await changeOrderStatus(req.params.id, req.body.status, {
        adminId: req.user._id,
        note: req.body.note,
    });

    let message = changed ? `Order marked as ${order.status}` : `Order is already ${order.status}`;
    if (email) message = `${message}. ${EMAIL_MESSAGES[email.status]}`;

    sendSuccess(res, { message, data: { order, changed, email } });
};

// PATCH /api/admin/orders/:id/payment
const updatePaymentStatus = async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: { paymentStatus: req.body.paymentStatus } },
        { returnDocument: "after" }
    );
    if (!order) throw ApiError.notFound("Order not found");
    sendSuccess(res, { message: "Payment status updated", data: order });
};

// POST /api/admin/orders/:id/resend-email — retry a failed completion email.
const resendCompletionEmail = async (req, res) => {
    const { order, email } = await retryCompletionEmail(req.params.id);
    sendSuccess(res, {
        status: email.status === "sent" ? 200 : 502,
        message: EMAIL_MESSAGES[email.status],
        data: { order, email },
    });
};

export { placeOrder, getMyOrders, getOrder, cancelOrder, listOrders, updateOrderStatus, updatePaymentStatus, resendCompletionEmail };
