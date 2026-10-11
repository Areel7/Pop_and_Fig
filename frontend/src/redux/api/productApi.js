import { apiSlice, unwrapData, unwrapList } from "./apiSlice.js";
import { PRODUCT_URL } from "../constant.js";

const cleanParams = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));

export const productApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getProducts: builder.query({
            query: (params) => ({ url: PRODUCT_URL, params: cleanParams(params) }),
            transformResponse: unwrapList,
            providesTags: (result) => [
                { type: "Product", id: "LIST" },
                ...(result?.items || []).map((p) => ({ type: "Product", id: p._id })),
            ],
        }),
        getPriceRange: builder.query({
            query: () => `${PRODUCT_URL}/price-range`,
            transformResponse: unwrapData,
            providesTags: [{ type: "Product", id: "LIST" }],
        }),
        getProduct: builder.query({
            query: (idOrSlug) => `${PRODUCT_URL}/${idOrSlug}`,
            transformResponse: unwrapData,
            providesTags: (result, error, id) => [{ type: "Product", id: result?._id || id }],
        }),
        createProduct: builder.mutation({
            query: (data) => ({ url: PRODUCT_URL, method: "POST", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: [{ type: "Product", id: "LIST" }, "Category", "Dashboard"],
        }),
        updateProduct: builder.mutation({
            query: ({ id, ...data }) => ({ url: `${PRODUCT_URL}/${id}`, method: "PATCH", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: (result, error, { id }) => [{ type: "Product", id }, { type: "Product", id: "LIST" }, "Category", "Wishlist", "Cart"],
        }),
        deleteProduct: builder.mutation({
            query: (id) => ({ url: `${PRODUCT_URL}/${id}`, method: "DELETE" }),
            invalidatesTags: (result, error, id) => [
                { type: "Product", id },
                { type: "Product", id: "LIST" },
                "Category",
                "Wishlist",
                "Cart",
                "Review",
                "Dashboard",
            ],
        }),
    }),
});

export const {
    useGetProductsQuery,
    useGetPriceRangeQuery,
    useGetProductQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
} = productApi;
