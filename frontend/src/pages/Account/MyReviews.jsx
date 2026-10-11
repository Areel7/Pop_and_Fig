import { useState } from "react";
import { Link } from "react-router";
import { MessageSquareText } from "lucide-react";
import { toast } from "react-toastify";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { ConfirmDialog } from "../../components/common/Modal.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { StarRating } from "../../components/common/StarRating.jsx";
import { ReviewForm } from "../ProductDetails/ProductReviews.jsx";
import { useGetMyReviewsQuery } from "../../redux/api/accountApi.js";
import { useDeleteReviewMutation, useUpdateReviewMutation } from "../../redux/api/reviewApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatDate, productImage } from "../../utils/format.js";

function ReviewItem({ review, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [updateReview, { isLoading }] = useUpdateReviewMutation();
    const product = review.product;

    return (
        <li className="flex flex-col gap-4 border border-neutral-200 p-5 sm:flex-row">
            <div className="size-16 shrink-0 overflow-hidden bg-secondary">
                {product && productImage(product) && <img src={productImage(product)} alt="" className="size-full object-cover" loading="lazy" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {product ? (
                        <Link to={`/product/${product.slug}`} className="font-medium hover:underline">
                            {product.name}
                        </Link>
                    ) : (
                        <p className="font-medium text-neutral-500">Product no longer available</p>
                    )}
                    <span className="text-xs text-neutral-500">{formatDate(review.createdAt)}</span>
                </div>
                {editing ? (
                    <div className="mt-4">
                        <ReviewForm
                            initial={review}
                            submitting={isLoading}
                            submitLabel="Save changes"
                            onCancel={() => setEditing(false)}
                            onSubmit={async (values) => {
                                try {
                                    await updateReview({ id: review._id, productId: product?._id, ...values }).unwrap();
                                    toast.success("Review updated");
                                    setEditing(false);
                                } catch (error) {
                                    toast.error(getErrorMessage(error));
                                }
                            }}
                        />
                    </div>
                ) : (
                    <>
                        <StarRating rating={review.rating} className="mt-2" />
                        {review.status === "hidden" && <p className="mt-1 text-xs text-amber-700">Hidden by the store</p>}
                        {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
                        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-neutral-700">{review.comment}</p>
                        <div className="mt-4 flex gap-2">
                            {product && (
                                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                                    Edit
                                </Button>
                            )}
                            <Button variant="danger-outline" size="sm" onClick={() => onDelete(review)}>
                                Delete
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </li>
    );
}

function MyReviews() {
    useDocumentTitle("My reviews");
    const { data: reviews = [], isLoading, isError, error, refetch } = useGetMyReviewsQuery();
    const [deleteReview, { isLoading: deleting }] = useDeleteReviewMutation();
    const [pendingDelete, setPendingDelete] = useState(null);

    const confirmDelete = async () => {
        try {
            await deleteReview({ id: pendingDelete._id, productId: pendingDelete.product?._id }).unwrap();
            toast.success("Review deleted");
            setPendingDelete(null);
        } catch (deleteError) {
            toast.error(getErrorMessage(deleteError));
        }
    };

    return (
        <div>
            <h2 className="mb-6 text-2xl font-medium tracking-tight">My reviews</h2>
            {isError ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            ) : reviews.length === 0 ? (
                <EmptyState
                    icon={MessageSquareText}
                    title="No reviews yet"
                    message="Once an order is delivered, you can review its products from the product page."
                    action={<ButtonLink to="/account/orders">View my orders</ButtonLink>}
                    className="border border-dashed border-neutral-300"
                />
            ) : (
                <ul className="space-y-3">
                    {reviews.map((review) => (
                        <ReviewItem key={review._id} review={review} onDelete={setPendingDelete} />
                    ))}
                </ul>
            )}
            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Delete this review?"
                message="Your review and rating will be removed from the product."
            />
        </div>
    );
}

export default MyReviews;
