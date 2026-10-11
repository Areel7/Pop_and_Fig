import { useState } from "react";
import { Star } from "lucide-react";

// Read-only star display with an accessible text alternative.
export function StarRating({ rating = 0, count, size = "size-3.5", showValue = false, className = "" }) {
    const value = Math.round(Number(rating) * 2) / 2;
    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span className="inline-flex" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => {
                    const fill = value >= star ? 100 : value >= star - 0.5 ? 50 : 0;
                    return (
                        <span key={star} className={`relative ${size}`}>
                            <Star className={`absolute inset-0 ${size} text-neutral-300`} fill="currentColor" strokeWidth={0} />
                            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                                <Star className={`${size} text-accent`} fill="currentColor" strokeWidth={0} />
                            </span>
                        </span>
                    );
                })}
            </span>
            <span className="sr-only">
                Rated {Number(rating).toFixed(1)} out of 5{count !== undefined ? ` from ${count} reviews` : ""}
            </span>
            {showValue && <span className="text-xs font-semibold" aria-hidden="true">{Number(rating).toFixed(1)}</span>}
            {count !== undefined && (
                <span className="text-xs text-neutral-500" aria-hidden="true">
                    ({count})
                </span>
            )}
        </span>
    );
}

// Keyboard-accessible 1–5 rating input (radio group semantics).
export function RatingInput({ value, onChange, name = "rating", error }) {
    const [hover, setHover] = useState(0);
    const labels = ["Poor", "Fair", "Good", "Very good", "Excellent"];
    return (
        <fieldset>
            <legend className="mb-2 text-sm font-medium">Your rating</legend>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(star)}>
                        <input
                            type="radio"
                            name={name}
                            value={star}
                            checked={value === star}
                            onChange={() => onChange(star)}
                            className="peer sr-only"
                        />
                        <Star
                            className={`size-7 transition peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
                                (hover || value) >= star ? "text-accent" : "text-neutral-300"
                            }`}
                            fill="currentColor"
                            strokeWidth={0}
                            aria-hidden="true"
                        />
                        <span className="sr-only">
                            {star} star{star > 1 ? "s" : ""} — {labels[star - 1]}
                        </span>
                    </label>
                ))}
                <span className="ml-2 text-sm text-neutral-500" aria-hidden="true">
                    {labels[(hover || value) - 1] || ""}
                </span>
            </div>
            {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
        </fieldset>
    );
}
