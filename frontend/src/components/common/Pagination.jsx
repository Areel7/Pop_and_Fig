import { ChevronLeft, ChevronRight } from "lucide-react";

const pageList = (page, pages) => {
    const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
    const sorted = [...set].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, index) => {
        if (index > 0 && p - sorted[index - 1] > 1) result.push(`gap-${p}`);
        result.push(p);
    });
    return result;
};

function Pagination({ page, pages, onChange, className = "" }) {
    if (!pages || pages <= 1) return null;

    const base = "flex size-10 items-center justify-center text-sm font-medium transition";

    return (
        <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 ${className}`}>
            <button
                type="button"
                className={`${base} hover:bg-black/5 disabled:opacity-30`}
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
            >
                <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            {pageList(page, pages).map((item) =>
                typeof item === "string" ? (
                    <span key={item} className="px-1 text-neutral-400" aria-hidden="true">
                        …
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onChange(item)}
                        aria-current={item === page ? "page" : undefined}
                        className={`${base} ${item === page ? "bg-primary text-on-primary" : "hover:bg-black/5"}`}
                    >
                        {item}
                    </button>
                )
            )}
            <button
                type="button"
                className={`${base} hover:bg-black/5 disabled:opacity-30`}
                onClick={() => onChange(page + 1)}
                disabled={page >= pages}
                aria-label="Next page"
            >
                <ChevronRight className="size-4" aria-hidden="true" />
            </button>
        </nav>
    );
}

export default Pagination;
