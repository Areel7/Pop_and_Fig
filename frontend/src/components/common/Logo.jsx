import { Link } from "react-router";
import { useSettings } from "../../hooks/useSettings.js";
import { brandParts } from "../../utils/format.js";

function Logo({ className = "", onClick, to = "/" }) {
    const { settings } = useSettings();
    const { first, rest } = brandParts(settings.store?.name);
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`shrink-0 font-heading font-extrabold tracking-tight whitespace-nowrap transition hover:opacity-65 ${className}`}
            aria-label={`${settings.store?.name || "Pop & Figs"} home`}
        >
            {first}
            <span className="font-normal">{rest}</span>
        </Link>
    );
}

export default Logo;
