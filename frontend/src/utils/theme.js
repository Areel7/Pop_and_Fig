export const DEFAULT_THEME = {
    primaryColor: "#111111",
    secondaryColor: "#f5f1eb",
    accentColor: "#d4a373",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    buttonColor: "#111111",
};

export const DEFAULT_TYPOGRAPHY = { headingFont: "Inter", bodyFont: "Inter", buttonFont: "Inter" };

const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;

const toRgb = (hex) => {
    let value = hex.replace("#", "");
    if (value.length === 3) value = value.split("").map((c) => c + c).join("");
    const int = Number.parseInt(value, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const luminance = (hex) => {
    const [r, g, b] = toRgb(hex).map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Black or white text, whichever contrasts better with the given background.
export const contrastText = (hex) => (HEX.test(hex) && luminance(hex) > 0.4 ? "#111111" : "#ffffff");

export const safeColor = (value, fallback) => (HEX.test(value || "") ? value : fallback);

// Builds a Google Fonts css2 URL containing only whitelisted families and weights.
export const googleFontsUrl = (families, fontOptions = []) => {
    const unique = [...new Set(families.filter(Boolean))];
    const params = unique
        .map((name) => {
            const option = fontOptions.find((f) => f.name === name);
            if (!option && name !== "Inter") return null;
            const weights = (option?.weights || [400, 500, 600, 700, 800]).join(";");
            return `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@${weights}`;
        })
        .filter(Boolean);
    return params.length ? `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap` : null;
};

export const fontStack = (name, fontOptions = []) => {
    const option = fontOptions.find((f) => f.name === name);
    return `"${option ? option.name : "Inter"}"`;
};
