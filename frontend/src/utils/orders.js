export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"];

// Mirrors the backend ORDER_TRANSITIONS (the backend remains the authority).
export const ORDER_TRANSITIONS = {
    pending: ["confirmed", "processing", "shipped", "delivered", "completed", "cancelled"],
    confirmed: ["processing", "shipped", "delivered", "completed", "cancelled"],
    processing: ["shipped", "delivered", "completed", "cancelled"],
    shipped: ["delivered", "completed"],
    delivered: ["completed"],
    completed: [],
    cancelled: [],
};
