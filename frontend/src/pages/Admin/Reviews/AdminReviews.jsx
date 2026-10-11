import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "react-toastify";
import { BadgeCheck, Eye, EyeOff, ExternalLink, ImageOff, MessageSquareText, Trash2 } from "lucide-react";
import { useAdminDeleteReviewMutation, useGetAdminReviewsQuery, useModerateReviewMutation } from "../../../redux/api/reviewApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { AdminPageHeader, Card, FilterSelect, IconButton, SearchInput, Table, TableSkeleton, td, th } from "../../../components/admin/AdminUI.jsx";
import { EmptyState, ErrorState } from "../../../components/common/Feedback.jsx";
import Button from "../../../components/common/Button.jsx";
import Modal, { ConfirmDialog } from "../../../components/common/Modal.jsx";
import Pagination from "../../../components/common/Pagination.jsx";
import { StarRating } from "../../../components/common/StarRating.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { useDebounce, useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatDate, formatDateTime, productImage } from "../../../utils/format.js";

const LIMIT = 20;
const STATUSES = ["published", "hidden"];
const RATINGS = ["5", "4", "3", "2", "1"];
const COLUMNS = ["Product", "Customer", "Rating", "Review", "Date", "Status", ""];

// Keeps list filters in the URL; any filter change resets pagination unless the page itself is set.
const useListParams = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const update = (updates, { replace = true } = {}) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (!("page" in updates)) next.delete("page");
                Object.entries(updates).forEach(([key, value]) => {
                    if (value === "" || value === null || value === undefined || (key === "page" && Number(value) <= 1)) next.delete(key);
                    else next.set(key, String(value));
                });
                return next;
            },
            { replace }
        );
    };
    return [searchParams, update];
};

function ProductCell({ product }) {
    if (!product) {
        return (
            <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                    <ImageOff className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-neutral-500 italic">Deleted product</span>
            </div>
        );
    }
    const image = productImage(product);
    return (
        <div className="flex items-center gap-3">
            <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {image && <img src={image} alt="" className="size-full object-cover" loading="lazy" />}
            </span>
            {product.slug ? (
                <a
                    href={`/product/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 max-w-[200px] font-medium hover:underline"
                    title={`${product.name} (opens in a new tab)`}
                >
                    {product.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>
            ) : (
                <span className="line-clamp-2 max-w-[200px] font-medium">{product.name}</span>
            )}
        </div>
    );
}

function VerifiedBadge() {
    return (
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800 ring-1 ring-green-200 ring-inset">
            <BadgeCheck className="size-3" aria-hidden="true" /> Verified purchase
        </span>
    );
}

function AdminReviews() {
    useDocumentTitle("Reviews · Admin");
    const [searchParams, updateParams] = useListParams();
    const [viewing, setViewing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const statusParam = searchParams.get("status") || "";
    const status = STATUSES.includes(statusParam) ? statusParam : "";
    const ratingParam = searchParams.get("rating") || "";
    const rating = RATINGS.includes(ratingParam) ? ratingParam : "";
    const search = searchParams.get("q") || "";
    const debouncedSearch = useDebounce(search.trim(), 350);

    const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminReviewsQuery({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        rating: rating || undefined,
        status: status || undefined,
    });
    const [moderate, { isLoading: moderating, originalArgs: moderateArgs }] = useModerateReviewMutation();
    const [deleteReview, { isLoading: deletingNow }] = useAdminDeleteReviewMutation();

    const items = data?.items || [];
    const meta = data?.meta;
    const hasFilters = Boolean(search || status || rating);
    const clearFilters = () => updateParams({ q: "", status: "", rating: "" });
    // Keep the open modal in sync with the latest list data (e.g. after toggling visibility inside it).
    const viewingReview = viewing ? items.find((r) => r._id === viewing._id) || viewing : null;

    const onToggleStatus = async (review) => {
        const nextStatus = review.status === "published" ? "hidden" : "published";
        try {
            await moderate({ id: review._id, status: nextStatus, productId: review.product?._id }).unwrap();
            toast.success(nextStatus === "hidden" ? "Review hidden from the storefront" : "Review published");
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const onDelete = async () => {
        if (!deleting) return;
        try {
            await deleteReview({ id: deleting._id, productId: deleting.product?._id }).unwrap();
            toast.success("Review deleted");
            setDeleting(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const isTogglingRow = (review) => moderating && moderateArgs?.id === review._id;

    return (
        <div>
            <AdminPageHeader
                title="Reviews"
                description={meta ? `${meta.total} ${meta.total === 1 ? "review" : "reviews"} match the current filters.` : "Moderate customer product reviews."}
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    value={search}
                    onChange={(value) => updateParams({ q: value })}
                    placeholder="Search product, reviewer, title or text"
                    label="Search reviews"
                    className="w-full sm:max-w-sm sm:flex-1"
                />
                <FilterSelect value={rating} onChange={(value) => updateParams({ rating: value })} label="Filter by rating" className="w-full sm:w-auto">
                    <option value="">All ratings</option>
                    {RATINGS.map((r) => (
                        <option key={r} value={r}>
                            {r} {r === "1" ? "star" : "stars"}
                        </option>
                    ))}
                </FilterSelect>
                <FilterSelect value={status} onChange={(value) => updateParams({ status: value })} label="Filter by visibility" className="w-full sm:w-auto">
                    <option value="">All statuses</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                </FilterSelect>
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear filters
                    </Button>
                )}
            </div>

            {isError ? (
                <Card>
                    <ErrorState error={error} title="Couldn't load reviews" onRetry={refetch} />
                </Card>
            ) : !isLoading && items.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={MessageSquareText}
                        title={page > 1 ? "No reviews on this page" : hasFilters ? "No matching reviews" : "No reviews yet"}
                        message={
                            page > 1
                                ? "This page is empty. Go back to the first page."
                                : hasFilters
                                  ? "Try a different search term or clear the filters."
                                  : "Reviews customers leave on products will appear here."
                        }
                        action={
                            page > 1 ? (
                                <Button variant="outline" size="sm" onClick={() => updateParams({ page: 1 })}>
                                    Go to first page
                                </Button>
                            ) : hasFilters ? (
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            ) : null
                        }
                    />
                </Card>
            ) : (
                <>
                    <div className={`transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`} aria-busy={isFetching}>
                        <Table minWidth="min-w-[1100px]">
                            <thead>
                                <tr>
                                    {COLUMNS.map((col, index) => (
                                        <th key={col || index} scope="col" className={`${th} ${col ? "" : "text-right"}`}>
                                            {col || "Actions"}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            {isLoading ? (
                                <TableSkeleton rows={8} cols={COLUMNS.length} />
                            ) : (
                                <tbody>
                                    {items.map((review) => {
                                        const published = review.status === "published";
                                        return (
                                            <tr key={review._id} className="hover:bg-neutral-50">
                                                <td className={td}>
                                                    <ProductCell product={review.product} />
                                                </td>
                                                <td className={td}>
                                                    <p className="max-w-[200px] truncate font-medium">{review.user?.name || review.name || "Anonymous"}</p>
                                                    {review.user?.email ? (
                                                        <p className="max-w-[200px] truncate text-xs text-neutral-500">{review.user.email}</p>
                                                    ) : (
                                                        !review.user && <p className="text-xs text-neutral-400">Account deleted</p>
                                                    )}
                                                    {review.verifiedPurchase && <VerifiedBadge />}
                                                </td>
                                                <td className={`${td} whitespace-nowrap`}>
                                                    <StarRating rating={review.rating} />
                                                </td>
                                                <td className={`${td} max-w-[320px]`}>
                                                    {review.title && <p className="truncate font-medium">{review.title}</p>}
                                                    <p className="line-clamp-2 text-neutral-600">{review.comment}</p>
                                                </td>
                                                <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDate(review.createdAt)}</td>
                                                <td className={td}>
                                                    <StatusBadge status={review.status} />
                                                </td>
                                                <td className={td}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <IconButton icon={Eye} label="View full review" onClick={() => setViewing(review)} />
                                                        <IconButton
                                                            icon={published ? EyeOff : BadgeCheck}
                                                            label={published ? "Hide review" : "Publish review"}
                                                            onClick={() => onToggleStatus(review)}
                                                            disabled={isTogglingRow(review)}
                                                        />
                                                        <IconButton icon={Trash2} tone="danger" label="Delete review" onClick={() => setDeleting(review)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            )}
                        </Table>
                    </div>
                    {meta && <Pagination page={meta.page} pages={meta.pages} onChange={(p) => updateParams({ page: p }, { replace: false })} className="mt-6" />}
                </>
            )}

            <Modal
                open={Boolean(viewingReview)}
                onClose={() => setViewing(null)}
                title="Review"
                description={viewingReview ? `Submitted ${formatDateTime(viewingReview.createdAt)}` : undefined}
                footer={
                    viewingReview && (
                        <>
                            <Button
                                variant="danger-outline"
                                onClick={() => {
                                    setDeleting(viewingReview);
                                    setViewing(null);
                                }}
                            >
                                <Trash2 className="size-4" aria-hidden="true" /> Delete
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => onToggleStatus(viewingReview)}
                                loading={isTogglingRow(viewingReview)}
                            >
                                {viewingReview.status === "published" ? "Hide review" : "Publish review"}
                            </Button>
                            <Button onClick={() => setViewing(null)}>Close</Button>
                        </>
                    )
                }
            >
                {viewingReview && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <ProductCell product={viewingReview.product} />
                            <StatusBadge status={viewingReview.status} />
                        </div>
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="font-medium">{viewingReview.user?.name || viewingReview.name || "Anonymous"}</p>
                            {viewingReview.user?.email && <p className="text-sm break-words text-neutral-500">{viewingReview.user.email}</p>}
                            {viewingReview.verifiedPurchase && <VerifiedBadge />}
                        </div>
                        <div>
                            <StarRating rating={viewingReview.rating} size="size-5" showValue />
                            {viewingReview.title && <h3 className="mt-3 text-base font-semibold break-words">{viewingReview.title}</h3>}
                            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-words text-neutral-700">{viewingReview.comment}</p>
                        </div>
                        {viewingReview.product?.slug && (
                            <a
                                href={`/product/${viewingReview.product.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
                            >
                                View product page <ExternalLink className="size-3.5" aria-hidden="true" />
                                <span className="sr-only">(opens in a new tab)</span>
                            </a>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={onDelete}
                loading={deletingNow}
                title="Delete this review?"
                confirmLabel="Delete review"
                message={
                    <p>
                        The review by <strong>{deleting?.user?.name || deleting?.name || "this customer"}</strong>
                        {deleting?.product?.name ? (
                            <>
                                {" "}
                                on <strong>{deleting.product.name}</strong>
                            </>
                        ) : null}{" "}
                        will be permanently deleted and the product rating recalculated. This can't be undone.
                    </p>
                }
            />
        </div>
    );
}

export default AdminReviews;
