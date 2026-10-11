export const DEFAULT_COLORS = {
    primaryColor: "#111111",
    secondaryColor: "#f5f1eb",
    accentColor: "#d4a373",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    buttonColor: "#111111",
};

export const DEFAULT_FONTS = { headingFont: "Inter", bodyFont: "Inter", buttonFont: "Inter" };

export const HEX_PATTERN = /^#(?:[0-9a-f]{3}){1,2}$/i;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the backend: http(s) URLs or site-relative paths ("/shop"), never javascript:/data: URLs.
export const isSafeUrl = (value) => value === "" || /^https?:\/\/\S+$/i.test(value) || /^\/(?!\/)\S*$/.test(value);
export const isFullUrl = (value) => value === "" || /^https?:\/\/[^\s.]+\.\S+$/i.test(value);

// <input type="color"> only understands #rrggbb.
export const toColorInputValue = (hex, fallback = "#000000") => {
    if (!HEX_PATTERN.test(hex || "")) return fallback;
    if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
    return hex.toLowerCase();
};

export const pickKeys = (source = {}, defaults = {}) =>
    Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, source?.[key] ?? fallback]));

// Backend field errors arrive as "theme.primaryColor"; strip the section prefix.
export const sectionFieldErrors = (error, section) =>
    (error?.data?.errors || []).reduce((acc, { field, message }) => {
        const key = String(field || "").replace(new RegExp(`^${section}\\.`), "");
        if (key && !acc[key]) acc[key] = message;
        return acc;
    }, {});

export const trimValues = (values) =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
