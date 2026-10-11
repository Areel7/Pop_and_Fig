import { Search } from "lucide-react";
import { Skeleton } from "../common/Feedback.jsx";

export function AdminPageHeader({ title, description, actions }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Card({ title, description, actions, children, className = "", bodyClassName = "p-5 sm:p-6" }) {
    return (
        <section className={`min-w-0 rounded-xl border border-neutral-200 bg-white ${className}`}>
            {(title || actions) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        {title && <h2 className="text-base font-semibold">{title}</h2>}
                        {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export function StatCard({ label, value, icon: Icon, hint, tone = "neutral" }) {
    const tones = {
        neutral: "bg-neutral-100 text-neutral-700",
        amber: "bg-amber-50 text-amber-700",
        green: "bg-green-50 text-green-700",
        accent: "bg-secondary text-neutral-800",
    };
    return (
        <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">{label}</p>
                {Icon && (
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
                        <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                )}
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">{value}</p>
            {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
        </div>
    );
}

export function SearchInput({ value, onChange, placeholder = "Search…", label = "Search", className = "" }) {
    return (
        <div className={`relative ${className}`}>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="block w-full rounded-lg border border-neutral-300 bg-white py-2.5 pr-3 pl-10 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-accent/30 focus:outline-none"
            />
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        </div>
    );
}

export function FilterSelect({ value, onChange, label, children, className = "" }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className={`rounded-lg border border-neutral-300 bg-white py-2.5 pr-8 pl-3 text-sm focus:border-neutral-900 focus:ring-2 focus:ring-accent/30 focus:outline-none ${className}`}
        >
            {children}
        </select>
    );
}

// Tables scroll horizontally on small screens instead of breaking the layout.
export function Table({ children, minWidth = "min-w-[720px]" }) {
    return (
        <div className="relative overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className={`w-full ${minWidth} text-left text-sm`}>{children}</table>
        </div>
    );
}

export const th = "border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase whitespace-nowrap";
export const td = "border-b border-neutral-100 px-4 py-3 align-middle";

export function TableSkeleton({ rows = 6, cols = 5 }) {
    return (
        <tbody aria-hidden="true">
            {Array.from({ length: rows }, (_, r) => (
                <tr key={r}>
                    {Array.from({ length: cols }, (_, c) => (
                        <td key={c} className={td}>
                            <Skeleton className="h-4 w-full max-w-[160px]" />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    );
}

export function IconButton({ label, icon: Icon, onClick, tone = "neutral", disabled, to, as: As }) {
    const tones = {
        neutral: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        danger: "text-red-600 hover:bg-red-50 hover:text-red-700",
    };
    const className = `inline-flex size-9 items-center justify-center rounded-lg transition disabled:opacity-40 ${tones[tone]}`;
    if (As) {
        return (
            <As to={to} className={className} aria-label={label} title={label}>
                <Icon className="size-4" aria-hidden="true" />
            </As>
        );
    }
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={className} aria-label={label} title={label}>
            <Icon className="size-4" aria-hidden="true" />
        </button>
    );
}
