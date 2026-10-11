import { useGetSettingsQuery } from "../redux/api/settingsApi.js";

const FALLBACK = {
    store: { name: "Pop & Figs", tagline: "", email: "", phone: "", address: "" },
    hero: {},
    promo: { enabled: false },
    social: {},
    shipping: { flatRate: 0, freeShippingThreshold: 0 },
    fonts: [],
};

// Public store settings (served from the RTK Query cache after the first request).
// Prices are always PKR — use formatPrice from utils/format.js to display them.
export const useSettings = () => {
    const { data, ...rest } = useGetSettingsQuery();
    return { settings: data || FALLBACK, ...rest };
};
