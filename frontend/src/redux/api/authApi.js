import { apiSlice, unwrapData } from "./apiSlice.js";
import { AUTH_URL } from "../constant.js";
import { setCredentials } from "../features/auth/authSlice.js";

// After any successful sign-in: cache the profile and refetch data whose content depends on who is
// signed in (review eligibility, wishlist, orders, admin-only product visibility).
const onSignedIn = async (arg, { dispatch, queryFulfilled }) => {
    try {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data));
        dispatch(apiSlice.util.invalidateTags(["Me", "Review", "Wishlist", "Order", "Product", "Category"]));
    } catch {
        // errors are handled by the calling form
    }
};

export const authApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        register: builder.mutation({
            query: (data) => ({ url: `${AUTH_URL}/register`, method: "POST", body: data }),
            transformResponse: unwrapData,
            onQueryStarted: onSignedIn,
        }),
        login: builder.mutation({
            query: (data) => ({ url: `${AUTH_URL}/login`, method: "POST", body: data }),
            transformResponse: unwrapData,
            onQueryStarted: onSignedIn,
        }),
        adminLogin: builder.mutation({
            query: (data) => ({ url: `${AUTH_URL}/admin/login`, method: "POST", body: data }),
            transformResponse: unwrapData,
            onQueryStarted: onSignedIn,
        }),
        logout: builder.mutation({
            query: () => ({ url: `${AUTH_URL}/logout`, method: "POST" }),
        }),
        getMe: builder.query({
            query: () => `${AUTH_URL}/me`,
            transformResponse: unwrapData,
            providesTags: ["Me"],
            // Keep the cached profile (name, phone, address) in sync with the server.
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setCredentials(data));
                } catch {
                    // 401 is handled globally
                }
            },
        }),
        forgotPassword: builder.mutation({
            query: (data) => ({ url: `${AUTH_URL}/forgot-password`, method: "POST", body: data }),
        }),
        resetPassword: builder.mutation({
            query: (data) => ({ url: `${AUTH_URL}/reset-password`, method: "POST", body: data }),
        }),
    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useAdminLoginMutation,
    useLogoutMutation,
    useGetMeQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
} = authApi;
