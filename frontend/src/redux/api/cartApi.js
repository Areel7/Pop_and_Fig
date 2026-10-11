import { apiSlice, unwrapData } from "./apiSlice.js";
import { CART_URL } from "../constant.js";

export const cartApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Server-calculated unit prices, subtotal, shipping and total (PKR) for the current cart.
        getCartQuote: builder.query({
            query: (items) => ({
                url: `${CART_URL}/quote`,
                method: "POST",
                body: { items: items.map(({ product, quantity }) => ({ product, quantity })) },
            }),
            transformResponse: unwrapData,
            providesTags: ["Cart"],
            keepUnusedDataFor: 30,
        }),
        getServerCart: builder.query({
            query: () => CART_URL,
            transformResponse: unwrapData,
        }),
        saveServerCart: builder.mutation({
            query: (items) => ({
                url: CART_URL,
                method: "PUT",
                body: { items: items.map(({ product, quantity }) => ({ product, quantity })) },
            }),
        }),
    }),
});

export const { useGetCartQuoteQuery, useLazyGetServerCartQuery, useSaveServerCartMutation } = cartApi;
