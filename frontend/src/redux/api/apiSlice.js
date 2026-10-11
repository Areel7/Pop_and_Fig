import { fetchBaseQuery, createApi } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../constant.js";
import { logout } from "../features/auth/authSlice.js";

// The JWT lives in an httpOnly cookie, so every request simply includes credentials.
const rawBaseQuery = fetchBaseQuery({ baseUrl: BASE_URL, credentials: "include" });

// If the server says the session is gone, drop the cached user so the UI does not show stale auth state.
const baseQuery = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    const url = typeof args === "string" ? args : args.url;
    if (result.error?.status === 401 && !url.startsWith("/api/auth/login") && !url.startsWith("/api/auth/admin/login")) {
        if (api.getState().auth.userInfo) api.dispatch(logout());
    }
    return result;
};

export const apiSlice = createApi({
    baseQuery,
    tagTypes: [
        "Me",
        "Product",
        "Category",
        "Order",
        "Review",
        "Discount",
        "Settings",
        "Customer",
        "Dashboard",
        "Wishlist",
        "Cart",
        "EmailStatus",
    ],
    endpoints: () => ({}),
});

// Unwraps the backend envelope { success, message, data, meta }.
export const unwrapData = (response) => response.data;
export const unwrapList = (response) => ({ items: response.data, meta: response.meta });

// Pulls a human-readable message out of an RTK Query error.
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    if (!error) return fallback;
    if (error.data?.message) return error.data.message;
    if (error.status === "FETCH_ERROR") return "Cannot reach the server. Check your connection and try again.";
    if (error.error) return error.error;
    return fallback;
};
