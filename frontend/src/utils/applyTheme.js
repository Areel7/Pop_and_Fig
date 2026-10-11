import { contrastText, DEFAULT_THEME, DEFAULT_TYPOGRAPHY, fontStack, googleFontsUrl, safeColor } from "./theme.js";

export const THEME_CACHE_KEY = "pf-theme";

// Applies admin-configured colors and fonts as CSS variables. Values are validated hex colors and
// whitelisted font names, so no arbitrary CSS can be injected.
export const applyTheme = ({ theme = {}, typography = {}, fonts = [] } = {}) => {
    const colors = Object.fromEntries(Object.entries(DEFAULT_THEME).map(([key, fallback]) => [key, safeColor(theme[key], fallback)]));
    const type = { ...DEFAULT_TYPOGRAPHY, ...typography };
    const root = document.documentElement.style;

    root.setProperty("--pf-primary", colors.primaryColor);
    root.setProperty("--pf-primary-contrast", contrastText(colors.primaryColor));
    root.setProperty("--pf-secondary", colors.secondaryColor);
    root.setProperty("--pf-accent", colors.accentColor);
    root.setProperty("--pf-accent-contrast", contrastText(colors.accentColor));
    root.setProperty("--pf-background", colors.backgroundColor);
    root.setProperty("--pf-text", colors.textColor);
    root.setProperty("--pf-button", colors.buttonColor);
    root.setProperty("--pf-button-text", contrastText(colors.buttonColor));
    root.setProperty("--pf-font-heading", fontStack(type.headingFont, fonts));
    root.setProperty("--pf-font-body", fontStack(type.bodyFont, fonts));
    root.setProperty("--pf-font-button", fontStack(type.buttonFont, fonts));

    const href = googleFontsUrl(["Inter", type.headingFont, type.bodyFont, type.buttonFont], fonts);
    const link = document.getElementById("pf-fonts");
    if (href && link && link.getAttribute("href") !== href) link.setAttribute("href", href);

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.primaryColor);
};

// Applies the last known theme synchronously before React renders (no flash of default styles).
export const applyCachedTheme = () => {
    try {
        const cached = JSON.parse(localStorage.getItem(THEME_CACHE_KEY));
        if (cached) applyTheme(cached);
    } catch {
        // ignore corrupt cache
    }
};

export const cacheTheme = (snapshot) => {
    try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
        // ignore
    }
};
