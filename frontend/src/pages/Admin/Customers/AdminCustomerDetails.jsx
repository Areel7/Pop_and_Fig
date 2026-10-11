import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Ban, CheckCircle2, DollarSign, Eye, ReceiptText, ShoppingBag, Star, UserX, XCircle } from "lucide-react";
import { useGetCustomerQuery, useUpdateCustomerStatusMutation } from "../../../redux/api/customerApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card, IconButton, StatCard, Table, td, th } from "../../../components/admin/AdminUI.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import Button, { ButtonLink } from "../../../components/common/Button.jsx";
import { ConfirmDialog } from "../../../components/common/Modal.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice, formatDate, formatDateTime, pluralize } from "../../../utils/format.js";

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <dt className="text-sm text-neutral-500">{label}</dt>
            <dd className="min-w-0 text-sm break-words sm:text-right">{children}</dd>
        </div>
    );
}

function BackLink() {
    return (
        <Link to={adminPath("customers")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="size-4" aria-hidden="true" /> All customers
        </Link>
    );
}

function DetailSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading customer">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="mb-2 h-8 w-56" />
            <Skeleton className="mb-8 h-4 w-40" />
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
}

function AdminCustomerDetails() {
    const { id } = useParams();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { data, isLoading, isError, error, refetch } = useGetCustomerQuery(id, { skip: !id });
    const [updateStatus, { isLoading: updating }] = useUpdateCustomerStatusMutation();

    const customer = data?.customer;
    useDocumentTitle(customer ? `${customer.name || customer.email} · Customers · Admin` : "Customer · Admin");

    if (isLoading) return <DetailSkeleton />;

    if (isError || !customer) {
        const notFound = !customer && (!isError || error?.status === 404 || error?.status === 400);
        return (
            <div>
                <BackLink />
                <Card>
                    {notFound ? (
                        <EmptyState
                            icon={UserX}
                            title="Customer not found"
                            message="This customer doesn't exist or their account was removed."
                            action={
                                <ButtonLink to={adminPath("customers")} variant="outline" size="sm">
                                    Back to customers
                                </ButtonLink>
                            }
                        />
                    ) : (
                        <ErrorState error={error} title="Couldn't load this customer" onRetry={refetch} />
                    )}
                </Card>
            </div>
        );
    }

    const stats = data.stats || {};
    const orders = data.orders || [];
    const blocked = customer.status === "blocked";
    const address = customer.shippingAddress || {};
    const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
    const hasAddress = Boolean(address.address || cityLine || address.country);

    const onToggleStatus = async () => {
        const status = blocked ? "active" : "blocked";
        try {
            await updateStatus({ id: customer._id, status }).unwrap();
            toast.success(status === "blocked" ? "Customer blocked and signed out" : "Customer unblocked");
            setConfirmOpen(false);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <div>
            <BackLink />
            <AdminPageHeader
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        <span className="min-w-0 break-words">{customer.name || "Unnamed customer"}</span>
                        <StatusBadge status={customer.status} className="text-sm" />
                    </span>
                }
                description={`Customer since ${formatDate(customer.createdAt)}`}
                actions={
                    <Button variant={blocked ? "outline" : "danger-outline"} size="sm" onClick={() => setConfirmOpen(true)} disabled={updating}>
                        {blocked ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
                        {blocked ? "Unblock customer" : "Block customer"}
                    </Button>
                }
            />

            <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Total spent" value={formatPrice(stats.totalSpent)} icon={DollarSign} tone="accent" hint="Excludes cancelled orders" />
                <StatCard label="Orders" value={stats.totalOrders ?? 0} icon={ShoppingBag} />
                <StatCard label="Avg. order" value={formatPrice(stats.averageOrderValue)} icon={ReceiptText} />
                <StatCard label="Completed" value={stats.completedOrders ?? 0} icon={CheckCircle2} tone="green" />
                <StatCard label="Cancelled" value={stats.cancelledOrders ?? 0} icon={XCircle} tone="amber" />
                <StatCard label="Reviews" value={stats.reviewCount ?? 0} icon={Star} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="min-w-0 space-y-6">
                    <Card title="Profile">
                        <dl className="divide-y divide-neutral-100">
                            <DetailRow label="Email">
                                <a href={`mailto:${customer.email}`} className="hover:underline">
                                    {customer.email}
                                </a>
                            </DetailRow>
                            <DetailRow label="Phone">
                                {customer.phone ? (
                                    <a href={`tel:${customer.phone}`} className="hover:underline">
                                        {customer.phone}
                                    </a>
                                ) : (
                                    "—"
                                )}
                            </DetailRow>
                            <DetailRow label="Registered">{formatDateTime(customer.createdAt)}</DetailRow>
                            <DetailRow label="Last login">{customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "Never"}</DetailRow>
                            <DetailRow label="Wishlist">{pluralize(customer.wishlistCount ?? 0, "item")}</DetailRow>
                            <DetailRow label="First order">{stats.firstOrderAt ? formatDate(stats.firstOrderAt) : "—"}</DetailRow>
                            <DetailRow label="Last order">{stats.lastOrderAt ? formatDate(stats.lastOrderAt) : "—"}</DetailRow>
                        </dl>
                    </Card>

                    <Card title="Saved address">
                        {hasAddress ? (
                            <address className="text-sm leading-relaxed text-neutral-700 not-italic">
                                {address.address && <span className="block break-words">{address.address}</span>}
                                {cityLine && <span className="block">{cityLine}</span>}
                                {address.country && <span className="block">{address.country}</span>}
                            </address>
                        ) : (
                            <p className="text-sm text-neutral-500">No address saved.</p>
                        )}
                    </Card>
                </div>

                <Card
                    title="Orders"
                    description={
                        stats.totalOrders > orders.length ? `Showing the latest ${orders.length} of ${stats.totalOrders} orders.` : pluralize(orders.length, "order")
                    }
                    actions={
                        stats.totalOrders > 0 && (
                            <Link to={`${adminPath("orders")}?customer=${customer._id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                                View all orders
                            </Link>
                        )
                    }
                    bodyClassName={orders.length ? "p-4 sm:p-5" : "p-0"}
                >
                    {orders.length === 0 ? (
                        <EmptyState icon={ShoppingBag} title="No orders yet" message="This customer hasn't placed an order." />
                    ) : (
                        <Table minWidth="min-w-[640px]">
                            <thead>
                                <tr>
                                    <th scope="col" className={th}>
                                        Order #
                                    </th>
                                    <th scope="col" className={th}>
                                        Date
                                    </th>
                                    <th scope="col" className={th}>
                                        Items
                                    </th>
                                    <th scope="col" className={th}>
                                        Total
                                    </th>
                                    <th scope="col" className={th}>
                                        Payment
                                    </th>
                                    <th scope="col" className={th}>
                                        Status
                                    </th>
                                    <th scope="col" className={th}>
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-neutral-50">
                                        <td className={`${td} font-medium whitespace-nowrap`}>
                                            <Link to={adminPath(`orders/${order._id}`)} className="hover:underline">
                                                {order.orderNumber}
                                            </Link>
                                        </td>
                                        <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDate(order.createdAt)}</td>
                                        <td className={`${td} tabular-nums`}>{order.itemCount ?? "—"}</td>
                                        <td className={`${td} font-medium whitespace-nowrap tabular-nums`}>{formatPrice(order.total)}</td>
                                        <td className={td}>
                                            <StatusBadge status={order.paymentStatus} />
                                        </td>
                                        <td className={td}>
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className={`${td} text-right`}>
                                            <IconButton as={Link} to={adminPath(`orders/${order._id}`)} icon={Eye} label={`View order ${order.orderNumber}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={onToggleStatus}
                loading={updating}
                tone={blocked ? "primary" : "danger"}
                title={blocked ? "Unblock this customer?" : "Block this customer?"}
                confirmLabel={blocked ? "Unblock" : "Block customer"}
                message={
                    blocked ? (
                        <p>
                            <strong>{customer.name || customer.email}</strong> will be able to sign in and place orders again.
                        </p>
                    ) : (
                        <p>
                            <strong>{customer.name || customer.email}</strong> will be signed out on every device immediately and won't be able to sign in or
                            place orders until unblocked. Existing orders are not affected.
                        </p>
                    )
                }
            />
        </div>
    );
}

export default AdminCustomerDetails;
