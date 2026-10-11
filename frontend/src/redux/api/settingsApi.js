import { apiSlice, unwrapData } from "./apiSlice.js";
import { ADMIN_URL, SETTINGS_URL } from "../constant.js";

export const settingsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getSettings: builder.query({
            query: () => SETTINGS_URL,
            transformResponse: unwrapData,
            providesTags: ["Settings"],
        }),
        updateSettings: builder.mutation({
            query: (data) => ({ url: `${ADMIN_URL}/settings`, method: "PATCH", body: data }),
            transformResponse: unwrapData,
            // Write the saved settings straight into the cache so the theme updates immediately.
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(settingsApi.util.upsertQueryData("getSettings", undefined, data));
                } catch {
                    // error is surfaced by the calling component
                }
            },
            invalidatesTags: ["Cart"],
        }),
    }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
