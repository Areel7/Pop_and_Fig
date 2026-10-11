import { useId, useState } from "react";
import { Link } from "react-router";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    DollarSign,
    Package,
    Receipt,
    ShoppingBag,
    Star,
    Users,
} from "lucide-react";
import { useGetDashboardQuery } from "../../../redux/api/adminApi.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card, StatCard, Table, th, td } from "../../../components/admin/AdminUI.jsx";
import { ButtonLink } from "../../../components/common/Button.jsx";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { ORDER_STATUSES } from "../../../utils/orders.js";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice, formatPriceCompact, formatDate, pluralize, resolveImageUrl } from "../../../utils/format.js";

// Single-series charts use one validated hue (passes band/chroma/contrast on the white card surface).
const SERIES = "#2a78d6";
const SERIES_ACTIVE = "#1c5cab";
const RANGES = [7, 30, 90];

const numberFormat = new Intl.NumberFormat("en-US");
const formatCount = (value) => numberFormat.format(Number(value) || 0);

// "YYYY-MM-DD" keys are UTC days on the backend, so format them in UTC too.
const formatDay = (key, options = { month: "short", day: "numeric" }) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

// Rounds the axis maximum up to a clean step (1 / 2 / 2.5 / 5 × 10ⁿ).
const niceScale = (maxValue, { integer = false, count = 4 } = {}) => {
    if (!(maxValue > 0)) return { max: 1, ticks: [0, 1] };
    const raw = maxValue / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / magnitude;
    const steps = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
    let step = steps.find((s) => norm <= s) * magnitude;
    if (integer) step = Math.max(1, Math.ceil(step));
    const max = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let value = 0; value <= max + step / 2; value += step) ticks.push(value);
    return { max, ticks };
};

// ---------------------------------------------------------------------------
// Time series chart — area (line) or columns, with crosshair + tooltip and a table view.
// ---------------------------------------------------------------------------

function TimeChart({ data, valueKey, kind = "area", formatValue, formatTick, integer = false, seriesLabel }) {
    const [active, setActive] = useState(null);
    const liveId = useId();
    const n = data.length;
    const values = data.map((d) => Number(d[valueKey]) || 0);
    const { max, ticks } = niceScale(Math.max(0, ...values), { integer });

    const xAt = (i) => (kind === "bar" ? ((i + 0.5) / n) * 100 : n === 1 ? 50 : (i / (n - 1)) * 100);
    const yAt = (v) => 100 - (v / max) * 100;

    const indexFromPointer = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.9999);
        return kind === "bar" ? Math.floor(ratio * n) : Math.round(ratio * (n - 1));
    };

    const onKeyDown = (event) => {
        const moves = { ArrowLeft: -1, ArrowRight: 1 };
        if (event.key in moves) {
            event.preventDefault();
            setActive((current) => Math.min(Math.max((current ?? n - 1) + moves[event.key], 0), n - 1));
        } else if (event.key === "Home") {
            event.preventDefault();
            setActive(0);
        } else if (event.key === "End") {
            event.preventDefault();
            setActive(n - 1);
        }
    };

    const linePoints = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" L ");
    const areaPath = n > 1 ? `M ${xAt(0)},100 L ${linePoints} L ${xAt(n - 1)},100 Z` : "";
    const activePoint = active !== null ? data[active] : null;
    const activeX = active !== null ? xAt(active) : 0;
    const tooltipAlign = activeX < 18 ? "translate-x-0" : activeX > 82 ? "-translate-x-full" : "-translate-x-1/2";
    const labelIndexes = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

    return (
        <div>
            <div className="flex gap-2">
                {/* Y axis */}
                <div className="relative h-52 w-12 shrink-0 text-right text-[11px] text-neutral-500 tabular-nums" aria-hidden="true">
                    {ticks.map((tick) => (
                        <span key={tick} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${yAt(tick)}%` }}>
                            {formatTick(tick)}
                        </span>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className="relative h-52 cursor-crosshair touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                        tabIndex={0}
                        role="group"
                        aria-label={`${seriesLabel} chart. Use left and right arrow keys to read daily values.`}
                        aria-describedby={liveId}
                        onPointerMove={(event) => setActive(indexFromPointer(event))}
                        onPointerDown={(event) => setActive(indexFromPointer(event))}
                        onPointerLeave={() => setActive(null)}
                        onFocus={() => setActive((current) => current ?? n - 1)}
                        onBlur={() => setActive(null)}
                        onKeyDown={onKeyDown}
                    >
                        {/* Gridlines (hairline, solid) + baseline */}
                        {ticks.map((tick) => (
                            <div
                                key={tick}
                                className={`pointer-events-none absolute inset-x-0 h-px ${tick === 0 ? "bg-neutral-300" : "bg-neutral-100"}`}
                                style={{ top: `${yAt(tick)}%` }}
                                aria-hidden="true"
                            />
                        ))}

                        {kind === "bar" ? (
                            <div className={`pointer-events-none absolute inset-0 flex items-end ${n > 45 ? "gap-px" : "gap-0.5"}`} aria-hidden="true">
                                {values.map((v, i) => (
                                    <div key={data[i].date} className="flex h-full min-w-0 flex-1 items-end justify-center">
                                        <div
                                            className={`w-full max-w-6 ${n > 45 ? "rounded-t-[1px]" : "rounded-t"}`}
                                            style={{
                                                height: `${(v / max) * 100}%`,
                                                backgroundColor: active === i ? SERIES_ACTIVE : SERIES,
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <svg
                                className="pointer-events-none absolute inset-0 size-full overflow-visible"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                {n > 1 && (
                                    <>
                                        <path d={areaPath} fill={SERIES} fillOpacity="0.1" />
                                        <path
                                            d={`M ${linePoints}`}
                                            fill="none"
                                            stroke={SERIES}
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    </>
                                )}
                            </svg>
                        )}

                        {activePoint && (
                            <>
                                <div className="pointer-events-none absolute inset-y-0 w-px bg-neutral-400" style={{ left: `${activeX}%` }} aria-hidden="true" />
                                {kind !== "bar" && (
                                    <div
                                        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                                        style={{ left: `${activeX}%`, top: `${yAt(values[active])}%`, backgroundColor: SERIES }}
                                        aria-hidden="true"
                                    />
                                )}
                                <div
                                    className={`pointer-events-none absolute top-1 z-10 rounded-lg border border-neutral-200 bg-white px-3 py-2 whitespace-nowrap shadow-md ${tooltipAlign}`}
                                    style={{ left: `${activeX}%` }}
                                    aria-hidden="true"
                                >
                                    <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900 tabular-nums">
                                        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES }} />
                                        {formatValue(values[active])}
                                    </p>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        {seriesLabel} · {formatDay(activePoint.date, { weekday: "short", month: "short", day: "numeric" })}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* X axis */}
                    <div className="relative mt-2 h-4 text-[11px] text-neutral-500 tabular-nums" aria-hidden="true">
                        {labelIndexes.map((i, position) => (
                            <span
                                key={i}
                                className={`absolute top-0 whitespace-nowrap ${
                                    position === 0 ? "translate-x-0" : position === labelIndexes.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                                }`}
                                style={{ left: `${position === 0 ? 0 : position === labelIndexes.length - 1 ? 100 : xAt(i)}%` }}
                            >
                                {formatDay(data[i].date)}
                            </span>
                        ))}
                    </div>
                    <p id={liveId} className="sr-only" aria-live="polite">
                        {activePoint ? `${formatDay(activePoint.date, { month: "long", day: "numeric" })}: ${formatValue(values[active])}` : ""}
                    </p>
                </div>
            </div>

            <details className="group mt-4 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-900">View as table</summary>
                <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-neutral-200">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0">
                            <tr>
                                <th scope="col" className={th}>Date</th>
                                <th scope="col" className={`${th} text-right`}>{seriesLabel}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={row.date}>
                                    <td className={`${td} py-2`}>{formatDay(row.date, { year: "numeric", month: "short", day: "numeric" })}</td>
                                    <td className={`${td} py-2 text-right tabular-nums`}>{formatValue(values[i])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}

function ChartSummary({ label, value }) {
    return (
        <div className="text-right">
            <p className="text-lg font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-neutral-500">{label}</p>
        </div>
    );
}

// Horizontal magnitude bar (one hue; the value is always printed beside it).
function MeterBar({ value, max, label }) {
    const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
    return (
        <div className="h-2 w-full rounded-full bg-neutral-100" role="presentation" title={label}>
            <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: SERIES }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function StatusBreakdown({ statusCounts }) {
    const statuses = [...ORDER_STATUSES, ...Object.keys(statusCounts).filter((s) => !ORDER_STATUSES.includes(s))];
    const total = statuses.reduce((sum, s) => sum + (statusCounts[s] || 0), 0);
    const max = Math.max(0, ...statuses.map((s) => statusCounts[s] || 0));

    if (total === 0) {
        return <p className="py-8 text-center text-sm text-neutral-500">No orders yet.</p>;
    }

    return (
        <ul className="space-y-3.5">
            {statuses.map((status) => {
                const count = statusCounts[status] || 0;
                const share = Math.round((count / total) * 100);
                return (
                    <li key={status}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                            <Link to={`${adminPath("orders")}?status=${status}`} className="rounded-full hover:opacity-80">
                                <StatusBadge status={status} />
                            </Link>
                            <p className="text-sm text-neutral-500 tabular-nums">
                                <span className="font-semibold text-neutral-900">{formatCount(count)}</span> · {share}%
                            </p>
                        </div>
                        <MeterBar value={count} max={max} label={`${status}: ${count} orders`} />
                    </li>
                );
            })}
        </ul>
    );
}

const isObjectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

function TopProducts({ products }) {
    if (!products.length) {
        return <p className="py-8 text-center text-sm text-neutral-500">No products have sold yet.</p>;
    }
    const max = Math.max(...products.map((p) => p.quantity || 0));
    return (
        <ol className="space-y-4">
            {products.map((product, index) => (
                <li key={String(product._id ?? index)} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-semibold text-neutral-400 tabular-nums">{index + 1}</span>
                    <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {product.image && <img src={resolveImageUrl(product.image)} alt="" className="size-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                            {isObjectId(product._id) ? (
                                <Link to={adminPath(`products/${product._id}/edit`)} className="truncate text-sm font-medium hover:underline">
                                    {product.name}
                                </Link>
                            ) : (
                                <p className="truncate text-sm font-medium">{product.name}</p>
                            )}
                            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCount(product.quantity)} sold</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                            <MeterBar value={product.quantity || 0} max={max} label={`${product.quantity} units sold`} />
                            <span className="w-20 shrink-0 text-right text-xs text-neutral-500 tabular-nums">{formatPrice(product.revenue)}</span>
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function TopCustomers({ customers }) {
    if (!customers.length) {
        return <p className="py-8 text-center text-sm text-neutral-500">No customer purchases yet.</p>;
    }
    const max = Math.max(...customers.map((c) => c.totalSpent || 0));
    return (
        <ol className="space-y-4">
            {customers.map((customer, index) => {
                const linkable = isObjectId(customer._id) && customer.name;
                return (
                    <li key={String(customer._id ?? index)} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-xs font-semibold text-neutral-400 tabular-nums">{index + 1}</span>
                        <span
                            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-neutral-700"
                            aria-hidden="true"
                        >
                            {(customer.name || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                                <div className="min-w-0">
                                    {linkable ? (
                                        <Link to={adminPath(`customers/${customer._id}`)} className="block truncate text-sm font-medium hover:underline">
                                            {customer.name}
                                        </Link>
                                    ) : (
                                        <p className="truncate text-sm font-medium text-neutral-500">{customer.name || "Deleted customer"}</p>
                                    )}
                                    <p className="truncate text-xs text-neutral-500">
                                        {customer.email ? `${customer.email} · ` : ""}
                                        {pluralize(customer.orders || 0, "order")}
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(customer.totalSpent)}</p>
                            </div>
                            <div className="mt-1.5">
                                <MeterBar value={customer.totalSpent || 0} max={max} label={`${formatPrice(customer.totalSpent)} spent`} />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function RecentOrders({ orders }) {
    if (!orders.length) {
        return <EmptyState icon={Receipt} title="No orders yet" message="New orders will appear here as soon as customers check out." />;
    }
    return (
        <Table minWidth="min-w-[560px]">
            <thead>
                <tr>
                    <th scope="col" className={th}>Order</th>
                    <th scope="col" className={th}>Customer</th>
                    <th scope="col" className={th}>Status</th>
                    <th scope="col" className={`${th} text-right`}>Total</th>
                    <th scope="col" className={`${th} text-right`}>Date</th>
                </tr>
            </thead>
            <tbody>
                {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-neutral-50">
                        <td className={td}>
                            <Link to={adminPath(`orders/${order._id}`)} className="font-medium whitespace-nowrap hover:underline">
                                #{order.orderNumber}
                            </Link>
                        </td>
                        <td className={`${td} max-w-[180px] truncate`}>{order.customer?.name || "—"}</td>
                        <td className={td}>
                            <StatusBadge status={order.status} />
                        </td>
                        <td className={`${td} text-right font-medium tabular-nums`}>{formatPrice(order.total)}</td>
                        <td className={`${td} text-right whitespace-nowrap text-neutral-500`}>{formatDate(order.createdAt)}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

function RangeSelector({ value, onChange }) {
    return (
        <div role="group" aria-label="Chart date range" className="inline-flex rounded-lg border border-neutral-300 bg-white p-1">
            {RANGES.map((days) => (
                <button
                    key={days}
                    type="button"
                    onClick={() => onChange(days)}
                    aria-pressed={value === days}
                    className={`min-h-8 rounded-md px-3 text-xs font-semibold transition ${
                        value === days ? "bg-primary text-on-primary" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                >
                    {days} days
                </button>
            ))}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading dashboard">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="mt-4 h-7 w-28 rounded" />
                        <Skeleton className="mt-2 h-3 w-20 rounded" />
                    </div>
                ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {[0, 1].map((i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="mt-6 h-52 w-full rounded-lg" />
                    </div>
                ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-6 lg:col-span-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="mt-4 h-8 w-full rounded" />
                    ))}
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-6">
                    <Skeleton className="h-4 w-32 rounded" />
                    {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="mt-5 h-6 w-full rounded" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Dashboard() {
    useDocumentTitle("Dashboard · Admin");
    const [days, setDays] = useState(30);
    const { data, isLoading, isFetching, error, refetch } = useGetDashboardQuery({ days });

    const header = (
        <AdminPageHeader
            title="Dashboard"
            description="A live overview of sales, orders and customers."
            actions={
                <ButtonLink to={adminPath("products/new")} variant="primary" size="sm">
                    <Package className="size-4" aria-hidden="true" /> Add product
                </ButtonLink>
            }
        />
    );

    if (isLoading) {
        return (
            <>
                {header}
                <DashboardSkeleton />
            </>
        );
    }

    if (error && !data) {
        return (
            <>
                {header}
                <div className="rounded-xl border border-neutral-200 bg-white">
                    <ErrorState error={error} title="Couldn't load the dashboard" onRetry={refetch} />
                </div>
            </>
        );
    }

    const { stats, statusCounts = {}, timeline = [], topProducts = [], topCustomers = [], recentOrders = [], range } = data;
    const rangeDays = range?.days || days;
    const rangeRevenue = timeline.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
    const rangeOrders = timeline.reduce((sum, d) => sum + (Number(d.orders) || 0), 0);
    const stockIssues = (stats.lowStockProducts || 0) + (stats.outOfStockProducts || 0);
    // Refetching for a new range keeps the previous render, dimmed, instead of flashing skeletons.
    const refreshing = isFetching ? "opacity-60 transition-opacity" : "transition-opacity";

    return (
        <>
            {header}

            {error && (
                <Alert tone="error" className="mb-6 rounded-lg">
                    Showing the last loaded data — the latest refresh failed.{" "}
                    <button type="button" onClick={refetch} className="font-semibold underline">
                        Try again
                    </button>
                </Alert>
            )}

            <h2 className="sr-only">Store totals</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatCard label="Total revenue" value={formatPrice(stats.totalRevenue)} icon={DollarSign} tone="accent" hint="All time · excludes cancelled" />
                <StatCard label="Total orders" value={formatCount(stats.totalOrders)} icon={ShoppingBag} hint="All time" />
                <StatCard label="Avg. order value" value={formatPrice(stats.averageOrderValue)} icon={Receipt} hint="Non-cancelled orders" />
                <StatCard label="Total customers" value={formatCount(stats.totalCustomers)} icon={Users} hint="Registered accounts" />
                <StatCard
                    label="Pending orders"
                    value={formatCount(stats.pendingOrders)}
                    icon={Clock}
                    tone="amber"
                    hint={stats.pendingOrders > 0 ? "Awaiting confirmation" : "Nothing waiting"}
                />
                <StatCard label="Completed orders" value={formatCount(stats.completedOrders)} icon={CheckCircle2} tone="green" hint="Fulfilled & closed" />
                <StatCard
                    label="Total products"
                    value={formatCount(stats.totalProducts)}
                    icon={Package}
                    tone={stockIssues > 0 ? "amber" : "neutral"}
                    hint={`${formatCount(stats.lowStockProducts)} low · ${formatCount(stats.outOfStockProducts)} out of stock`}
                />
                <StatCard label="Total reviews" value={formatCount(stats.totalReviews)} icon={Star} hint="Across all products" />
            </div>

            {stockIssues > 0 && (
                <Alert tone="warning" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                        {stats.outOfStockProducts > 0 && <>{pluralize(stats.outOfStockProducts, "product")} out of stock. </>}
                        {stats.lowStockProducts > 0 && <>{pluralize(stats.lowStockProducts, "product")} running low (5 or fewer left).</>}
                    </span>
                    <span className="flex gap-3 text-sm font-semibold">
                        {stats.outOfStockProducts > 0 && (
                            <Link to={`${adminPath("products")}?stock=out`} className="underline">
                                View out of stock
                            </Link>
                        )}
                        {stats.lowStockProducts > 0 && (
                            <Link to={`${adminPath("products")}?stock=low`} className="underline">
                                View low stock
                            </Link>
                        )}
                    </span>
                </Alert>
            )}

            {/* Range filter scopes the trend charts below it. */}
            <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Sales trend</h2>
                    <p className="text-xs text-neutral-500">
                        Daily figures for the last {rangeDays} days{range?.since ? `, since ${formatDate(range.since)}` : ""} (UTC days).
                    </p>
                </div>
                <RangeSelector value={days} onChange={setDays} />
            </div>

            <div className={`grid gap-6 lg:grid-cols-2 ${refreshing}`} aria-busy={isFetching || undefined}>
                <Card
                    title="Revenue over time"
                    description="Excludes cancelled orders"
                    actions={<ChartSummary label={`Last ${rangeDays} days`} value={formatPrice(rangeRevenue)} />}
                >
                    {rangeRevenue > 0 ? (
                        <TimeChart
                            data={timeline}
                            valueKey="revenue"
                            kind="area"
                            seriesLabel="Revenue"
                            formatValue={formatPrice}
                            formatTick={formatPriceCompact}
                        />
                    ) : (
                        <p className="flex h-52 items-center justify-center text-sm text-neutral-500">No revenue in the last {rangeDays} days.</p>
                    )}
                </Card>
                <Card
                    title="Orders over time"
                    description="All orders placed, including cancelled"
                    actions={<ChartSummary label={`Last ${rangeDays} days`} value={formatCount(rangeOrders)} />}
                >
                    {rangeOrders > 0 ? (
                        <TimeChart
                            data={timeline}
                            valueKey="orders"
                            kind="bar"
                            integer
                            seriesLabel="Orders"
                            formatValue={(v) => pluralize(v, "order")}
                            formatTick={formatCount}
                        />
                    ) : (
                        <p className="flex h-52 items-center justify-center text-sm text-neutral-500">No orders in the last {rangeDays} days.</p>
                    )}
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card
                    title="Recent orders"
                    description="The latest orders across all statuses"
                    className="lg:col-span-2"
                    bodyClassName="p-4 sm:p-5"
                    actions={
                        <ButtonLink to={adminPath("orders")} variant="ghost" size="sm">
                            View all
                        </ButtonLink>
                    }
                >
                    <RecentOrders orders={recentOrders} />
                </Card>
                <Card title="Order status breakdown" description="All time · share of total orders">
                    <StatusBreakdown statusCounts={statusCounts} />
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card title="Top selling products" description="All time · by units sold (revenue on the right)">
                    <TopProducts products={topProducts} />
                </Card>
                <Card
                    title="Top Customers by Total Spending"
                    description="All time · excludes cancelled orders"
                    actions={
                        <ButtonLink to={adminPath("customers")} variant="ghost" size="sm">
                            All customers
                        </ButtonLink>
                    }
                >
                    <TopCustomers customers={topCustomers} />
                </Card>
            </div>
        </>
    );
}

export default Dashboard;
