import { BASE_URL } from "../redux/constant.js";

// The store currency is Pakistani Rupees (PKR) by business rule. Prices are plain numbers everywhere;
// this is the single formatter that adds the currency for display: 2500 -> "₨ 2,500".
export const CURRENCY = "PKR";
export const CURRENCY_SYMBOL = "₨";

const priceNumber = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatPrice = (value) => `${CURRENCY_SYMBOL} ${priceNumber.format(Number(value) || 0)}`;

// Short form for chart axes: 125000 -> "₨ 125K".
export const formatPriceCompact = (value) => `${CURRENCY_SYMBOL} ${compactNumber.format(Number(value) || 0)}`;

export const formatDate = (value, options = { year: "numeric", month: "short", day: "numeric" }) =>
    value ? new Date(value).toLocaleDateString("en-US", options) : "—";

export const formatDateTime = (value) =>
    value
        ? new Date(value).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "—";

// Locally stored uploads are served by the API ("/uploads/..."); prefix the API origin when the
// frontend is deployed separately.
export const resolveImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("/uploads/")) return `${BASE_URL}${url}`;
    return url;
};

export const productImage = (product) => resolveImageUrl(product?.images?.[0]?.url || product?.image || "");

export const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

export const pluralize = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

// "Pop & Figs" renders as POP-AND-FIGS with the first word bold, matching the original brand mark.
export const brandParts = (name = "Pop & Figs") => {
    const words = name.toUpperCase().replace(/\s*&\s*/g, " AND ").trim().split(/\s+/);
    return { first: words[0], rest: words.length > 1 ? `-${words.slice(1).join("-")}` : "" };
};
