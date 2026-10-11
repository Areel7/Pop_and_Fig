import { useEffect } from "react";
import { useGetSettingsQuery } from "../../redux/api/settingsApi.js";
import { applyTheme, cacheTheme } from "../../utils/applyTheme.js";

// Keeps the storefront theme in sync with Admin Settings (and caches it for the next page load).
function ThemeManager() {
    const { data } = useGetSettingsQuery();

    useEffect(() => {
        if (!data) return;
        const snapshot = { theme: data.theme, typography: data.typography, fonts: data.fonts };
        applyTheme(snapshot);
        cacheTheme(snapshot);
    }, [data]);

    return null;
}

export default ThemeManager;
