import { apiSlice, unwrapData } from "./apiSlice.js";
import { ADMIN_URL, DISCOUNT_URL } from "../constant.js";

// Discounts change product prices, so every mutation refreshes product data and cart quotes.
const affected = [{ type: "Discount", id: "LIST" }, { type: "Product", id: "LIST" }, "Product", "Cart", "Wishlist"];

export const discountApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getActiveDiscounts: builder.query({
            query: () => DISCOUNT_URL,
            transformResponse: unwrapData,
            providesTags: [{ type: "Discount", id: "LIST" }],
        }),
        getAdminDiscounts: builder.query({
            query: () => `${ADMIN_URL}/discounts`,
            transformResponse: unwrapData,
            providesTags: [{ type: "Discount", id: "LIST" }],
        }),
        createDiscount: builder.mutation({
            query: (data) => ({ url: `${ADMIN_URL}/discounts`, method: "POST", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: affected,
        }),
        updateDiscount: builder.mutation({
            query: ({ id, ...data }) => ({ url: `${ADMIN_URL}/discounts/${id}`, method: "PATCH", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: affected,
        }),
        deleteDiscount: builder.mutation({
            query: (id) => ({ url: `${ADMIN_URL}/discounts/${id}`, method: "DELETE" }),
            invalidatesTags: affected,
        }),
    }),
});

export const {
    useGetActiveDiscountsQuery,
    useGetAdminDiscountsQuery,
    useCreateDiscountMutation,
    useUpdateDiscountMutation,
    useDeleteDiscountMutation,
} = discountApi;
