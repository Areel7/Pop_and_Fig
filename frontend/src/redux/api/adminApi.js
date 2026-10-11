import { apiSlice, unwrapData } from "./apiSlice.js";
import { ADMIN_URL } from "../constant.js";

export const adminApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getDashboard: builder.query({
            query: (params) => ({ url: `${ADMIN_URL}/dashboard`, params }),
            transformResponse: unwrapData,
            providesTags: ["Dashboard"],
        }),
        uploadImages: builder.mutation({
            query: (files) => {
                const body = new FormData();
                [...files].forEach((file) => body.append("images", file));
                return { url: `${ADMIN_URL}/uploads`, method: "POST", body };
            },
            transformResponse: unwrapData,
        }),
        getEmailStatus: builder.query({
            query: () => `${ADMIN_URL}/email/status`,
            transformResponse: unwrapData,
            providesTags: ["EmailStatus"],
        }),
        sendTestEmail: builder.mutation({
            query: (to) => ({ url: `${ADMIN_URL}/email/test`, method: "POST", body: { to } }),
        }),
    }),
});

export const { useGetDashboardQuery, useUploadImagesMutation, useGetEmailStatusQuery, useSendTestEmailMutation } = adminApi;
