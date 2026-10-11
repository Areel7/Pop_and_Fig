import { apiSlice, unwrapData, unwrapList } from "./apiSlice.js";
import { ADMIN_URL, PRODUCT_URL, REVIEW_URL } from "../constant.js";

// Review changes also change the product's rating aggregate, so products are invalidated too.
const afterReviewChange = (productId) => [
    { type: "Review", id: "LIST" },
    { type: "Review", id: "MINE" },
    { type: "Review", id: `PRODUCT-${productId}` },
    { type: "Product", id: productId },
    { type: "Product", id: "LIST" },
    "Dashboard",
];

export const reviewApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getRecentReviews: builder.query({
            query: (limit = 6) => ({ url: REVIEW_URL, params: { limit } }),
            transformResponse: unwrapData,
            providesTags: [{ type: "Review", id: "LIST" }],
        }),
        getProductReviews: builder.query({
            query: ({ productId, page = 1, limit = 10 }) => ({ url: `${PRODUCT_URL}/${productId}/reviews`, params: { page, limit } }),
            transformResponse: (response) => ({ ...response.data, meta: response.meta }),
            providesTags: (result, error, { productId }) => [{ type: "Review", id: `PRODUCT-${productId}` }],
        }),
        createReview: builder.mutation({
            query: ({ productId, ...data }) => ({ url: `${PRODUCT_URL}/${productId}/reviews`, method: "POST", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: (result, error, { productId }) => afterReviewChange(productId),
        }),
        updateReview: builder.mutation({
            query: ({ id, rating, title, comment }) => ({ url: `${REVIEW_URL}/${id}`, method: "PATCH", body: { rating, title, comment } }),
            transformResponse: unwrapData,
            invalidatesTags: (result, error, { productId }) => afterReviewChange(productId),
        }),
        deleteReview: builder.mutation({
            query: ({ id }) => ({ url: `${REVIEW_URL}/${id}`, method: "DELETE" }),
            invalidatesTags: (result, error, { productId }) => afterReviewChange(productId),
        }),

        // Admin
        getAdminReviews: builder.query({
            query: (params) => ({ url: `${ADMIN_URL}/reviews`, params }),
            transformResponse: unwrapList,
            providesTags: [{ type: "Review", id: "LIST" }],
        }),
        moderateReview: builder.mutation({
            query: ({ id, status }) => ({ url: `${ADMIN_URL}/reviews/${id}`, method: "PATCH", body: { status } }),
            invalidatesTags: (result, error, { productId }) => afterReviewChange(productId),
        }),
        adminDeleteReview: builder.mutation({
            query: ({ id }) => ({ url: `${ADMIN_URL}/reviews/${id}`, method: "DELETE" }),
            invalidatesTags: (result, error, { productId }) => afterReviewChange(productId),
        }),
    }),
});

export const {
    useGetRecentReviewsQuery,
    useGetProductReviewsQuery,
    useCreateReviewMutation,
    useUpdateReviewMutation,
    useDeleteReviewMutation,
    useGetAdminReviewsQuery,
    useModerateReviewMutation,
    useAdminDeleteReviewMutation,
} = reviewApi;
