import { Link } from "react-router";
import { useSelector } from "react-redux";
import { ArrowRight, Heart, MapPin, Package } from "lucide-react";
import { ButtonLink } from "../../components/common/Button.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { StatusBadge } from "../../components/orders/OrderParts.jsx";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useGetMyOrdersQuery } from "../../redux/api/orderApi.js";
import { useWishlist } from "../../hooks/useWishlist.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, formatDate } from "../../utils/format.js";

function Tile({ icon: Icon, label, value, to }) {
    return (
        <Link to={to} className="group flex items-center justify-between gap-4 border border-neutral-200 p-5 transition hover:border-neutral-900">
            <span className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center bg-secondary">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                    <span className="block text-2xl font-semibold tabular-nums">{value}</span>
                    <span className="block text-xs text-neutral-500">{label}</span>
                </span>
            </span>
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
    );
}

function AccountOverview() {
    useDocumentTitle("My account");
    const user = useSelector(selectCurrentUser);
    const { data, isLoading, isError, error, refetch } = useGetMyOrdersQuery({ page: 1, limit: 3 });
    const { count: wishlistCount } = useWishlist();
    const address = user?.shippingAddress;

    return (
        <div className="space-y-10">
            <div className="grid gap-3 sm:grid-cols-2">
                <Tile icon={Package} label="Orders placed" value={isLoading ? "…" : data?.meta?.total ?? 0} to="/account/orders" />
                <Tile icon={Heart} label="Saved items" value={wishlistCount} to="/account/wishlist" />
            </div>

            <section aria-labelledby="recent-orders">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 id="recent-orders" className="text-xl font-medium tracking-tight">
                        Recent orders
                    </h2>
                    <Link to="/account/orders" className="text-sm font-semibold underline-offset-4 hover:underline">
                        View all
                    </Link>
                </div>
                {isError ? (
                    <ErrorState error={error} onRetry={refetch} />
                ) : isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                    </div>
                ) : data.items.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No orders yet"
                        message="When you place an order it will show up here."
                        action={<ButtonLink to="/shop">Start shopping</ButtonLink>}
                        className="border border-dashed border-neutral-300"
                    />
                ) : (
                    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                        {data.items.map((order) => (
                            <li key={order._id}>
                                <Link to={`/account/orders/${order._id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-black/[0.02]">
                                    <span>
                                        <span className="block font-medium">{order.orderNumber}</span>
                                        <span className="text-xs text-neutral-500">{formatDate(order.createdAt)}</span>
                                    </span>
                                    <span className="flex items-center gap-4">
                                        <StatusBadge status={order.status} />
                                        <span className="font-semibold">{formatPrice(order.total)}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section aria-labelledby="account-details" className="grid gap-4 sm:grid-cols-2">
                <h2 id="account-details" className="sr-only">
                    Account details
                </h2>
                <div className="border border-neutral-200 p-5">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-500">CONTACT</p>
                    <p className="mt-3 font-medium">{user?.name}</p>
                    <p className="text-sm break-all text-neutral-600">{user?.email}</p>
                    {user?.phone && <p className="text-sm text-neutral-600">{user.phone}</p>}
                    <Link to="/account/profile" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
                        Edit profile
                    </Link>
                </div>
                <div className="border border-neutral-200 p-5">
                    <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-neutral-500">
                        <MapPin className="size-3.5" aria-hidden="true" /> DEFAULT ADDRESS
                    </p>
                    {address?.address ? (
                        <p className="mt-3 text-sm leading-6 text-neutral-700">
                            {address.address}
                            <br />
                            {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                            <br />
                            {address.country}
                        </p>
                    ) : (
                        <p className="mt-3 text-sm text-neutral-500">No address saved yet. It's saved automatically at your first checkout.</p>
                    )}
                    <Link to="/account/profile" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
                        {address?.address ? "Edit address" : "Add address"}
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default AccountOverview;
