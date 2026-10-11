import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, ExternalLink, FileSearch, Mail, RefreshCw } from "lucide-react";
import {
    useGetAdminOrderQuery,
    useResendCompletionEmailMutation,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
} from "../../../redux/api/orderApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card } from "../../../components/admin/AdminUI.jsx";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import Button, { ButtonLink } from "../../../components/common/Button.jsx";
import { ConfirmDialog } from "../../../components/common/Modal.jsx";
import { Select, Textarea } from "../../../components/forms/Field.jsx";
import { OrderItemsList, OrderTimeline, StatusBadge, TotalsTable } from "../../../components/orders/OrderParts.jsx";
import { ORDER_TRANSITIONS } from "../../../utils/orders.js";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { capitalize, formatDate, formatDateTime, pluralize } from "../../../utils/format.js";

const PAYMENT_STATUSES = ["pending", "paid", "refunded"];
const PAYMENT_METHODS = { cash_on_delivery: "Cash on delivery" };
const EMAIL_LABELS = { not_sent: "Not sent", pending: "Sending", sent: "Sent", failed: "Failed" };

function DetailRow({ label, children }) {
    return (
        <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <dt className="text-sm text-neutral-500">{label}</dt>
            <dd className="min-w-0 text-sm break-words sm:text-right">{children}</dd>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading order">
            <Skeleton className="mb-4 h-4 w-28" />
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="mb-8 h-4 w-48" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <Skeleton className="h-80 w-full rounded-xl" />
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

function BackLink() {
    return (
        <Link to={adminPath("orders")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="size-4" aria-hidden="true" /> All orders
        </Link>
    );
}

function StatusCard({ order }) {
    const [nextStatus, setNextStatus] = useState("");
    const [note, setNote] = useState("");
    const [confirm, setConfirm] = useState(null); // "completed" | "cancelled" | null
    const [updateStatus, { isLoading }] = useUpdateOrderStatusMutation();

    const allowed = ORDER_TRANSITIONS[order.status] || [];
    // Derived so a stale choice never survives a status change made elsewhere.
    const selected = allowed.includes(nextStatus) ? nextStatus : "";

    const submit = async (status) => {
        try {
            const response = await updateStatus({ id: order._id, status, note: note.trim() || undefined }).unwrap();
            const message = response?.message || `Order marked as ${status}`;
            if (response?.data?.email?.status === "failed") toast.warning(message);
            else toast.success(message);
            setNextStatus("");
            setNote("");
            setConfirm(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
            setConfirm(null);
        }
    };

    const onSubmit = (event) => {
        event.preventDefault();
        if (!selected) return;
        if (selected === "completed" || selected === "cancelled") setConfirm(selected);
        else submit(selected);
    };

    if (allowed.length === 0) {
        return (
            <Card title="Order status">
                <div className="mb-4 flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">Current status</span>
                    <StatusBadge status={order.status} />
                </div>
                <Alert tone={order.status === "cancelled" ? "warning" : "success"}>
                    {order.status === "cancelled"
                        ? `This order was cancelled${order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ""}. Stock was restored and the status can no longer change.`
                        : `This order was completed${order.completedAt ? ` on ${formatDateTime(order.completedAt)}` : ""}. Completed orders are final.`}
                </Alert>
            </Card>
        );
    }

    return (
        <Card title="Order status" description="Move the order forward through fulfilment.">
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">Current status</span>
                    <StatusBadge status={order.status} />
                </div>
                <Select label="Next status" value={selected} onChange={(e) => setNextStatus(e.target.value)} disabled={isLoading} required>
                    <option value="" disabled>
                        Select next status…
                    </option>
                    {allowed.map((status) => (
                        <option key={status} value={status}>
                            {capitalize(status)}
                        </option>
                    ))}
                </Select>
                {selected === "completed" && (
                    <p className="text-xs text-neutral-600">The customer will be emailed automatically when the order is completed.</p>
                )}
                {selected === "cancelled" && <p className="text-xs text-red-700">Cancelling returns all items to stock. This cannot be undone.</p>}
                <Textarea
                    label="Note (optional)"
                    hint="Saved to the order timeline."
                    rows={2}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isLoading}
                />
                <Button type="submit" block variant={selected === "cancelled" ? "danger" : "primary"} loading={isLoading && !confirm} disabled={!selected || isLoading}>
                    Update status
                </Button>
            </form>

            <ConfirmDialog
                open={confirm === "completed"}
                onClose={() => setConfirm(null)}
                onConfirm={() => submit("completed")}
                loading={isLoading}
                tone="primary"
                title="Mark order as completed?"
                confirmLabel="Complete order"
                message={
                    <>
                        <p>
                            Order <strong>{order.orderNumber}</strong> will be marked as completed. This is final.
                        </p>
                        <p className="mt-2">
                            A completion email will be sent automatically to <strong>{order.customer?.email || "the customer"}</strong>.
                        </p>
                    </>
                }
            />
            <ConfirmDialog
                open={confirm === "cancelled"}
                onClose={() => setConfirm(null)}
                onConfirm={() => submit("cancelled")}
                loading={isLoading}
                tone="danger"
                title="Cancel this order?"
                confirmLabel="Cancel order"
                message={
                    <p>
                        Order <strong>{order.orderNumber}</strong> will be cancelled and its items returned to stock. A cancelled order cannot be
                        reopened.
                    </p>
                }
            />
        </Card>
    );
}

function EmailCard({ order }) {
    const [resend, { isLoading }] = useResendCompletionEmailMutation();
    const completed = order.status === "completed";
    const canRetry = completed && !order.emailSent && (order.emailStatus === "failed" || order.emailStatus === "pending");

    const onRetry = async () => {
        try {
            const response = await resend(order._id).unwrap();
            toast.success(response?.message || "Completion email sent");
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Card title="Completion email" actions={<StatusBadge status={order.emailStatus} label={EMAIL_LABELS[order.emailStatus]} />}>
            <p className="text-sm leading-relaxed text-neutral-600">
                {completed
                    ? "The confirmation email is sent automatically once, when the order is marked completed. It is never sent twice."
                    : "An email is sent to the customer automatically when this order moves to Completed — only once, never twice."}
            </p>
            {(order.emailSentAt || order.emailAttempts > 0) && (
                <dl className="mt-3 divide-y divide-neutral-100">
                    {order.emailSentAt && <DetailRow label="Sent at">{formatDateTime(order.emailSentAt)}</DetailRow>}
                    {order.emailAttempts > 0 && <DetailRow label="Attempts">{order.emailAttempts}</DetailRow>}
                </dl>
            )}
            {order.emailStatus === "failed" && order.emailError && (
                <Alert tone="error" className="mt-3 break-words">
                    <span className="font-medium">Last error:</span> {order.emailError}
                </Alert>
            )}
            {completed && order.emailStatus === "pending" && (
                <p className="mt-3 text-xs text-neutral-500">If the email appears stuck in “Sending”, you can retry it.</p>
            )}
            {canRetry && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} loading={isLoading}>
                    {!isLoading && <RefreshCw className="size-4" aria-hidden="true" />} Retry email
                </Button>
            )}
        </Card>
    );
}

function PaymentCard({ order }) {
    const [updatePayment, { isLoading }] = useUpdatePaymentStatusMutation();

    const onChange = async (paymentStatus) => {
        if (paymentStatus === order.paymentStatus) return;
        try {
            await updatePayment({ id: order._id, paymentStatus }).unwrap();
            toast.success(`Payment marked as ${paymentStatus}`);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Card title="Payment" actions={<StatusBadge status={order.paymentStatus} />}>
            <dl className="mb-4">
                <DetailRow label="Method">{PAYMENT_METHODS[order.paymentMethod] || capitalize(String(order.paymentMethod || "—").replace(/_/g, " "))}</DetailRow>
            </dl>
            <Select label="Payment status" value={order.paymentStatus} onChange={(e) => onChange(e.target.value)} disabled={isLoading} hint={isLoading ? "Saving…" : undefined}>
                {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                        {capitalize(status)}
                    </option>
                ))}
            </Select>
        </Card>
    );
}

function ActivityLog({ history }) {
    if (!history?.length) return null;
    const entries = [...history].reverse();
    return (
        <div className="mt-6 border-t border-neutral-100 pt-5">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Activity</h3>
            <ul className="space-y-3">
                {entries.map((entry, index) => (
                    <li key={`${entry.status}-${entry.changedAt}-${index}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
                        <StatusBadge status={entry.status} />
                        <div className="min-w-0 flex-1">
                            <p className="text-neutral-700">
                                {formatDateTime(entry.changedAt)}
                                {entry.changedBy?.name && (
                                    <span className="text-neutral-500">
                                        {" "}
                                        · by {entry.changedBy.name}
                                        {entry.changedBy.role ? ` (${entry.changedBy.role})` : ""}
                                    </span>
                                )}
                            </p>
                            {entry.note && <p className="mt-0.5 break-words text-neutral-600">“{entry.note}”</p>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AdminOrderDetails() {
    const { id } = useParams();
    const { data: order, isLoading, isError, error, refetch } = useGetAdminOrderQuery(id, { skip: !id });
    useDocumentTitle(order ? `Order ${order.orderNumber} · Admin` : "Order · Admin");

    if (isLoading) return <DetailSkeleton />;

    if (isError || !order) {
        const notFound = !order && (!isError || error?.status === 404 || error?.status === 400);
        return (
            <div>
                <BackLink />
                <Card>
                    {notFound ? (
                        <EmptyState
                            icon={FileSearch}
                            title="Order not found"
                            message="This order doesn't exist or may have been removed."
                            action={
                                <ButtonLink to={adminPath("orders")} variant="outline" size="sm">
                                    Back to orders
                                </ButtonLink>
                            }
                        />
                    ) : (
                        <ErrorState error={error} title="Couldn't load this order" onRetry={refetch} />
                    )}
                </Card>
            </div>
        );
    }

    const address = order.shippingAddress || {};
    const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
    const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
        <div>
            <BackLink />
            <AdminPageHeader
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        Order {order.orderNumber}
                        <StatusBadge status={order.status} className="text-sm" />
                    </span>
                }
                description={`Placed ${formatDateTime(order.createdAt)} · ${pluralize(itemCount, "item")}`}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                {/* Management column comes first on mobile, sits on the right on large screens. */}
                <div className="min-w-0 space-y-6 lg:order-last">
                    <StatusCard key={order.status} order={order} />
                    <EmailCard order={order} />
                    <PaymentCard order={order} />
                </div>

                <div className="min-w-0 space-y-6">
                    <Card title="Items" description={pluralize(itemCount, "item")}>
                        <OrderItemsList items={order.items || []} linkProducts={false} />
                        <div className="mt-2 border-t border-neutral-200 pt-4 sm:ml-auto sm:max-w-sm">
                            <TotalsTable
                                subtotal={order.subtotal}
                                savings={order.savings}
                                shipping={order.shipping}
                                total={order.total}
                            />
                        </div>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card
                            title="Customer"
                            actions={
                                order.user?._id ? (
                                    <Link
                                        to={adminPath(`customers/${order.user._id}`)}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
                                    >
                                        View profile <ExternalLink className="size-3.5" aria-hidden="true" />
                                    </Link>
                                ) : null
                            }
                        >
                            <dl className="divide-y divide-neutral-100">
                                <DetailRow label="Name">{order.customer?.name || "—"}</DetailRow>
                                <DetailRow label="Email">
                                    {order.customer?.email ? (
                                        <a href={`mailto:${order.customer.email}`} className="inline-flex items-center gap-1 hover:underline">
                                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                            {order.customer.email}
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </DetailRow>
                                <DetailRow label="Phone">
                                    {order.customer?.phone ? (
                                        <a href={`tel:${order.customer.phone}`} className="hover:underline">
                                            {order.customer.phone}
                                        </a>
                                    ) : (
                                        "—"
                                    )}
                                </DetailRow>
                                {order.user?.createdAt && <DetailRow label="Customer since">{formatDate(order.user.createdAt)}</DetailRow>}
                                {order.user?.status && (
                                    <DetailRow label="Account">
                                        <StatusBadge status={order.user.status} />
                                    </DetailRow>
                                )}
                                {!order.user && <DetailRow label="Account">Account no longer exists</DetailRow>}
                            </dl>
                        </Card>

                        <Card title="Shipping address">
                            {address.address || cityLine || address.country ? (
                                <address className="text-sm leading-relaxed text-neutral-700 not-italic">
                                    <span className="block font-medium text-neutral-900">{order.customer?.name}</span>
                                    {address.address && <span className="block break-words">{address.address}</span>}
                                    {cityLine && <span className="block">{cityLine}</span>}
                                    {address.country && <span className="block">{address.country}</span>}
                                </address>
                            ) : (
                                <p className="text-sm text-neutral-500">No shipping address recorded.</p>
                            )}
                        </Card>
                    </div>

                    <Card title="Customer notes">
                        {order.notes ? (
                            <p className="text-sm leading-relaxed whitespace-pre-line break-words text-neutral-700">{order.notes}</p>
                        ) : (
                            <p className="text-sm text-neutral-500">The customer didn't leave any notes.</p>
                        )}
                    </Card>

                    <Card title="Timeline">
                        <OrderTimeline history={order.statusHistory || []} currentStatus={order.status} />
                        <ActivityLog history={order.statusHistory} />
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default AdminOrderDetails;
