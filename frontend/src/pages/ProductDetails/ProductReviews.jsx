import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { BadgeCheck, MessageSquareText } from "lucide-react";
import { toast } from "react-toastify";
import Container from "../../components/common/Container.jsx";
import Button from "../../components/common/Button.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { ConfirmDialog } from "../../components/common/Modal.jsx";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { RatingInput, StarRating } from "../../components/common/StarRating.jsx";
import { Input, Textarea } from "../../components/forms/Field.jsx";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import {
    useCreateReviewMutation,
    useDeleteReviewMutation,
    useGetProductReviewsQuery,
    useUpdateReviewMutation,
} from "../../redux/api/reviewApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { formatDate } from "../../utils/format.js";

export function ReviewForm({ initial, onSubmit, onCancel, submitting, submitLabel = "Submit review" }) {
    const [values, setValues] = useState({ rating: initial?.rating || 0, title: initial?.title || "", comment: initial?.comment || "" });
    const [errors, setErrors] = useState({});

    const submit = (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!values.rating) nextErrors.rating = "Choose a rating from 1 to 5 stars";
        if (values.comment.trim().length < 3) nextErrors.comment = "Write at least a few words";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) onSubmit({ ...values, title: values.title.trim(), comment: values.comment.trim() });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <RatingInput value={values.rating} onChange={(rating) => setValues((v) => ({ ...v, rating }))} error={errors.rating} />
            <Input label="Title (optional)" maxLength={120} value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
            <Textarea
                label="Your review"
                required
                maxLength={2000}
                rows={5}
                value={values.comment}
                error={errors.comment}
                onChange={(e) => setValues((v) => ({ ...v, comment: e.target.value }))}
                hint={`${values.comment.length}/2000`}
            />
            <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={submitting}>
                    {submitLabel}
                </Button>
                {onCancel && (
                    <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
}

function Breakdown({ summary }) {
    const total = summary.reviewCount || 0;
    return (
        <div>
            <p className="text-6xl font-medium tracking-tight">{Number(summary.averageRating || 0).toFixed(1)}</p>
            <StarRating rating={summary.averageRating} size="size-4" className="mt-2" />
            <p className="mt-1 text-sm text-neutral-500">
                Based on {total} review{total === 1 ? "" : "s"}
            </p>
            <ul className="mt-6 space-y-2" aria-label="Rating breakdown">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.breakdown?.[star] || 0;
                    const percent = total ? Math.round((count / total) * 100) : 0;
                    return (
                        <li key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-10 shrink-0 text-neutral-600">{star} star</span>
                            <span className="h-1.5 flex-1 overflow-hidden bg-neutral-200" aria-hidden="true">
                                <span className="block h-full bg-accent" style={{ width: `${percent}%` }} />
                            </span>
                            <span className="w-8 shrink-0 text-right text-neutral-500">{count}</span>
                            <span className="sr-only">
                                {count} {star}-star reviews ({percent}%)
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function ViewerPanel({ product, viewer }) {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [createReview, { isLoading: creating }] = useCreateReviewMutation();
    const [updateReview, { isLoading: updating }] = useUpdateReviewMutation();
    const [deleteReview, { isLoading: deleting }] = useDeleteReviewMutation();

    if (!user) {
        return (
            <Alert>
                <Link to="/login" state={{ from: `${location.pathname}#reviews` }} className="font-semibold underline underline-offset-4">
                    Log in
                </Link>{" "}
                to write a review. Reviews are open to customers who have received this product.
            </Alert>
        );
    }
    if (!viewer) return null;

    const own = viewer.review;

    if (own) {
        if (editing) {
            return (
                <div className="border border-neutral-200 p-5 sm:p-6">
                    <h3 className="mb-4 font-semibold">Edit your review</h3>
                    <ReviewForm
                        initial={own}
                        submitting={updating}
                        submitLabel="Save changes"
                        onCancel={() => setEditing(false)}
                        onSubmit={async (values) => {
                            try {
                                await updateReview({ id: own._id, productId: product._id, ...values }).unwrap();
                                toast.success("Review updated");
                                setEditing(false);
                            } catch (error) {
                                toast.error(getErrorMessage(error));
                            }
                        }}
                    />
                </div>
            );
        }
        return (
            <div className="border border-neutral-200 p-5 sm:p-6">
                <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-500">YOUR REVIEW</p>
                <StarRating rating={own.rating} className="mt-3" />
                {own.status === "hidden" && <p className="mt-2 text-xs text-amber-700">This review is currently hidden by the store.</p>}
                {own.title && <p className="mt-2 font-semibold">{own.title}</p>}
                <p className="mt-1 text-sm leading-relaxed text-neutral-700">{own.comment}</p>
                <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        Edit
                    </Button>
                    <Button variant="danger-outline" size="sm" onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                </div>
                <ConfirmDialog
                    open={confirmDelete}
                    onClose={() => setConfirmDelete(false)}
                    loading={deleting}
                    title="Delete your review?"
                    message="Your review and rating will be removed from this product."
                    onConfirm={async () => {
                        try {
                            await deleteReview({ id: own._id, productId: product._id }).unwrap();
                            toast.success("Review deleted");
                            setConfirmDelete(false);
                        } catch (error) {
                            toast.error(getErrorMessage(error));
                        }
                    }}
                />
            </div>
        );
    }

    if (!viewer.hasPurchased) {
        return <Alert>Reviews are open to verified buyers. You can review this product once an order containing it has been delivered.</Alert>;
    }

    return (
        <div className="border border-neutral-200 p-5 sm:p-6">
            <h3 className="mb-4 font-semibold">Write a review</h3>
            <ReviewForm
                submitting={creating}
                onSubmit={async (values) => {
                    try {
                        await createReview({ productId: product._id, ...values }).unwrap();
                        toast.success("Thank you for your review!");
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                    }
                }}
            />
        </div>
    );
}

function ProductReviews({ product }) {
    const [page, setPage] = useState(1);
    const { data, isLoading, isError, error, refetch, isFetching } = useGetProductReviewsQuery({ productId: product._id, page, limit: 6 });

    return (
        <Container as="section" id="reviews" className="scroll-mt-24 py-12" aria-labelledby="reviews-heading">
            <div className="border-t border-neutral-200 pt-12">
                <h2 id="reviews-heading" className="mb-10 text-3xl font-medium tracking-tight sm:text-4xl">
                    Customer reviews
                </h2>
                {isError ? (
                    <ErrorState error={error} onRetry={refetch} />
                ) : isLoading ? (
                    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
                        <Skeleton className="h-60" />
                        <div className="space-y-4">
                            <Skeleton className="h-28" />
                            <Skeleton className="h-28" />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
                        <div className="space-y-8">
                            <Breakdown summary={data.summary} />
                            <ViewerPanel product={product} viewer={data.viewer} />
                        </div>
                        <div className={`min-w-0 ${isFetching ? "opacity-60" : ""}`}>
                            {data.reviews.length === 0 ? (
                                <EmptyState
                                    icon={MessageSquareText}
                                    title="No reviews yet"
                                    message="Be the first to share your thoughts once your order arrives."
                                    className="border border-dashed border-neutral-300"
                                />
                            ) : (
                                <ul className="divide-y divide-neutral-200">
                                    {data.reviews.map((review) => (
                                        <li key={review._id} className="py-6 first:pt-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <StarRating rating={review.rating} />
                                                <time dateTime={review.createdAt} className="text-xs text-neutral-500">
                                                    {formatDate(review.createdAt)}
                                                </time>
                                            </div>
                                            {review.title && <p className="mt-3 font-semibold">{review.title}</p>}
                                            <p className="mt-2 text-[15px] leading-7 whitespace-pre-line text-neutral-700">{review.comment}</p>
                                            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                                <span className="font-medium">{review.name}</span>
                                                {review.verifiedPurchase && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                                        <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified purchase
                                                    </span>
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Pagination page={page} pages={data.meta?.pages} onChange={setPage} className="mt-8" />
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}

export default ProductReviews;
