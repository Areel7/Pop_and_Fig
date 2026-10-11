import { useEffect, useState } from "react";
import { useSettings } from "./useSettings.js";

export const useDebounce = (value, delay = 350) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

export const useDocumentTitle = (title) => {
    const { settings } = useSettings();
    const storeName = settings.store?.name || "Pop & Figs";
    useEffect(() => {
        document.title = title ? `${title} · ${storeName}` : storeName;
    }, [title, storeName]);
};

// Locks page scroll while a drawer/modal is open.
export const useLockBodyScroll = (locked) => {
    useEffect(() => {
        if (!locked) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [locked]);
};

export const useEscapeKey = (active, handler) => {
    useEffect(() => {
        if (!active) return undefined;
        const onKey = (event) => {
            if (event.key === "Escape") handler();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [active, handler]);
};
