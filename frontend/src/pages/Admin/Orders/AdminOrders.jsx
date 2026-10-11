import { Link, useSearchParams } from "react-router";
import { Eye, ShoppingBag } from "lucide-react";
import { useGetAdminOrdersQuery } from "../../../redux/api/orderApi.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card, FilterSelect, IconButton, SearchInput, Table, TableSkeleton, td, th } from "../../../components/admin/AdminUI.jsx";
import { EmptyState, ErrorState } from "../../../components/common/Feedback.jsx";
import Button from "../../../components/common/Button.jsx";
import Pagination from "../../../components/common/Pagination.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { ORDER_STATUSES } from "../../../utils/orders.js";
import { useDebounce, useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice, capitalize, formatDate } from "../../../utils/format.js";

const LIMIT = 20;
const EMAIL_STATUSES = [
    { value: "sent", label: "Sent" },
    { value: "failed", label: "Failed" },
    { value: "pending", label: "Pending" },
    { value: "not_sent", label: "Not sent" },
];
const COLUMNS = ["Order #", "Customer", "Date", "Items", "Total", "Payment", "Status", "Email", ""];

// Keeps list filters in the URL; any filter change resets pagination unless the page itself is set.
const useListParams = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const update = (updates, { replace = true } = {}) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (!("page" in updates)) next.delete("page");
                Object.entries(updates).forEach(([key, value]) => {
                    if (value === "" || value === null || value === undefined || (key === "page" && Number(value) <= 1)) next.delete(key);
                    else next.set(key, String(value));
                });
                return next;
            },
            { replace }
        );
    };
    return [searchParams, update];
};

function AdminOrders() {
    useDocumentTitle("Orders · Admin");
    const [searchParams, updateParams] = useListParams();

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const statusParam = searchParams.get("status") || "all";
    const status = statusParam === "all" || ORDER_STATUSES.includes(statusParam) ? statusParam : "all";
    const emailParam = searchParams.get("email") || "";
    const emailStatus = EMAIL_STATUSES.some((e) => e.value === emailParam) ? emailParam : "";
    const search = searchParams.get("q") || "";
    const customer = /^[a-f\d]{24}$/i.test(searchParams.get("customer") || "") ? searchParams.get("customer") : "";
    const debouncedSearch = useDebounce(search.trim(), 350);

    const { data, isLoading, isFetching, isError, error, refetch } = useGetAdminOrdersQuery({
        page,
        limit: LIMIT,
        status,
        search: debouncedSearch || undefined,
        emailStatus: emailStatus || undefined,
        customer: customer || undefined,
    });

    const items = data?.items || [];
    const meta = data?.meta;
    const statusCounts = meta?.statusCounts || {};
    const allCount = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
    const hasFilters = Boolean(search || emailStatus || customer || status !== "all");

    const tabs = [{ value: "all", label: "All", count: allCount }, ...ORDER_STATUSES.map((s) => ({ value: s, label: capitalize(s), count: statusCounts[s] || 0 }))];

    return (
        <div>
            <AdminPageHeader
                title="Orders"
                description={meta ? `${meta.total} ${meta.total === 1 ? "order" : "orders"} match the current filters.` : "Review and fulfil customer orders."}
            />

            <div className="relative -mx-1 mb-4 overflow-x-auto px-1 pb-1">
                <div role="group" aria-label="Filter by order status" className="flex w-max gap-1.5">
                    {tabs.map((tab) => {
                        const active = tab.value === status;
                        return (
                            <button
                                key={tab.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => updateParams({ status: tab.value === "all" ? "" : tab.value })}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                                    active ? "border-primary bg-primary text-on-primary" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                                }`}
                            >
                                {tab.label}
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${
                                        active ? "bg-white/20 text-on-primary" : "bg-neutral-100 text-neutral-600"
                                    }`}
                                >
                                    {meta ? tab.count : "–"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    value={search}
                    onChange={(value) => updateParams({ q: value })}
                    placeholder="Search order #, name, email or phone"
                    label="Search orders"
                    className="w-full sm:max-w-sm sm:flex-1"
                />
                <FilterSelect value={emailStatus} onChange={(value) => updateParams({ email: value })} label="Filter by email status" className="w-full sm:w-auto">
                    <option value="">All email statuses</option>
                    {EMAIL_STATUSES.map((e) => (
                        <option key={e.value} value={e.value}>
                            Email: {e.label}
                        </option>
                    ))}
                </FilterSelect>
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={() => updateParams({ q: "", email: "", status: "", customer: "" })}>
                        Clear filters
                    </Button>
                )}
            </div>

            {isError ? (
                <Card>
                    <ErrorState error={error} title="Couldn't load orders" onRetry={refetch} />
                </Card>
            ) : !isLoading && items.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={ShoppingBag}
                        title={page > 1 ? "No orders on this page" : hasFilters ? "No matching orders" : "No orders yet"}
                        message={
                            page > 1
                                ? "This page is empty. Go back to the first page."
                                : hasFilters
                                  ? "Try a different search term or clear the filters."
                                  : "Orders placed on the storefront will appear here."
                        }
                        action={
                            page > 1 ? (
                                <Button variant="outline" size="sm" onClick={() => updateParams({ page: 1 })}>
                                    Go to first page
                                </Button>
                            ) : hasFilters ? (
                                <Button variant="outline" size="sm" onClick={() => updateParams({ q: "", email: "", status: "" })}>
                                    Clear filters
                                </Button>
                            ) : null
                        }
                    />
                </Card>
            ) : (
                <>
                    <div className={`transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`} aria-busy={isFetching}>
                        <Table minWidth="min-w-[1040px]">
                            <thead>
                                <tr>
                                    {COLUMNS.map((col, index) => (
                                        <th key={col || index} scope="col" className={th}>
                                            {col || <span className="sr-only">Actions</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            {isLoading ? (
                                <TableSkeleton rows={8} cols={COLUMNS.length} />
                            ) : (
                                <tbody>
                                    {items.map((order) => (
                                        <tr key={order._id} className="hover:bg-neutral-50">
                                            <td className={`${td} font-medium whitespace-nowrap`}>
                                                <Link to={adminPath(`orders/${order._id}`)} className="hover:underline">
                                                    {order.orderNumber}
                                                </Link>
                                            </td>
                                            <td className={td}>
                                                <p className="max-w-[220px] truncate font-medium">{order.customer?.name || "—"}</p>
                                                <p className="max-w-[220px] truncate text-xs text-neutral-500">{order.customer?.email}</p>
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
                                            <td className={td}>
                                                {order.status === "completed" ? (
                                                    <StatusBadge status={order.emailStatus} />
                                                ) : (
                                                    <span className="text-neutral-400" aria-label="Not applicable">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`${td} text-right`}>
                                                <IconButton as={Link} to={adminPath(`orders/${order._id}`)} icon={Eye} label={`View order ${order.orderNumber}`} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                        </Table>
                    </div>
                    {meta && <Pagination page={meta.page} pages={meta.pages} onChange={(p) => updateParams({ page: p }, { replace: false })} className="mt-6" />}
                </>
            )}
        </div>
    );
}

export default AdminOrders;
