import { Heart, Minus, Plus } from "lucide-react";
import { formatPrice } from "../../utils/format.js";
import { isDiscounted } from "../../utils/pricing.js";
import { useWishlist } from "../../hooks/useWishlist.js";

// Displays the server-calculated PKR price (finalPrice) with the regular price struck through when discounted.
export function PriceTag({ product, size = "md", className = "" }) {
    const final = product.finalPrice ?? product.price;
    const onSale = isDiscounted(product);
    const sizes = { sm: "text-sm", md: "text-[15px]", lg: "text-2xl sm:text-3xl" };

    return (
        <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
            <span className={`${sizes[size]} font-semibold ${onSale ? "text-red-700" : ""}`}>
                <span className="sr-only">{onSale ? "Sale price " : "Price "}</span>
                {formatPrice(final)}
            </span>
            {onSale && (
                <del className="text-xs text-neutral-500 sm:text-sm">
                    <span className="sr-only">Original price </span>
                    {formatPrice(product.price)}
                </del>
            )}
        </span>
    );
}

export function WishlistButton({ product, className = "", withLabel = false }) {
    const { isSaved, toggle } = useWishlist();
    const saved = isSaved(product._id);
    return (
        <button
            type="button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggle(product);
            }}
            aria-pressed={saved}
            aria-label={withLabel ? undefined : `${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`}
            className={className}
        >
            <Heart className={`size-[18px] transition ${saved ? "fill-current text-red-600" : ""}`} strokeWidth={1.7} aria-hidden="true" />
            {withLabel && <span>{saved ? "Saved" : "Save to wishlist"}</span>}
        </button>
    );
}

export function QuantityStepper({ value, onChange, max = 99, min = 1, disabled = false, label = "Quantity", size = "md" }) {
    const box = size === "sm" ? "size-8" : "size-11";
    return (
        <div className="inline-flex items-center border border-neutral-300" role="group" aria-label={label}>
            <button
                type="button"
                className={`${box} flex items-center justify-center transition hover:bg-black/5 disabled:opacity-30`}
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={disabled || value <= min}
                aria-label="Decrease quantity"
            >
                <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span className={`min-w-9 text-center text-sm font-semibold tabular-nums`} aria-live="polite">
                {value}
            </span>
            <button
                type="button"
                className={`${box} flex items-center justify-center transition hover:bg-black/5 disabled:opacity-30`}
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={disabled || value >= max}
                aria-label="Increase quantity"
            >
                <Plus className="size-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}

export function StockLabel({ stock, className = "" }) {
    if (stock <= 0) return <span className={`text-xs font-medium text-red-700 ${className}`}>Out of stock</span>;
    if (stock <= 5) return <span className={`text-xs font-medium text-amber-700 ${className}`}>Only {stock} left</span>;
    return <span className={`text-xs font-medium text-green-700 ${className}`}>In stock</span>;
}
