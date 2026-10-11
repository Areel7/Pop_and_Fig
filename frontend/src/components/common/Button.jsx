import { Link } from "react-router";
import Spinner from "./Spinner.jsx";

const VARIANTS = {
    primary: "bg-button text-on-button hover:opacity-85",
    outline: "border border-primary text-primary hover:bg-primary hover:text-on-primary",
    ghost: "text-foreground hover:bg-black/5",
    accent: "bg-accent text-on-accent hover:opacity-90",
    light: "bg-white text-neutral-900 hover:bg-neutral-100",
    danger: "bg-red-700 text-white hover:bg-red-800",
    "danger-outline": "border border-red-300 text-red-700 hover:bg-red-50",
};

const SIZES = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-11 px-5 text-sm",
    lg: "min-h-13 px-7 text-sm",
    icon: "size-10",
};

const buttonClasses = ({ variant = "primary", size = "md", block = false, pill = false, className = "" } = {}) =>
    [
        "inline-flex items-center justify-center gap-2 font-button font-semibold tracking-wide whitespace-nowrap transition",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        pill ? "rounded-full" : "rounded-none",
        block ? "w-full" : "",
        className,
    ].join(" ");

function Button({ variant, size, block, pill, loading = false, className, children, type = "button", disabled, ...props }) {
    return (
        <button
            type={type}
            className={buttonClasses({ variant, size, block, pill, className })}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading && <Spinner className="size-4" />}
            {children}
        </button>
    );
}

export function ButtonLink({ variant, size, block, pill, className, children, ...props }) {
    return (
        <Link className={buttonClasses({ variant, size, block, pill, className })} {...props}>
            {children}
        </Link>
    );
}

export default Button;
