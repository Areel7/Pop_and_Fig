import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ExternalLink, Eye, EyeOff, FilterX, Package, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
    useDeleteProductMutation,
    useGetProductsQuery,
    useUpdateProductMutation,
} from "../../../redux/api/productApi.js";
import { useGetCategoriesQuery } from "../../../redux/api/categoryApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { adminPath } from "../../../redux/constant.js";
import {
    AdminPageHeader,
    FilterSelect,
    IconButton,
    SearchInput,
    Table,
    TableSkeleton,
    th,
    td,
} from "../../../components/admin/AdminUI.jsx";
import Button, { ButtonLink } from "../../../components/common/Button.jsx";
import { EmptyState, ErrorState } from "../../../components/common/Feedback.jsx";
import { ConfirmDialog } from "../../../components/common/Modal.jsx";
import Pagination from "../../../components/common/Pagination.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { PriceTag, StockLabel } from "../../../components/products/ProductParts.jsx";
import { useDebounce, useDocumentTitle } from "../../../hooks/useCommon.js";
import { pluralize, productImage } from "../../../utils/format.js";

const LIMIT = 20;
const FILTER_KEYS = ["status", "category", "stock", "onSale", "featured"];
const SORTS = [
    ["newest", "Newest first"],
    ["oldest", "Oldest first"],
    ["name", "Name (A–Z)"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
    ["popular", "Best selling"],
    ["rating", "Top rated"],
];

// Compact on/off switch for table rows (the visible column header is the label; aria-label names the product).
function RowSwitch({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                checked ? "bg-neutral-900" : "bg-neutral-300"
            }`}
        >
            <span className={`inline-block size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </button>
    );
}

function AdminProducts() {
    useDocumentTitle("Products · Admin");
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(search.trim(), 350);
    const [pendingId, setPendingId] = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || ""]));
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery({
        status: filters.status || "all",
        category: filters.category,
        stock: filters.stock,
        onSale: filters.onSale,
        featured: filters.featured,
        search: debouncedSearch,
        sort,
        page,
        limit: LIMIT,
    });
    const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery({ status: "all" });
    const [updateProduct] = useUpdateProductMutation();
    const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();

    const items = data?.items || [];
    const meta = data?.meta || { page: 1, pages: 1, total: 0 };
    const hasFilters = Boolean(debouncedSearch || search.trim() || FILTER_KEYS.some((key) => filters[key]));

    // Any filter change returns to page 1.
    const updateParams = (changes) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                Object.entries(changes).forEach(([key, value]) => {
                    if (value === "" || value === undefined || value === null) next.delete(key);
                    else next.set(key, String(value));
                });
                if (!("page" in changes)) next.delete("page");
                return next;
            },
            { replace: true }
        );
    };

    const handleSearch = (value) => {
        setSearch(value);
        updateParams({ search: value.trim() });
    };

    const clearFilters = () => {
        setSearch("");
        setSearchParams(sort !== "newest" ? { sort } : {}, { replace: true });
    };

    const quickUpdate = async (product, changes, successMessage) => {
        setPendingId(product._id);
        try {
            await updateProduct({ id: product._id, ...changes }).unwrap();
            toast.success(successMessage);
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't update the product"));
        } finally {
            setPendingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteProduct(toDelete._id).unwrap();
            toast.success(`"${toDelete.name}" deleted`);
            if (items.length === 1 && page > 1) updateParams({ page: page - 1 });
            setToDelete(null);
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't delete the product"));
        }
    };

    const firstRow = (meta.page - 1) * LIMIT + 1;
    const lastRow = Math.min(meta.page * LIMIT, meta.total);

    let body;
    if (isLoading) {
        body = (
            <Table minWidth="min-w-[1040px]">
                <TableHead />
                <TableSkeleton rows={8} cols={8} />
            </Table>
        );
    } else if (error && !data) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <ErrorState error={error} title="Couldn't load products" onRetry={refetch} />
            </div>
        );
    } else if (items.length === 0 && hasFilters) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <EmptyState
                    icon={SearchX}
                    title="No products match"
                    message="Try a different search term or remove some filters."
                    action={
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            <FilterX className="size-4" aria-hidden="true" /> Clear filters
                        </Button>
                    }
                />
            </div>
        );
    } else if (items.length === 0) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <EmptyState
                    icon={Package}
                    title="No products yet"
                    message="Add your first product to start selling. You can set prices, stock, images and a sale price."
                    action={
                        <ButtonLink to={adminPath("products/new")}>
                            <Plus className="size-4" aria-hidden="true" /> Add product
                        </ButtonLink>
                    }
                />
            </div>
        );
    } else {
        body = (
            <>
                <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching || undefined}>
                    <Table minWidth="min-w-[1040px]">
                        <TableHead />
                        <tbody>
                            {items.map((product) => (
                                <ProductRow
                                    key={product._id}
                                    product={product}
                                    busy={pendingId === product._id}
                                    onUpdate={quickUpdate}
                                    onDelete={() => setToDelete(product)}
                                />
                            ))}
                        </tbody>
                    </Table>
                </div>
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-sm text-neutral-500" aria-live="polite">
                        Showing {firstRow}–{lastRow} of {pluralize(meta.total, "product")}
                    </p>
                    <Pagination page={meta.page} pages={meta.pages} onChange={(next) => updateParams({ page: next })} />
                </div>
            </>
        );
    }

    return (
        <>
            <AdminPageHeader
                title="Products"
                description={data ? `${pluralize(meta.total, "product")}${hasFilters ? " match your filters" : " in your catalog"}` : "Manage your catalog"}
                actions={
                    <ButtonLink to={adminPath("products/new")}>
                        <Plus className="size-4" aria-hidden="true" /> Add product
                    </ButtonLink>
                }
            />

            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
                <SearchInput
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search by name, SKU or tag…"
                    label="Search products"
                    className="min-w-0 xl:w-72 xl:flex-none"
                />
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <FilterSelect value={filters.status} onChange={(value) => updateParams({ status: value })} label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </FilterSelect>
                    <FilterSelect
                        value={filters.category}
                        onChange={(value) => updateParams({ category: value })}
                        label="Filter by category"
                        className="max-w-full sm:max-w-52"
                    >
                        <option value="">{categoriesLoading ? "Loading categories…" : "All categories"}</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                                {category.name}
                                {category.isActive ? "" : " (inactive)"}
                            </option>
                        ))}
                    </FilterSelect>
                    <FilterSelect value={filters.stock} onChange={(value) => updateParams({ stock: value })} label="Filter by stock level">
                        <option value="">All stock levels</option>
                        <option value="in">In stock</option>
                        <option value="low">Low stock (≤ 5)</option>
                        <option value="out">Out of stock</option>
                    </FilterSelect>
                    <FilterSelect value={filters.onSale} onChange={(value) => updateParams({ onSale: value })} label="Filter by sale">
                        <option value="">Any price</option>
                        <option value="true">On sale</option>
                    </FilterSelect>
                    <FilterSelect value={filters.featured} onChange={(value) => updateParams({ featured: value })} label="Filter by featured">
                        <option value="">Featured or not</option>
                        <option value="true">Featured only</option>
                    </FilterSelect>
                    <FilterSelect
                        value={sort}
                        onChange={(value) => updateParams({ sort: value === "newest" ? "" : value })}
                        label="Sort products"
                    >
                        {SORTS.map(([value, label]) => (
                            <option key={value} value={value}>
                                Sort: {label}
                            </option>
                        ))}
                    </FilterSelect>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="col-span-2 sm:col-span-1">
                            <FilterX className="size-4" aria-hidden="true" /> Clear
                        </Button>
                    )}
                </div>
            </div>

            {body}

            <ConfirmDialog
                open={Boolean(toDelete)}
                onClose={() => !deleting && setToDelete(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Delete product?"
                confirmLabel="Delete product"
                message={
                    toDelete && (
                        <>
                            <p>
                                <strong className="text-neutral-900">{toDelete.name}</strong> will be permanently removed from your catalog, along with its
                                reviews. Past orders keep their own copy of the product details.
                            </p>
                            <p className="mt-2">If you only want to hide it from the store, deactivate it instead.</p>
                        </>
                    )
                }
            />
        </>
    );
}

function TableHead() {
    return (
        <thead>
            <tr>
                <th scope="col" className={th}>Product</th>
                <th scope="col" className={th}>Category</th>
                <th scope="col" className={th}>Price</th>
                <th scope="col" className={th}>Stock</th>
                <th scope="col" className={th}>Status</th>
                <th scope="col" className={th}>Featured</th>
                <th scope="col" className={`${th} text-right`}>Actions</th>
            </tr>
        </thead>
    );
}

function ProductRow({ product, busy, onUpdate, onDelete }) {
    const image = productImage(product);
    const active = product.status === "active";
    const hasSale = product.onSale === true;

    return (
        <tr className="hover:bg-neutral-50">
            <td className={td}>
                <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-secondary">
                        {image ? (
                            <img src={image} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                            <Package className="size-5 text-neutral-400" aria-hidden="true" />
                        )}
                    </div>
                    <div className="min-w-0 max-w-[260px]">
                        <Link to={adminPath(`products/${product._id}/edit`)} className="line-clamp-2 font-medium hover:underline">
                            {product.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {product.sku ? `SKU ${product.sku}` : "No SKU"}
                            {product.condition === "used" && " · Used"}
                        </p>
                    </div>
                </div>
            </td>
            <td className={`${td} whitespace-nowrap`}>
                {product.category ? (
                    <span className={product.category.isActive === false ? "text-neutral-400" : ""}>
                        {product.category.name}
                        {product.category.isActive === false && <span className="ml-1 text-xs">(inactive)</span>}
                    </span>
                ) : (
                    <span className="text-neutral-400">—</span>
                )}
            </td>
            <td className={td}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <PriceTag product={product} size="sm" />
                    {product.discountPercent > 0 && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">{product.discountPercent}% OFF</span>
                    )}
                    {product.discountPercent > 0 && !hasSale && <span className="text-[11px] text-neutral-500">(sale campaign)</span>}
                </div>
                {hasSale && (
                    <button
                        type="button"
                        onClick={() => onUpdate(product, { onSale: false }, `Sale turned off for "${product.name}"`)}
                        disabled={busy}
                        className="mt-1 text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline disabled:opacity-50"
                    >
                        Remove sale
                    </button>
                )}
            </td>
            <td className={td}>
                <p className="font-medium tabular-nums">{product.stock}</p>
                <StockLabel stock={product.stock} />
            </td>
            <td className={td}>
                <StatusBadge status={product.status} />
            </td>
            <td className={td}>
                <RowSwitch
                    checked={Boolean(product.featured)}
                    disabled={busy}
                    label={`Feature ${product.name} on the storefront`}
                    onChange={(featured) =>
                        onUpdate(product, { featured }, featured ? `"${product.name}" is now featured` : `"${product.name}" is no longer featured`)
                    }
                />
            </td>
            <td className={td}>
                <div className="flex items-center justify-end gap-0.5">
                    <a
                        href={`/product/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${product.name} on the store (opens in a new tab)`}
                        title={active ? "View on store" : "View on store (hidden from customers while inactive)"}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                    >
                        <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                    <IconButton
                        label={active ? `Deactivate ${product.name}` : `Activate ${product.name}`}
                        icon={active ? EyeOff : Eye}
                        disabled={busy}
                        onClick={() =>
                            onUpdate(
                                product,
                                { status: active ? "inactive" : "active" },
                                active ? `"${product.name}" is now hidden from the store` : `"${product.name}" is now live`
                            )
                        }
                    />
                    <IconButton label={`Edit ${product.name}`} icon={Pencil} as={Link} to={adminPath(`products/${product._id}/edit`)} />
                    <IconButton label={`Delete ${product.name}`} icon={Trash2} tone="danger" disabled={busy} onClick={onDelete} />
                </div>
            </td>
        </tr>
    );
}

export default AdminProducts;
