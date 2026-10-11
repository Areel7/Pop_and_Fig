import { apiSlice, unwrapData, unwrapList } from "./apiSlice.js";
import { ADMIN_URL, ORDER_URL } from "../constant.js";

export const orderApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Customer
        createOrder: builder.mutation({
            query: (data) => ({ url: ORDER_URL, method: "POST", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: [{ type: "Order", id: "LIST" }, { type: "Product", id: "LIST" }, "Dashboard", "Customer"],
        }),
        getMyOrders: builder.query({
            query: (params) => ({ url: `${ORDER_URL}/my-orders`, params }),
            transformResponse: unwrapList,
            providesTags: (result) => [{ type: "Order", id: "LIST" }, ...(result?.items || []).map((o) => ({ type: "Order", id: o._id }))],
        }),
        getOrder: builder.query({
            query: (id) => `${ORDER_URL}/${id}`,
            transformResponse: unwrapData,
            providesTags: (result, error, id) => [{ type: "Order", id }],
        }),
        cancelOrder: builder.mutation({
            query: (id) => ({ url: `${ORDER_URL}/${id}/cancel`, method: "PATCH" }),
            transformResponse: unwrapData,
            invalidatesTags: (result, error, id) => [{ type: "Order", id }, { type: "Order", id: "LIST" }, { type: "Product", id: "LIST" }, "Dashboard"],
        }),

        // Admin
        getAdminOrders: builder.query({
            query: (params) => ({ url: `${ADMIN_URL}/orders`, params }),
            transformResponse: unwrapList,
            providesTags: (result) => [{ type: "Order", id: "LIST" }, ...(result?.items || []).map((o) => ({ type: "Order", id: o._id }))],
        }),
        getAdminOrder: builder.query({
            query: (id) => `${ADMIN_URL}/orders/${id}`,
            transformResponse: unwrapData,
            providesTags: (result, error, id) => [{ type: "Order", id }],
        }),
        updateOrderStatus: builder.mutation({
            query: ({ id, status, note }) => ({ url: `${ADMIN_URL}/orders/${id}/status`, method: "PATCH", body: { status, note } }),
            invalidatesTags: (result, error, { id }) => [
                { type: "Order", id },
                { type: "Order", id: "LIST" },
                { type: "Product", id: "LIST" },
                "Dashboard",
                "Customer",
                "EmailStatus",
            ],
        }),
        updatePaymentStatus: builder.mutation({
            query: ({ id, paymentStatus }) => ({ url: `${ADMIN_URL}/orders/${id}/payment`, method: "PATCH", body: { paymentStatus } }),
            invalidatesTags: (result, error, { id }) => [{ type: "Order", id }, { type: "Order", id: "LIST" }],
        }),
        resendCompletionEmail: builder.mutation({
            query: (id) => ({ url: `${ADMIN_URL}/orders/${id}/resend-email`, method: "POST" }),
            invalidatesTags: (result, error, id) => [{ type: "Order", id }, { type: "Order", id: "LIST" }, "EmailStatus"],
        }),
    }),
});

export const {
    useCreateOrderMutation,
    useGetMyOrdersQuery,
    useGetOrderQuery,
    useCancelOrderMutation,
    useGetAdminOrdersQuery,
    useGetAdminOrderQuery,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
    useResendCompletionEmailMutation,
} = orderApi;
