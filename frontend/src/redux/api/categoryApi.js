import { apiSlice, unwrapData } from "./apiSlice.js";
import { CATEGORY_URL } from "../constant.js";

export const categoryApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Pass { status: "all" } from the admin panel to include inactive categories.
        getCategories: builder.query({
            query: (params) => ({ url: CATEGORY_URL, params: params || undefined }),
            transformResponse: unwrapData,
            providesTags: (result = []) => [{ type: "Category", id: "LIST" }, ...result.map((c) => ({ type: "Category", id: c._id }))],
        }),
        getCategory: builder.query({
            query: (idOrSlug) => `${CATEGORY_URL}/${idOrSlug}`,
            transformResponse: unwrapData,
            providesTags: (result, error, id) => [{ type: "Category", id: result?._id || id }],
        }),
        createCategory: builder.mutation({
            query: (data) => ({ url: CATEGORY_URL, method: "POST", body: data }),
            transformResponse: unwrapData,
            invalidatesTags: [{ type: "Category", id: "LIST" }],
        }),
        updateCategory: builder.mutation({
            query: ({ id, ...data }) => ({ url: `${CATEGORY_URL}/${id}`, method: "PATCH", body: data }),
            transformResponse: unwrapData,
            // Activating/deactivating a category changes which products customers can see.
            invalidatesTags: (result, error, { id }) => [{ type: "Category", id }, { type: "Category", id: "LIST" }, { type: "Product", id: "LIST" }],
        }),
        deleteCategory: builder.mutation({
            query: (id) => ({ url: `${CATEGORY_URL}/${id}`, method: "DELETE" }),
            invalidatesTags: [{ type: "Category", id: "LIST" }],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
} = categoryApi;
