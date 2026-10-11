// Empty in development: requests go to /api on the Vite origin and are proxied to Express.
export const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const AUTH_URL = "/api/auth";
export const USER_URL = "/api/users";
export const CART_URL = "/api/cart";
export const PRODUCT_URL = "/api/products";
export const CATEGORY_URL = "/api/categories";
export const ORDER_URL = "/api/orders";
export const REVIEW_URL = "/api/reviews";
export const DISCOUNT_URL = "/api/discounts";
export const SETTINGS_URL = "/api/settings";
export const ADMIN_URL = "/api/admin";

// The unusual path is intentional; it is NOT the security mechanism (the API enforces admin role).
export const ADMIN_BASE_PATH = "/fahad-azeem-pop-and-figs-admin-fahad-login";
export const adminPath = (path = "") => `${ADMIN_BASE_PATH}${path ? `/${path.replace(/^\//, "")}` : ""}`;
