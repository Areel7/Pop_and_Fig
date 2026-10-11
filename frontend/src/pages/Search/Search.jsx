import { useState } from "react";
import { useSearchParams } from "react-router";
import { Search as SearchIcon, X } from "lucide-react";
import Container from "../../components/common/Container.jsx";
import ProductBrowser from "../../components/products/ProductBrowser.jsx";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function SearchForm({ initial, onSubmit }) {
    const [value, setValue] = useState(initial);
    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(value.trim());
            }}
            className="flex items-center border-b-2 border-neutral-900"
        >
            <SearchIcon className="size-6 shrink-0 text-neutral-400 sm:size-7" aria-hidden="true" />
            <label htmlFor="search-input" className="sr-only">
                Search products
            </label>
            <input
                id="search-input"
                type="search"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search by name, SKU, tag or category…"
                className="min-w-0 flex-1 bg-transparent px-3 py-4 font-heading text-2xl tracking-tight outline-none placeholder:text-neutral-300 sm:text-4xl [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => {
                        setValue("");
                        onSubmit("");
                    }}
                    className="flex size-10 items-center justify-center text-neutral-500 hover:text-foreground"
                    aria-label="Clear search"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            )}
            <button type="submit" className="ml-2 min-h-11 bg-button px-5 font-button text-sm font-semibold text-on-button">
                Search
            </button>
        </form>
    );
}

function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const term = (searchParams.get("q") || "").trim();
    useDocumentTitle(term ? `Search: ${term}` : "Search");

    const submit = (value) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set("q", value);
        else next.delete("q");
        next.delete("page");
        next.delete("sort");
        setSearchParams(next);
    };

    return (
        <>
            <div className="border-b border-neutral-200 bg-secondary/60">
                <Container className="py-10 sm:py-14">
                    <p className="mb-5 text-[10px] font-bold tracking-[0.18em] text-neutral-500">SEARCH</p>
                    <SearchForm key={term} initial={term} onSubmit={submit} />
                    {term && (
                        <p className="mt-4 text-sm text-neutral-600">
                            Results for <strong className="text-foreground">“{term}”</strong>
                        </p>
                    )}
                </Container>
            </div>
            <ProductBrowser
                searchTerm={term}
                emptyTitle={term ? `Nothing found for “${term}”` : "Start typing to search"}
                emptyMessage={term ? "Check the spelling or try a broader term." : "Search across product names, descriptions, SKUs, tags and categories."}
            />
        </>
    );
}

export default Search;
