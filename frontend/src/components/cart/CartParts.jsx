import { Truck } from "lucide-react";
import { formatPrice } from "../../utils/format.js";

export function FreeShippingNote({ quote }) {
    if (!quote || !quote.freeShippingThreshold) return null;
    const reached = quote.amountToFreeShipping <= 0;
    const percent = Math.min(100, Math.round(((quote.freeShippingThreshold - quote.amountToFreeShipping) / quote.freeShippingThreshold) * 100));
    return (
        <div className="text-xs text-neutral-600">
            <p className="flex items-center gap-2">
                <Truck className="size-4 shrink-0" aria-hidden="true" />
                {reached ? "You've unlocked free shipping!" : `Add ${formatPrice(quote.amountToFreeShipping)} more for free shipping`}
            </p>
            <div className="mt-2 h-1 bg-neutral-200" aria-hidden="true">
                <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
