import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { AlertTriangle, ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import Container, { PageHeader } from "../../components/common/Container.jsx";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { ConfirmDialog } from "../../components/common/Modal.jsx";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { QuantityStepper } from "../../components/products/ProductParts.jsx";
import { FreeShippingNote } from "../../components/cart/CartParts.jsx";
import { useCartQuote } from "../../hooks/useCartQuote.js";
import { TotalsTable } from "../../components/orders/OrderParts.jsx";
import { clearCart, removeFromCart, updateQuantity } from "../../redux/features/cart/cartSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, resolveImageUrl } from "../../utils/format.js";

function CartLine({ item, line }) {
    const dispatch = useDispatch();
    const name = line?.name || item.name || "Product";
    const slug = line?.slug || item.slug;
    const image = resolveImageUrl(line?.image || item.image);
    const unavailable = line && !line.available;

    return (
        <li className="flex gap-4 py-6 sm:gap-6">
            <Link to={slug ? `/product/${slug}` : "#"} className="size-24 shrink-0 overflow-hidden bg-secondary sm:size-32" tabIndex={-1} aria-hidden="true">
                {image && <img src={image} alt="" className={`size-full object-cover ${unavailable ? "opacity-40" : ""}`} loading="lazy" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                        {line?.category && <p className="text-[11px] tracking-[0.08em] text-neutral-500 uppercase">{line.category.name}</p>}
                        {slug ? (
                            <Link to={`/product/${slug}`} className="font-medium break-words hover:underline">
                                {name}
                            </Link>
                        ) : (
                            <p className="font-medium">{name}</p>
                        )}
                        {line?.available && (
                            <p className="mt-1 text-sm">
                                <span className={line.onSale ? "text-red-700" : ""}>{formatPrice(line.unitPrice)}</span>
                                {line.onSale && <del className="ml-2 text-xs text-neutral-500">{formatPrice(line.originalPrice)}</del>}
                            </p>
                        )}
                    </div>
                    {line?.available && <p className="font-semibold">{formatPrice(line.lineTotal)}</p>}
                </div>

                {line?.issue && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                        <AlertTriangle className="size-3.5" aria-hidden="true" /> {line.issue}
                    </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    {unavailable ? (
                        <span className="text-xs text-neutral-500">Please remove this item to continue.</span>
                    ) : (
                        <QuantityStepper
                            size="sm"
                            value={item.quantity}
                            max={Math.max(1, Math.min(99, line?.stock ?? 99))}
                            onChange={(quantity) => dispatch(updateQuantity({ productId: item.product, quantity, stock: line?.stock }))}
                            label={`Quantity for ${name}`}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => dispatch(removeFromCart(item.product))}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-700"
                    >
                        <Trash2 className="size-3.5" aria-hidden="true" /> Remove
                        <span className="sr-only"> {name}</span>
                    </button>
                </div>
            </div>
        </li>
    );
}

function Cart() {
    useDocumentTitle("Cart");
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [confirmClear, setConfirmClear] = useState(false);
    const { items, quote, isLoading, isFetching, isError, error, refetch } = useCartQuote();

    if (items.length === 0) {
        return (
            <>
                <PageHeader label="YOUR BAG" title="Cart" />
                <EmptyState
                    icon={ShoppingBag}
                    title="Your cart is empty"
                    message="Looks like you haven't added anything yet. Let's find something you'll love."
                    action={<ButtonLink to="/shop">Start shopping</ButtonLink>}
                    className="py-24"
                />
            </>
        );
    }

    const lineFor = (productId) => quote?.items.find((line) => line.productId === productId);
    const hasIssues = (quote?.issues?.length || 0) > 0;
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            <PageHeader label="YOUR BAG" title="Cart" description={`${count} item${count === 1 ? "" : "s"} in your cart`} />
            <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:gap-14 lg:py-14">
                <section aria-label="Cart items" className="min-w-0">
                    {hasIssues && (
                        <Alert tone="warning" className="mb-4">
                            Some items need your attention before checkout — quantities may exceed available stock.
                        </Alert>
                    )}
                    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                        {items.map((item) => (
                            <CartLine key={item.product} item={item} line={lineFor(item.product)} />
                        ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap justify-between gap-3">
                        <Link to="/shop" className="text-sm font-semibold underline underline-offset-4">
                            Continue shopping
                        </Link>
                        <button type="button" onClick={() => setConfirmClear(true)} className="text-sm text-neutral-500 hover:text-red-700">
                            Clear cart
                        </button>
                    </div>
                </section>

                <aside aria-labelledby="summary-heading" className="h-fit bg-secondary/60 p-6 lg:sticky lg:top-28">
                    <h2 id="summary-heading" className="mb-5 text-lg font-semibold">
                        Order summary
                    </h2>
                    {isError ? (
                        <ErrorState error={error} onRetry={refetch} className="py-6" />
                    ) : isLoading || !quote ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ) : (
                        <div className={`space-y-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                            <TotalsTable
                                subtotal={quote.subtotal}
                                savings={quote.savings}
                                shipping={quote.shipping}
                                total={quote.total}
                            />
                            <FreeShippingNote quote={quote} />
                            <Button block size="lg" disabled={hasIssues || isFetching} onClick={() => navigate("/checkout")}>
                                Checkout <ArrowRight className="size-4" aria-hidden="true" />
                            </Button>
                            <p className="text-center text-xs text-neutral-500">Final prices and stock are confirmed when you place your order.</p>
                        </div>
                    )}
                </aside>
            </Container>

            <ConfirmDialog
                open={confirmClear}
                onClose={() => setConfirmClear(false)}
                title="Clear your cart?"
                message="All items will be removed from your cart."
                confirmLabel="Clear cart"
                onConfirm={() => {
                    dispatch(clearCart());
                    setConfirmClear(false);
                }}
            />
        </>
    );
}

export default Cart;
