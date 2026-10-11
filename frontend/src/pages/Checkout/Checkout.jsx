import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Banknote, Lock } from "lucide-react";
import { toast } from "react-toastify";
import Container from "../../components/common/Container.jsx";
import Button from "../../components/common/Button.jsx";
import { Alert, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { Input, Textarea } from "../../components/forms/Field.jsx";
import { useCartQuote } from "../../hooks/useCartQuote.js";
import { TotalsTable } from "../../components/orders/OrderParts.jsx";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { clearCart } from "../../redux/features/cart/cartSlice.js";
import { useCreateOrderMutation } from "../../redux/api/orderApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, resolveImageUrl } from "../../utils/format.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialValues = (user) => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.shippingAddress?.address || "",
    city: user?.shippingAddress?.city || "",
    state: user?.shippingAddress?.state || "",
    postalCode: user?.shippingAddress?.postalCode || "",
    country: user?.shippingAddress?.country || "",
    notes: "",
});

const validate = (v) => {
    const errors = {};
    if (v.name.trim().length < 2) errors.name = "Enter your full name";
    if (!EMAIL.test(v.email.trim())) errors.email = "Enter a valid email address";
    if (!/^[+()\d\s.-]{7,30}$/.test(v.phone.trim())) errors.phone = "Enter a valid phone number";
    if (v.address.trim().length < 3) errors.address = "Enter your street address";
    if (!v.city.trim()) errors.city = "Enter your city";
    if (!v.state.trim()) errors.state = "Enter your state or province";
    if (v.postalCode.trim().length < 2) errors.postalCode = "Enter your postal code";
    if (!v.country.trim()) errors.country = "Enter your country";
    return errors;
};

function Checkout() {
    useDocumentTitle("Checkout");
    const user = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { items, quote, isLoading, isFetching, isError, error, refetch } = useCartQuote();
    const [createOrder, { isLoading: placing, error: orderError }] = useCreateOrderMutation();
    const [values, setValues] = useState(() => initialValues(user));
    const [errors, setErrors] = useState({});
    const [placed, setPlaced] = useState(false);

    if (items.length === 0 && !placed) return <Navigate to="/cart" replace />;

    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = validate(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            document.getElementById(`checkout-${Object.keys(nextErrors)[0]}`)?.focus();
            return;
        }

        try {
            const order = await createOrder({
                // Only product IDs and quantities are sent — the server calculates every price.
                items: items.map(({ product, quantity }) => ({ product, quantity })),
                customer: { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
                shippingAddress: {
                    address: values.address.trim(),
                    city: values.city.trim(),
                    state: values.state.trim(),
                    postalCode: values.postalCode.trim(),
                    country: values.country.trim(),
                },
                notes: values.notes.trim() || undefined,
            }).unwrap();
            setPlaced(true);
            dispatch(clearCart());
            toast.success(`Order ${order.orderNumber} placed!`);
            navigate(`/account/orders/${order._id}`, { replace: true, state: { placed: true } });
        } catch {
            refetch();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const hasIssues = (quote?.issues?.length || 0) > 0;

    return (
        <Container className="py-10 sm:py-14">
            <div className="mb-10">
                <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-500">SECURE CHECKOUT</p>
                <h1 className="text-4xl leading-none font-medium tracking-[-0.05em] sm:text-6xl">Checkout</h1>
            </div>

            <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
                <div className="min-w-0 space-y-10">
                    {orderError && (
                        <Alert tone="error">
                            {getErrorMessage(orderError)} {orderError.status === 409 && <Link to="/cart" className="font-semibold underline">Review your cart</Link>}
                        </Alert>
                    )}

                    <fieldset>
                        <legend className="mb-5 text-lg font-semibold">Contact information</legend>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input id="checkout-name" label="Full name" autoComplete="name" required value={values.name} onChange={set("name")} error={errors.name} className="sm:col-span-2" />
                            <Input id="checkout-email" label="Email" type="email" autoComplete="email" required value={values.email} onChange={set("email")} error={errors.email} hint="Your order confirmation is sent here" />
                            <Input id="checkout-phone" label="Phone" type="tel" autoComplete="tel" required value={values.phone} onChange={set("phone")} error={errors.phone} />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="mb-5 text-lg font-semibold">Shipping address</legend>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input id="checkout-address" label="Street address" autoComplete="street-address" required value={values.address} onChange={set("address")} error={errors.address} className="sm:col-span-2" />
                            <Input id="checkout-city" label="City" autoComplete="address-level2" required value={values.city} onChange={set("city")} error={errors.city} />
                            <Input id="checkout-state" label="State / province" autoComplete="address-level1" required value={values.state} onChange={set("state")} error={errors.state} />
                            <Input id="checkout-postalCode" label="Postal code" autoComplete="postal-code" required value={values.postalCode} onChange={set("postalCode")} error={errors.postalCode} />
                            <Input id="checkout-country" label="Country" autoComplete="country-name" required value={values.country} onChange={set("country")} error={errors.country} />
                            <Textarea label="Order notes (optional)" rows={3} maxLength={500} value={values.notes} onChange={set("notes")} className="sm:col-span-2" />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="mb-5 text-lg font-semibold">Payment</legend>
                        <label className="flex items-center gap-4 border border-neutral-900 p-4">
                            <input type="radio" name="payment" checked readOnly className="size-4 accent-neutral-900" />
                            <Banknote className="size-5 shrink-0" aria-hidden="true" />
                            <span>
                                <span className="block text-sm font-semibold">Cash on delivery</span>
                                <span className="block text-xs text-neutral-500">Pay when your order arrives.</span>
                            </span>
                        </label>
                    </fieldset>
                </div>

                <aside aria-labelledby="checkout-summary" className="h-fit bg-secondary/60 p-6 lg:sticky lg:top-28">
                    <h2 id="checkout-summary" className="mb-5 text-lg font-semibold">
                        Your order
                    </h2>
                    {isError ? (
                        <ErrorState error={error} onRetry={refetch} className="py-6" />
                    ) : isLoading || !quote ? (
                        <div className="space-y-3">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <div className={`space-y-5 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                            <ul className="max-h-80 divide-y divide-neutral-200 overflow-y-auto">
                                {quote.items.map((line) => (
                                    <li key={line.productId} className="flex gap-3 py-3">
                                        <div className="relative size-14 shrink-0 bg-white">
                                            {line.image && <img src={resolveImageUrl(line.image)} alt="" className="size-full object-cover" />}
                                            <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                                                {line.quantity}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="line-clamp-2 font-medium">{line.name || "Unavailable product"}</p>
                                            {line.issue && <p className="text-xs text-red-700">{line.issue}</p>}
                                        </div>
                                        {line.available && <p className="text-sm font-semibold">{formatPrice(line.lineTotal)}</p>}
                                    </li>
                                ))}
                            </ul>
                            <TotalsTable
                                subtotal={quote.subtotal}
                                savings={quote.savings}
                                shipping={quote.shipping}
                                total={quote.total}
                            />
                            {hasIssues && (
                                <Alert tone="warning">
                                    Some items are unavailable in the requested quantity. <Link to="/cart" className="font-semibold underline">Update your cart</Link>
                                </Alert>
                            )}
                            <Button type="submit" block size="lg" loading={placing} disabled={hasIssues || isFetching}>
                                <Lock className="size-4" aria-hidden="true" /> Place order · {formatPrice(quote.total)}
                            </Button>
                            <p className="text-center text-xs text-neutral-500">Totals are recalculated securely by our server when you place the order.</p>
                        </div>
                    )}
                </aside>
            </form>
        </Container>
    );
}

export default Checkout;
