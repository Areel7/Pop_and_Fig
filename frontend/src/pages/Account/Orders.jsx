import { Link, useSearchParams } from "react-router";
import { ChevronRight, Package } from "lucide-react";
import { ButtonLink } from "../../components/common/Button.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { StatusBadge } from "../../components/orders/OrderParts.jsx";
import { useGetMyOrdersQuery } from "../../redux/api/orderApi.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, formatDate, pluralize, resolveImageUrl } from "../../utils/format.js";

function Orders() {
    useDocumentTitle("Orders");
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const { data, isLoading, isFetching, isError, error, refetch } = useGetMyOrdersQuery({ page, limit: 10 });

    return (
        <div>
            <h2 className="mb-6 text-2xl font-medium tracking-tight">Order history</h2>
            {isError ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, i) => (
                        <Skeleton key={i} className="h-28" />
                    ))}
                </div>
            ) : data.items.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No orders yet"
                    message="Your orders will appear here once you've checked out."
                    action={<ButtonLink to="/shop">Start shopping</ButtonLink>}
                    className="border border-dashed border-neutral-300"
                />
            ) : (
                <>
                    <ul className={`space-y-3 ${isFetching ? "opacity-60" : ""}`}>
                        {data.items.map((order) => {
                            const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
                            return (
                                <li key={order._id}>
                                    <Link
                                        to={`/account/orders/${order._id}`}
                                        className="group flex flex-col gap-4 border border-neutral-200 p-4 transition hover:border-neutral-900 sm:flex-row sm:items-center sm:p-5"
                                    >
                                        <div className="flex -space-x-3">
                                            {order.items.slice(0, 3).map((item, index) => (
                                                <span key={index} className="size-14 overflow-hidden border-2 border-background bg-secondary">
                                                    {item.image && <img src={resolveImageUrl(item.image)} alt="" className="size-full object-cover" loading="lazy" />}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold">{order.orderNumber}</p>
                                            <p className="text-xs text-neutral-500">
                                                Placed {formatDate(order.createdAt)} · {pluralize(count, "item")}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                                            <StatusBadge status={order.status} />
                                            <span className="font-semibold">{formatPrice(order.total)}</span>
                                            <ChevronRight className="size-4 text-neutral-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <Pagination
                        page={page}
                        pages={data.meta?.pages}
                        onChange={(next) => setSearchParams(next > 1 ? { page: String(next) } : {})}
                        className="mt-8"
                    />
                </>
            )}
        </div>
    );
}

export default Orders;
