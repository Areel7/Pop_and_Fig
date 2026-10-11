import mongoose from "mongoose";

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "completed"];

// Forward-only workflow. completed and cancelled are terminal, so an order can only ever
// transition INTO completed once — the basis of completion-email duplicate prevention.
export const ORDER_TRANSITIONS = {
    pending: ["confirmed", "processing", "shipped", "delivered", "completed", "cancelled"],
    confirmed: ["processing", "shipped", "delivered", "completed", "cancelled"],
    processing: ["shipped", "delivered", "completed", "cancelled"],
    shipped: ["delivered", "completed"],
    delivered: ["completed"],
    completed: [],
    cancelled: [],
};

const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        slug: String,
        sku: String,
        image: String,
        originalPrice: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        lineTotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
    {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        note: { type: String, default: "" },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, required: true, unique: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        customer: {
            name: { type: String, required: true },
            email: { type: String, required: true, lowercase: true },
            phone: { type: String, required: true },
        },
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        items: { type: [orderItemSchema], validate: [(v) => v.length > 0, "Order must contain items"] },
        subtotal: { type: Number, required: true, min: 0 },
        // Amount saved through product sale prices (already included in unit prices). All amounts in PKR.
        savings: { type: Number, default: 0, min: 0 },
        shipping: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
        notes: { type: String, default: "", maxlength: 500 },

        paymentMethod: { type: String, enum: ["cash_on_delivery"], default: "cash_on_delivery" },
        paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },

        status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
        statusHistory: { type: [statusHistorySchema], default: [] },
        stockRestored: { type: Boolean, default: false },
        completedAt: Date,
        cancelledAt: Date,

        // Order-completion email tracking.
        emailStatus: { type: String, enum: ["not_sent", "pending", "sent", "failed"], default: "not_sent" },
        emailSent: { type: Boolean, default: false },
        emailSentAt: Date,
        emailError: { type: String, default: "" },
        emailAttempts: { type: Number, default: 0 },
        emailLockedAt: Date,
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "items.product": 1, user: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
