import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontal, X } from "lucide-react";
import Container from "../common/Container.jsx";
import Button from "../common/Button.jsx";
import Pagination from "../common/Pagination.jsx";
import { EmptyState, ErrorState } from "../common/Feedback.jsx";
import { ProductGrid } from "./ProductCard.jsx";
import { useGetPriceRangeQuery, useGetProductsQuery } from "../../redux/api/productApi.js";
import { useGetCategoriesQuery } from "../../redux/api/categoryApi.js";
import { useEscapeKey, useLockBodyScroll } from "../../hooks/useCommon.js";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
    ["newest", "Newest"],
    ["popular", "Best selling"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
    ["rating", "Top rated"],
    ["name", "Name A–Z"],
];

const FILTER_KEYS = ["category", "minPrice", "maxPrice", "onSale", "inStock", "condition", "featured"];

function FilterGroup({ title, children }) {
    return (
        <fieldset className="border-b border-neutral-200 py-6 first:pt-0">
            <legend className="mb-4 text-[11px] font-bold tracking-[0.14em] uppercase">{title}</legend>
            <div className="space-y-2.5">{children}</div>
        </fieldset>
    );
}

function RadioOption({ name, value, current, onChange, children }) {
    return (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700 hover:text-foreground">
            <input
                type="radio"
                name={name}
                checked={current === value}
                onChange={() => onChange(value)}
                className="size-4 accent-neutral-900"
            />
            {children}
        </label>
    );
}

function CheckOption({ checked, onChange, children }) {
    return (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700 hover:text-foreground">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-neutral-900" />
            {children}
        </label>
    );
}

// Min/max inputs keep their own draft state and only update the URL when applied.
function PriceFilter({ min, max, onApply, range }) {
    const [draft, setDraft] = useState({ min: min || "", max: max || "" });
    const apply = (event) => {
        event.preventDefault();
        onApply(draft.min, draft.max);
    };
    return (
        <form onSubmit={apply} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-neutral-500">
                    Min (₨)
                    <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={draft.min}
                        placeholder={range ? String(range.min) : "0"}
                        onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
                        className="mt-1 block w-full border border-neutral-300 px-2.5 py-2 text-sm text-foreground focus:border-neutral-900 focus:outline-none"
                    />
                </label>
                <label className="text-xs text-neutral-500">
                    Max (₨)
                    <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={draft.max}
                        placeholder={range ? String(range.max) : "Any"}
                        onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
                        className="mt-1 block w-full border border-neutral-300 px-2.5 py-2 text-sm text-foreground focus:border-neutral-900 focus:outline-none"
                    />
                </label>
            </div>
            <Button type="submit" variant="outline" size="sm" block>
                Apply price
            </Button>
        </form>
    );
}

function Filters({ params, setParam, hideCategory }) {
    const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: hideCategory });
    const { data: range } = useGetPriceRangeQuery();

    return (
        <div>
            {!hideCategory && (
                <FilterGroup title="Category">
                    <RadioOption name="category" value="" current={params.category || ""} onChange={(v) => setParam("category", v)}>
                        All categories
                    </RadioOption>
                    {categories.map((c) => (
                        <RadioOption key={c._id} name="category" value={c.slug} current={params.category} onChange={(v) => setParam("category", v)}>
                            <span className="flex-1">{c.name}</span>
                            <span className="text-xs text-neutral-400">{c.productCount}</span>
                        </RadioOption>
                    ))}
                </FilterGroup>
            )}
            <FilterGroup title="Price">
                <PriceFilter
                    key={`${params.minPrice || ""}-${params.maxPrice || ""}`}
                    min={params.minPrice}
                    max={params.maxPrice}
                    range={range}
                    onApply={(min, max) => setParam({ minPrice: min, maxPrice: max })}
                />
            </FilterGroup>
            <FilterGroup title="Availability">
                <CheckOption checked={params.onSale === "true"} onChange={(v) => setParam("onSale", v ? "true" : "")}>
                    On sale
                </CheckOption>
                <CheckOption checked={params.inStock === "true"} onChange={(v) => setParam("inStock", v ? "true" : "")}>
                    In stock only
                </CheckOption>
                <CheckOption checked={params.featured === "true"} onChange={(v) => setParam("featured", v ? "true" : "")}>
                    Featured
                </CheckOption>
            </FilterGroup>
            <FilterGroup title="Condition">
                <RadioOption name="condition" value="" current={params.condition || ""} onChange={(v) => setParam("condition", v)}>
                    Any
                </RadioOption>
                <RadioOption name="condition" value="new" current={params.condition} onChange={(v) => setParam("condition", v)}>
                    New
                </RadioOption>
                <RadioOption name="condition" value="used" current={params.condition} onChange={(v) => setParam("condition", v)}>
                    Pre-loved
                </RadioOption>
            </FilterGroup>
        </div>
    );
}

/**
 * Product listing with URL-driven filters, sorting and pagination (all filtering happens on the
 * backend). `fixed` params (e.g. a category slug) are always applied and hidden from the UI.
 */
function ProductBrowser({ fixed = {}, searchTerm, emptyTitle = "No products found", emptyMessage }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const closeDrawer = useCallback(() => setDrawerOpen(false), []);
    useLockBodyScroll(drawerOpen);
    useEscapeKey(drawerOpen, closeDrawer);

    const params = Object.fromEntries(searchParams.entries());
    const page = Math.max(1, Number(params.page) || 1);
    const sort = params.sort || (searchTerm ? "relevance" : "newest");

    const query = {
        ...Object.fromEntries(FILTER_KEYS.map((key) => [key, params[key]])),
        ...fixed,
        search: searchTerm || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
    };
    const { data, isLoading, isFetching, isError, error, refetch } = useGetProductsQuery(query);
    const products = data?.items || [];
    const meta = data?.meta;

    // Accepts (key, value) or an object of updates; any filter change resets to page 1.
    const setParam = (keyOrUpdates, value) => {
        const updates = typeof keyOrUpdates === "string" ? { [keyOrUpdates]: value } : keyOrUpdates;
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, v]) => {
            if (v === "" || v === undefined || v === null) next.delete(key);
            else next.set(key, v);
        });
        if (!("page" in updates)) next.delete("page");
        setSearchParams(next);
    };

    const activeFilters = FILTER_KEYS.filter((key) => params[key] && !(key in fixed));
    const clearFilters = () => {
        const next = new URLSearchParams(searchParams);
        FILTER_KEYS.forEach((key) => next.delete(key));
        next.delete("page");
        setSearchParams(next);
    };

    const filterLabel = (key) =>
        ({
            category: `Category: ${params.category}`,
            minPrice: `Min ${params.minPrice}`,
            maxPrice: `Max ${params.maxPrice}`,
            onSale: "On sale",
            inStock: "In stock",
            featured: "Featured",
            condition: params.condition === "used" ? "Pre-loved" : "New",
        })[key];

    const changePage = (next) => {
        setParam("page", next > 1 ? String(next) : "");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <Container className="py-10 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
                <aside className="hidden lg:block" aria-label="Product filters">
                    <Filters params={params} setParam={setParam} hideCategory={"category" in fixed} />
                </aside>

                <div className="min-w-0">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                        <p className="text-sm text-neutral-600" aria-live="polite">
                            {isLoading ? "Loading products…" : `${meta?.total ?? 0} ${meta?.total === 1 ? "product" : "products"}`}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
                                <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
                                {activeFilters.length > 0 && ` (${activeFilters.length})`}
                            </Button>
                            <label className="sr-only" htmlFor="sort-products">
                                Sort products
                            </label>
                            <select
                                id="sort-products"
                                value={sort}
                                onChange={(e) => setParam("sort", e.target.value)}
                                className="min-h-9 border border-neutral-300 bg-background px-3 text-sm focus:border-neutral-900 focus:outline-none"
                            >
                                {searchTerm && <option value="relevance">Most relevant</option>}
                                {SORT_OPTIONS.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {activeFilters.length > 0 && (
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            {activeFilters.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setParam(key, "")}
                                    className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-neutral-200"
                                    aria-label={`Remove filter ${filterLabel(key)}`}
                                >
                                    {filterLabel(key)} <X className="size-3" aria-hidden="true" />
                                </button>
                            ))}
                            <button type="button" onClick={clearFilters} className="text-xs font-semibold underline underline-offset-4">
                                Clear all
                            </button>
                        </div>
                    )}

                    {isError ? (
                        <ErrorState error={error} onRetry={refetch} />
                    ) : !isLoading && products.length === 0 ? (
                        <EmptyState
                            title={activeFilters.length ? "No products match these filters" : emptyTitle}
                            message={activeFilters.length ? "Try removing a filter or widening the price range." : emptyMessage}
                            action={
                                activeFilters.length > 0 && (
                                    <Button variant="outline" onClick={clearFilters}>
                                        Clear filters
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <div className={`transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`}>
                            <ProductGrid products={products} loading={isLoading} skeletonCount={PAGE_SIZE} className="md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4" />
                        </div>
                    )}

                    <Pagination page={page} pages={meta?.pages || 1} onChange={changePage} className="mt-14" />
                </div>
            </div>

            {drawerOpen && (
                <div className="fixed inset-0 z-[70] lg:hidden">
                    <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={closeDrawer} aria-hidden="true" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Filters"
                        className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] animate-slide-in-left flex-col bg-background"
                    >
                        <div className="flex min-h-16 items-center justify-between border-b border-neutral-200 px-5">
                            <p className="font-semibold">Filters</p>
                            <button type="button" onClick={closeDrawer} className="flex size-10 items-center justify-center hover:bg-black/5" aria-label="Close filters">
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <Filters params={params} setParam={setParam} hideCategory={"category" in fixed} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-neutral-200 p-4">
                            <Button variant="outline" onClick={clearFilters}>
                                Clear
                            </Button>
                            <Button onClick={closeDrawer}>Show {meta?.total ?? ""} results</Button>
                        </div>
                    </div>
                </div>
            )}
        </Container>
    );
}

export default ProductBrowser;
