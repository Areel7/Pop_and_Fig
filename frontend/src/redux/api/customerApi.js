import { apiSlice, unwrapData, unwrapList } from "./apiSlice.js";
import { ADMIN_URL } from "../constant.js";

// Admin customer management.
export const customerApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getCustomers: builder.query({
            query: (params) => ({ url: `${ADMIN_URL}/customers`, params }),
            transformResponse: unwrapList,
            providesTags: [{ type: "Customer", id: "LIST" }],
        }),
        getCustomer: builder.query({
            query: (id) => `${ADMIN_URL}/customers/${id}`,
            transformResponse: unwrapData,
            providesTags: (result, error, id) => [{ type: "Customer", id }],
        }),
        updateCustomerStatus: builder.mutation({
            query: ({ id, status }) => ({ url: `${ADMIN_URL}/customers/${id}/status`, method: "PATCH", body: { status } }),
            invalidatesTags: (result, error, { id }) => [{ type: "Customer", id }, { type: "Customer", id: "LIST" }],
        }),
    }),
});

export const { useGetCustomersQuery, useGetCustomerQuery, useUpdateCustomerStatusMutation } = customerApi;
