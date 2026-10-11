import { Link } from "react-router";
import { Check, Circle, X } from "lucide-react";
import { formatPrice, capitalize, formatDateTime, resolveImageUrl } from "../../utils/format.js";

const STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    confirmed: "bg-sky-50 text-sky-800 ring-sky-200",
    processing: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    shipped: "bg-violet-50 text-violet-800 ring-violet-200",
    delivered: "bg-teal-50 text-teal-800 ring-teal-200",
    completed: "bg-green-50 text-green-800 ring-green-200",
    cancelled: "bg-red-50 text-red-800 ring-red-200",
    // payment + email states
    paid: "bg-green-50 text-green-800 ring-green-200",
    refunded: "bg-neutral-100 text-neutral-700 ring-neutral-200",
    sent: "bg-green-50 text-green-800 ring-green-200",
    failed: "bg-red-50 text-red-800 ring-red-200",
    not_sent: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    active: "bg-green-50 text-green-800 ring-green-200",
    inactive: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    blocked: "bg-red-50 text-red-800 ring-red-200",
    published: "bg-green-50 text-green-800 ring-green-200",
    hidden: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export function StatusBadge({ status, label, className = "" }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${
                STATUS_STYLES[status] || "bg-neutral-100 text-neutral-700 ring-neutral-200"
            } ${className}`}
        >
            {label || capitalize(String(status || "").replace(/_/g, " "))}
        </span>
    );
}

export function OrderItemsList({ items, linkProducts = true }) {
    return (
        <ul className="divide-y divide-neutral-200">
            {items.map((item, index) => (
                <li key={`${item.product}-${index}`} className="flex gap-4 py-4">
                    <div className="size-16 shrink-0 overflow-hidden bg-secondary sm:size-20">
                        {item.image ? (
                            <img src={resolveImageUrl(item.image)} alt="" className="size-full object-cover" loading="lazy" />
                        ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                            {linkProducts && item.slug ? (
                                <Link to={`/product/${item.slug}`} className="font-medium break-words hover:underline">
                                    {item.name}
                                </Link>
                            ) : (
                                <p className="font-medium break-words">{item.name}</p>
                            )}
                            <p className="mt-1 text-xs text-neutral-500">
                                {item.quantity} × {formatPrice(item.unitPrice)}
                                {item.unitPrice < item.originalPrice && <del className="ml-1.5">{formatPrice(item.originalPrice)}</del>}
                                {item.sku && <span className="ml-2">SKU {item.sku}</span>}
                            </p>
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap">{formatPrice(item.lineTotal)}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// Subtotal + Shipping = Total (all PKR, calculated by the backend). Sale prices are already in the
// subtotal, so any saving is shown as a note rather than a line in the sum.
export function TotalsTable({ subtotal, savings, shipping, total, className = "" }) {
    const row = "flex items-center justify-between gap-4 py-1.5 text-sm";
    return (
        <dl className={className}>
            <div className={row}>
                <dt className="text-neutral-600">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className={row}>
                <dt className="text-neutral-600">Shipping</dt>
                <dd>{shipping > 0 ? formatPrice(shipping) : "Free"}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-neutral-900 pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-lg font-semibold">{formatPrice(total)}</dd>
            </div>
            {savings > 0 && (
                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-green-700">
                    <dt>You save with sale prices</dt>
                    <dd>{formatPrice(savings)}</dd>
                </div>
            )}
        </dl>
    );
}

// Vertical timeline built from the order's statusHistory.
export function OrderTimeline({ history = [], currentStatus }) {
    const flow = ["pending", "confirmed", "processing", "shipped", "delivered", "completed"];
    const reached = new Map(history.map((h) => [h.status, h]));
    const steps = currentStatus === "cancelled" ? [...history.map((h) => h.status)] : flow;
    const uniqueSteps = [...new Set(steps)];

    return (
        <ol className="relative">
            {uniqueSteps.map((status, index) => {
                const entry = reached.get(status);
                const done = Boolean(entry);
                const cancelled = status === "cancelled";
                return (
                    <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < uniqueSteps.length - 1 && (
                            <span className={`absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px ${done ? "bg-neutral-900" : "bg-neutral-200"}`} aria-hidden="true" />
                        )}
                        <span
                            className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ${
                                cancelled ? "bg-red-600 text-white" : done ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-300"
                            }`}
                            aria-hidden="true"
                        >
                            {cancelled ? <X className="size-3.5" /> : done ? <Check className="size-3.5" /> : <Circle className="size-2" />}
                        </span>
                        <div className="min-w-0 pt-0.5">
                            <p className={`text-sm font-medium ${done ? "" : "text-neutral-400"}`}>
                                {capitalize(status)}
                                <span className="sr-only">{done ? " — reached" : " — not reached"}</span>
                            </p>
                            {entry && <p className="text-xs text-neutral-500">{formatDateTime(entry.changedAt)}</p>}
                            {entry?.note && <p className="mt-0.5 text-xs text-neutral-600">{entry.note}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
