import crypto from "crypto";
import Order, { ORDER_TRANSITIONS } from "../Models/Order.js";
import Product from "../Models/Product.js";
import User from "../Models/User.js";
import ApiError from "../Utils/ApiError.js";
import { quoteCart } from "./pricingService.js";
import { sendOrderCompletionEmail } from "./emailService.js";

const EMAIL_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const generateOrderNumber = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `PF-${date}-${suffix}`;
};

const releaseStock = async (reserved) => {
    await Promise.all(
        reserved.map(({ productId, quantity }) =>
            Product.updateOne({ _id: productId }, { $inc: { stock: quantity, sold: -quantity } })
        )
    );
};

// Atomically decrements stock for each line; rolls back everything if any line cannot be fulfilled.
const reserveStock = async (lines) => {
    const reserved = [];
    for (const line of lines) {
        const result = await Product.updateOne(
            { _id: line.productId, status: "active", stock: { $gte: line.quantity } },
            { $inc: { stock: -line.quantity, sold: line.quantity } }
        );
        if (result.modifiedCount !== 1) {
            await releaseStock(reserved);
            const current = await Product.findById(line.productId).select("stock name").lean();
            const message = current && current.stock > 0
                ? `Only ${current.stock} of ${line.name} left in stock`
                : `${line.name} is out of stock`;
            throw ApiError.conflict(message);
        }
        reserved.push({ productId: line.productId, quantity: line.quantity });
    }
    return reserved;
};

/**
 * Creates an order. Every price is recalculated on the server from MongoDB (unit price × quantity,
 * subtotal + shipping = total);
 * the client only supplies product IDs, quantities, contact and shipping details.
 */
export const createOrder = async (user, { items, customer, shippingAddress, notes }) => {
    const quote = await quoteCart(items, { strict: true });
    const lines = quote.items;

    let reserved = [];
    try {
        reserved = await reserveStock(lines);

        const orderData = {
            user: user._id,
            customer,
            shippingAddress,
            items: lines.map((line) => ({
                product: line.productId,
                name: line.name,
                slug: line.slug,
                sku: line.sku,
                image: line.image,
                originalPrice: line.originalPrice,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
            })),
            subtotal: quote.subtotal,
            savings: quote.savings,
            shipping: quote.shipping,
            total: quote.total,
            notes: notes || "",
            status: "pending",
            statusHistory: [{ status: "pending", note: "Order placed", changedBy: user._id }],
        };

        let order;
        for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
            try {
                order = await Order.create({ ...orderData, orderNumber: generateOrderNumber() });
            } catch (error) {
                if (error.code !== 11000 || !error.keyPattern?.orderNumber) throw error;
            }
        }
        if (!order) throw new Error("Could not generate a unique order number");

        // Clear the persisted cart and remember contact details for next time.
        const profileUpdate = { cart: [] };
        if (!user.phone) profileUpdate.phone = customer.phone;
        if (!user.shippingAddress?.address) profileUpdate.shippingAddress = shippingAddress;
        await User.updateOne({ _id: user._id }, { $set: profileUpdate });

        return order;
    } catch (error) {
        if (reserved.length) await releaseStock(reserved);
        throw error;
    }
};

// Returns stock to inventory exactly once per cancelled order.
const restoreStockForOrder = async (orderId) => {
    const claimed = await Order.findOneAndUpdate({ _id: orderId, stockRestored: false }, { $set: { stockRestored: true } });
    if (!claimed) return;
    await releaseStock(claimed.items.filter((i) => i.product).map((i) => ({ productId: i.product, quantity: i.quantity })));
};

/**
 * Sends the completion email for an order that has already been claimed for sending
 * (emailStatus = "pending" with a fresh emailLockedAt), then records the outcome.
 * A Gmail failure never rolls back the order's completed status.
 */
const deliverCompletionEmail = async (order) => {
    try {
        await sendOrderCompletionEmail(order);
        await Order.updateOne(
            { _id: order._id },
            {
                $set: { emailStatus: "sent", emailSent: true, emailSentAt: new Date(), emailError: "" },
                $inc: { emailAttempts: 1 },
                $unset: { emailLockedAt: 1 },
            }
        );
        return { status: "sent" };
    } catch (error) {
        console.error(`[order-email] Completion email for ${order.orderNumber} failed: ${error.message}`);
        await Order.updateOne(
            { _id: order._id },
            {
                $set: { emailStatus: "failed", emailError: String(error.message).slice(0, 500) },
                $inc: { emailAttempts: 1 },
                $unset: { emailLockedAt: 1 },
            }
        );
        return { status: "failed", error: error.message };
    }
};

/**
 * Admin status change. Transitions are validated against ORDER_TRANSITIONS and applied with a
 * compare-and-set on the previous status, so concurrent requests cannot both "complete" an order.
 * The completion email is sent only on the transition INTO completed; completed → completed is a no-op.
 */
export const changeOrderStatus = async (orderId, nextStatus, { adminId, note = "" } = {}) => {
    const order = await Order.findById(orderId);
    if (!order) throw ApiError.notFound("Order not found");

    if (order.status === nextStatus) {
        return { order, changed: false, email: null };
    }

    const allowed = ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
        throw ApiError.badRequest(`Cannot change an order from "${order.status}" to "${nextStatus}"`);
    }

    const now = new Date();
    const set = { status: nextStatus };
    const willSendEmail = nextStatus === "completed" && !order.emailSent;

    if (nextStatus === "completed") {
        set.completedAt = now;
        set.paymentStatus = "paid";
        if (willSendEmail) {
            set.emailStatus = "pending";
            set.emailLockedAt = now;
        }
    }
    if (nextStatus === "cancelled") set.cancelledAt = now;

    const updated = await Order.findOneAndUpdate(
        { _id: order._id, status: order.status },
        { $set: set, $push: { statusHistory: { status: nextStatus, note, changedBy: adminId, changedAt: now } } },
        { returnDocument: "after" }
    );

    if (!updated) {
        throw ApiError.conflict("This order was updated by someone else. Refresh and try again.");
    }

    if (nextStatus === "cancelled") await restoreStockForOrder(updated._id);

    let email = null;
    if (willSendEmail) email = await deliverCompletionEmail(updated);

    return { order: await Order.findById(updated._id), changed: true, email };
};

// Manual retry for a completed order whose email failed (or got stuck). Never re-sends a sent email.
export const retryCompletionEmail = async (orderId) => {
    const now = new Date();
    const claimed = await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: "completed",
            emailSent: false,
            $or: [
                { emailStatus: { $in: ["failed", "not_sent"] } },
                { emailStatus: "pending", emailLockedAt: { $lt: new Date(now.getTime() - EMAIL_LOCK_TIMEOUT_MS) } },
            ],
        },
        { $set: { emailStatus: "pending", emailLockedAt: now } },
        { returnDocument: "after" }
    );

    if (!claimed) {
        const order = await Order.findById(orderId).select("status emailSent emailStatus").lean();
        if (!order) throw ApiError.notFound("Order not found");
        if (order.status !== "completed") throw ApiError.badRequest("Only completed orders send a completion email");
        if (order.emailSent) throw ApiError.conflict("The completion email has already been sent for this order");
        throw ApiError.conflict("The completion email is currently being sent");
    }

    const email = await deliverCompletionEmail(claimed);
    return { order: await Order.findById(orderId), email };
};

// Customers may cancel their own order while it is still pending.
export const cancelOwnOrder = async (orderId, user) => {
    const updated = await Order.findOneAndUpdate(
        { _id: orderId, user: user._id, status: "pending" },
        {
            $set: { status: "cancelled", cancelledAt: new Date() },
            $push: { statusHistory: { status: "cancelled", note: "Cancelled by customer", changedBy: user._id } },
        },
        { returnDocument: "after" }
    );
    if (!updated) {
        const exists = await Order.exists({ _id: orderId, user: user._id });
        if (!exists) throw ApiError.notFound("Order not found");
        throw ApiError.badRequest("Only pending orders can be cancelled");
    }
    await restoreStockForOrder(updated._id);
    return Order.findById(updated._id);
};
