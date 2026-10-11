import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { ConfirmDialog } from "../../components/common/Modal.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { OrderItemsList, OrderTimeline, StatusBadge, TotalsTable } from "../../components/orders/OrderParts.jsx";
import { useCancelOrderMutation, useGetOrderQuery } from "../../redux/api/orderApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { capitalize, formatDateTime } from "../../utils/format.js";

function InfoBlock({ title, children }) {
    return (
        <div className="border border-neutral-200 p-5">
            <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-neutral-500">{title}</p>
            <div className="text-sm leading-6 text-neutral-700">{children}</div>
        </div>
    );
}

function OrderDetails() {
    const { id } = useParams();
    const location = useLocation();
    const justPlaced = location.state?.placed;
    const { data: order, isLoading, isError, error, refetch } = useGetOrderQuery(id);
    const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();
    const [confirmCancel, setConfirmCancel] = useState(false);
    useDocumentTitle(order ? `Order ${order.orderNumber}` : "Order");

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-48" />
                <Skeleton className="h-32" />
            </div>
        );
    }
    if (isError) {
        if (error?.status === 404) {
            return <EmptyState title="Order not found" message="We couldn't find this order in your account." action={<ButtonLink to="/account/orders">Back to orders</ButtonLink>} />;
        }
        return <ErrorState error={error} onRetry={refetch} />;
    }

    const address = order.shippingAddress;

    const handleCancel = async () => {
        try {
            await cancelOrder(order._id).unwrap();
            toast.success("Your order has been cancelled");
            setConfirmCancel(false);
        } catch (cancelError) {
            toast.error(getErrorMessage(cancelError));
        }
    };

    return (
        <div className="space-y-8">
            <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-foreground">
                <ArrowLeft className="size-4" aria-hidden="true" /> All orders
            </Link>

            {justPlaced && (
                <div className="flex gap-4 border border-green-200 bg-green-50 p-5 text-green-900" role="status">
                    <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="font-semibold">Thank you — your order has been placed!</p>
                        <p className="mt-1 text-sm">
                            We'll prepare it shortly. You'll receive an email at <strong>{order.customer.email}</strong> once your order is completed.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-tight break-all sm:text-3xl">{order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-neutral-500">Placed {formatDateTime(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} className="text-sm" />
                    {order.status === "pending" && (
                        <Button variant="danger-outline" size="sm" onClick={() => setConfirmCancel(true)}>
                            Cancel order
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
                <div className="min-w-0 space-y-6">
                    <section aria-labelledby="order-items" className="border border-neutral-200 px-5">
                        <h3 id="order-items" className="sr-only">
                            Items
                        </h3>
                        <OrderItemsList items={order.items} />
                    </section>
                    <section aria-label="Order totals" className="border border-neutral-200 p-5">
                        <TotalsTable
                            subtotal={order.subtotal}
                            savings={order.savings}
                            shipping={order.shipping}
                            total={order.total}
                        />
                    </section>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoBlock title="SHIPPING TO">
                            <p className="font-medium text-foreground">{order.customer.name}</p>
                            <p>{address.address}</p>
                            <p>
                                {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p>{address.country}</p>
                            <p className="mt-2">{order.customer.phone}</p>
                        </InfoBlock>
                        <InfoBlock title="PAYMENT">
                            <p className="font-medium text-foreground">Cash on delivery</p>
                            <p>Status: {capitalize(order.paymentStatus)}</p>
                            {order.notes && (
                                <>
                                    <p className="mt-3 font-medium text-foreground">Notes</p>
                                    <p className="whitespace-pre-line">{order.notes}</p>
                                </>
                            )}
                        </InfoBlock>
                    </div>
                </div>
                <aside aria-labelledby="order-progress" className="h-fit border border-neutral-200 p-5">
                    <h3 id="order-progress" className="mb-5 text-[11px] font-bold tracking-[0.14em] text-neutral-500">
                        ORDER PROGRESS
                    </h3>
                    <OrderTimeline history={order.statusHistory} currentStatus={order.status} />
                </aside>
            </div>

            <ConfirmDialog
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                onConfirm={handleCancel}
                loading={cancelling}
                title="Cancel this order?"
                message="Your order will be cancelled and the items released back to stock. This cannot be undone."
                confirmLabel="Cancel order"
            />
        </div>
    );
}

export default OrderDetails;
