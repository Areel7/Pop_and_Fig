import { Link, useSearchParams } from "react-router";
import { Eye, Users } from "lucide-react";
import { useGetCustomersQuery } from "../../../redux/api/customerApi.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card, FilterSelect, IconButton, SearchInput, Table, TableSkeleton, td, th } from "../../../components/admin/AdminUI.jsx";
import { EmptyState, ErrorState } from "../../../components/common/Feedback.jsx";
import Button from "../../../components/common/Button.jsx";
import Pagination from "../../../components/common/Pagination.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { useDebounce, useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice, formatDate } from "../../../utils/format.js";

const LIMIT = 20;
const SORTS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "spending", label: "Highest spending" },
    { value: "orders", label: "Most orders" },
    { value: "name", label: "Name (A–Z)" },
];
const STATUSES = ["active", "blocked"];
const COLUMNS = ["Customer", "Phone", "Registered", "Orders", "Total spent", "Last order", "Status", ""];

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

function AdminCustomers() {
    useDocumentTitle("Customers · Admin");
    const [searchParams, updateParams] = useListParams();

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const statusParam = searchParams.get("status") || "";
    const status = STATUSES.includes(statusParam) ? statusParam : "";
    const sortParam = searchParams.get("sort") || "newest";
    const sort = SORTS.some((s) => s.value === sortParam) ? sortParam : "newest";
    const search = searchParams.get("q") || "";
    const debouncedSearch = useDebounce(search.trim(), 350);

    const { data, isLoading, isFetching, isError, error, refetch } = useGetCustomersQuery({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sort,
    });

    const items = data?.items || [];
    const meta = data?.meta;
    const hasFilters = Boolean(search || status);
    const clearFilters = () => updateParams({ q: "", status: "" });

    return (
        <div>
            <AdminPageHeader
                title="Customers"
                description={meta ? `${meta.total} ${meta.total === 1 ? "customer" : "customers"} match the current filters.` : "Registered shoppers and their order history."}
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput
                    value={search}
                    onChange={(value) => updateParams({ q: value })}
                    placeholder="Search name, email or phone"
                    label="Search customers"
                    className="w-full sm:max-w-sm sm:flex-1"
                />
                <FilterSelect value={status} onChange={(value) => updateParams({ status: value })} label="Filter by account status" className="w-full sm:w-auto">
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                </FilterSelect>
                <FilterSelect
                    value={sort}
                    onChange={(value) => updateParams({ sort: value === "newest" ? "" : value })}
                    label="Sort customers"
                    className="w-full sm:w-auto"
                >
                    {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                            Sort: {s.label}
                        </option>
                    ))}
                </FilterSelect>
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear filters
                    </Button>
                )}
            </div>

            {isError ? (
                <Card>
                    <ErrorState error={error} title="Couldn't load customers" onRetry={refetch} />
                </Card>
            ) : !isLoading && items.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Users}
                        title={page > 1 ? "No customers on this page" : hasFilters ? "No matching customers" : "No customers yet"}
                        message={
                            page > 1
                                ? "This page is empty. Go back to the first page."
                                : hasFilters
                                  ? "Try a different search term or clear the filters."
                                  : "Customers appear here once they create an account."
                        }
                        action={
                            page > 1 ? (
                                <Button variant="outline" size="sm" onClick={() => updateParams({ page: 1 })}>
                                    Go to first page
                                </Button>
                            ) : hasFilters ? (
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                            ) : null
                        }
                    />
                </Card>
            ) : (
                <>
                    <div className={`transition-opacity ${isFetching && !isLoading ? "opacity-60" : ""}`} aria-busy={isFetching}>
                        <Table minWidth="min-w-[960px]">
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
                                    {items.map((customer) => (
                                        <tr key={customer._id} className="hover:bg-neutral-50">
                                            <td className={td}>
                                                <Link to={adminPath(`customers/${customer._id}`)} className="block max-w-[240px] truncate font-medium hover:underline">
                                                    {customer.name || "Unnamed customer"}
                                                </Link>
                                                <p className="max-w-[240px] truncate text-xs text-neutral-500">{customer.email}</p>
                                            </td>
                                            <td className={`${td} whitespace-nowrap text-neutral-600`}>{customer.phone || "—"}</td>
                                            <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDate(customer.createdAt)}</td>
                                            <td className={`${td} tabular-nums`}>{customer.totalOrders ?? 0}</td>
                                            <td className={`${td} font-medium whitespace-nowrap tabular-nums`}>{formatPrice(customer.totalSpent)}</td>
                                            <td className={`${td} whitespace-nowrap text-neutral-600`}>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</td>
                                            <td className={td}>
                                                <StatusBadge status={customer.status} />
                                            </td>
                                            <td className={`${td} text-right`}>
                                                <IconButton
                                                    as={Link}
                                                    to={adminPath(`customers/${customer._id}`)}
                                                    icon={Eye}
                                                    label={`View ${customer.name || customer.email}`}
                                                />
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

export default AdminCustomers;
