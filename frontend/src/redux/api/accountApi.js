import { apiSlice, unwrapData } from "./apiSlice.js";
import { USER_URL } from "../constant.js";

// The signed-in customer's own profile, password, wishlist and reviews.
export const accountApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        updateProfile: builder.mutation({
            query: (data) => ({ url: `${USER_URL}/profile`, method: "PATCH", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: ["Me"],
        }),
        changePassword: builder.mutation({
            query: (data) => ({ url: `${USER_URL}/password`, method: "PATCH", body: data }),
        }),
        getWishlist: builder.query({
            query: () => `${USER_URL}/wishlist`,
            transformResponse: unwrapData,
            providesTags: ["Wishlist"],
        }),
        addToWishlist: builder.mutation({
            query: (product) => ({ url: `${USER_URL}/wishlist`, method: "POST", body: { productId: product._id } }),
            // Optimistic: the heart fills instantly, rolled back if the request fails.
            async onQueryStarted(product, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    accountApi.util.updateQueryData("getWishlist", undefined, (draft) => {
                        if (!draft.some((p) => p._id === product._id)) draft.unshift(product);
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: ["Wishlist"],
        }),
        removeFromWishlist: builder.mutation({
            query: (productId) => ({ url: `${USER_URL}/wishlist/${productId}`, method: "DELETE" }),
            async onQueryStarted(productId, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    accountApi.util.updateQueryData("getWishlist", undefined, (draft) => draft.filter((p) => p._id !== productId))
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: ["Wishlist"],
        }),
        getMyReviews: builder.query({
            query: () => `${USER_URL}/reviews`,
            transformResponse: unwrapData,
            providesTags: (result = []) => [{ type: "Review", id: "MINE" }, ...result.map((r) => ({ type: "Review", id: r._id }))],
        }),
    }),
});

export const {
    useUpdateProfileMutation,
    useChangePasswordMutation,
    useGetWishlistQuery,
    useAddToWishlistMutation,
    useRemoveFromWishlistMutation,
    useGetMyReviewsQuery,
} = accountApi;
