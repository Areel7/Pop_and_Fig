import { useMemo, useState } from "react";
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import { ConfirmDialog } from "../../../components/common/Modal.jsx";
import { AdminPageHeader, Card, FilterSelect, IconButton, SearchInput, Table, TableSkeleton, td, th } from "../../../components/admin/AdminUI.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { useDeleteDiscountMutation, useGetAdminDiscountsQuery, useUpdateDiscountMutation } from "../../../redux/api/discountApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice, pluralize } from "../../../utils/format.js";
import { describeSchedule, getDiscountStatus } from "./discountUtils.js";
import DiscountFormModal from "./DiscountForm.jsx";

const STATUS_FILTERS = [
    ["all", "All statuses"],
    ["live", "Live"],
    ["scheduled", "Scheduled"],
    ["expired", "Expired"],
    ["inactive", "Inactive"],
];

function ActiveSwitch({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 ${
                checked ? "bg-neutral-900" : "bg-neutral-300"
            }`}
        >
            <span className={`inline-block size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </button>
    );
}

function AppliesTo({ discount }) {
    if (discount.appliesTo === "products" || discount.appliesTo === "categories") {
        const isProducts = discount.appliesTo === "products";
        const targets = ((isProducts ? discount.products : discount.categories) || []).filter(Boolean);
        const targetNames = targets.map((t) => t?.name).filter(Boolean);
        const shown = targetNames.slice(0, 2).join(", ");
        const more = targetNames.length - 2;
        return (
            <div className="min-w-0" title={targetNames.join(", ")}>
                <p className="font-medium">{pluralize(targets.length, isProducts ? "product" : "category", isProducts ? "products" : "categories")}</p>
                {shown && (
                    <p className="max-w-[220px] truncate text-xs text-neutral-500">
                        {shown}
                        {more > 0 ? ` +${more} more` : ""}
                    </p>
                )}
            </div>
        );
    }
    return <p className="font-medium">All products</p>;
}

// Fixed amounts are PKR; percentages are of the regular price.
function DiscountValue({ discount }) {
    return <p className="font-semibold tabular-nums">{discount.type === "percentage" ? `${discount.value}% off` : `${formatPrice(discount.value)} off`}</p>;
}

function MobileSkeleton() {
    return (
        <div className="space-y-3 md:hidden" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="mt-3 h-3 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
            ))}
        </div>
    );
}

function AdminDiscounts() {
    useDocumentTitle("Discounts & sales");
    const { data: discounts = [], isLoading, isError, error, refetch } = useGetAdminDiscountsQuery();
    const [updateDiscount] = useUpdateDiscountMutation();
    const [deleteDiscount, { isLoading: deleting }] = useDeleteDiscountMutation();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [formState, setFormState] = useState({ open: false, discount: null });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return discounts
            .map((discount) => ({ discount, status: getDiscountStatus(discount) }))
            .filter(({ discount, status: s }) => {
                if (status !== "all" && s.key !== status) return false;
                if (term && !`${discount.name} ${discount.description || ""}`.toLowerCase().includes(term)) return false;
                return true;
            });
    }, [discounts, search, status]);

    const filtersActive = search.trim() !== "" || status !== "all";
    const openCreate = () => setFormState({ open: true, discount: null });
    const openEdit = (discount) => setFormState({ open: true, discount });
    const closeForm = () => setFormState({ open: false, discount: null });
    const clearFilters = () => {
        setSearch("");
        setStatus("all");
    };

    const handleToggle = async (discount, next) => {
        setTogglingId(discount._id);
        try {
            await updateDiscount({ id: discount._id, isActive: next }).unwrap();
            toast.success(`"${discount.name}" ${next ? "activated" : "deactivated"}`);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteDiscount(pendingDelete._id).unwrap();
            toast.success(`"${pendingDelete.name}" deleted`);
            setPendingDelete(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const actions = (discount) => (
        <div className="flex items-center justify-end gap-1">
            <IconButton label={`Edit ${discount.name}`} icon={Pencil} onClick={() => openEdit(discount)} />
            <IconButton label={`Delete ${discount.name}`} icon={Trash2} tone="danger" onClick={() => setPendingDelete(discount)} />
        </div>
    );

    const activeSwitch = (discount) => (
        <ActiveSwitch
            checked={Boolean(discount.isActive)}
            onChange={(next) => handleToggle(discount, next)}
            disabled={togglingId === discount._id}
            label={`${discount.isActive ? "Deactivate" : "Activate"} ${discount.name}`}
        />
    );

    let content;
    if (isLoading) {
        content = (
            <>
                <div className="hidden md:block">
                    <Table minWidth="min-w-[900px]">
                        <TableSkeleton rows={5} cols={7} />
                    </Table>
                </div>
                <MobileSkeleton />
            </>
        );
    } else if (isError) {
        content = (
            <Card>
                <ErrorState error={error} title="Could not load discounts" onRetry={refetch} />
            </Card>
        );
    } else if (discounts.length === 0) {
        content = (
            <Card>
                <EmptyState
                    icon={BadgePercent}
                    title="No sales yet"
                    message="Run a sale campaign that lowers prices automatically on all products, selected products or selected categories."
                    action={
                        <Button onClick={openCreate}>
                            <Plus className="size-4" aria-hidden="true" /> Create your first sale
                        </Button>
                    }
                />
            </Card>
        );
    } else if (rows.length === 0) {
        content = (
            <Card>
                <EmptyState
                    icon={BadgePercent}
                    title="No matching discounts"
                    message="Try a different search or clear the filters."
                    action={
                        <Button variant="outline" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    }
                />
            </Card>
        );
    } else {
        content = (
            <>
                <div className="hidden md:block">
                    <Table minWidth="min-w-[900px]">
                        <thead>
                            <tr>
                                <th scope="col" className={th}>Discount</th>
                                <th scope="col" className={th}>Value</th>
                                <th scope="col" className={th}>Applies to</th>
                                <th scope="col" className={th}>Schedule</th>
                                <th scope="col" className={th}>Status</th>
                                <th scope="col" className={th}>Active</th>
                                <th scope="col" className={`${th} text-right`}>
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ discount, status: s }) => (
                                <tr key={discount._id} className="hover:bg-neutral-50/60">
                                    <td className={td}>
                                        <p className="max-w-[220px] truncate font-medium" title={discount.name}>
                                            {discount.name}
                                        </p>
                                        {discount.description && (
                                            <p className="max-w-[220px] truncate text-xs text-neutral-500" title={discount.description}>
                                                {discount.description}
                                            </p>
                                        )}
                                    </td>
                                    <td className={td}>
                                        <DiscountValue discount={discount} />
                                    </td>
                                    <td className={td}>
                                        <AppliesTo discount={discount} />
                                    </td>
                                    <td className={`${td} whitespace-nowrap text-neutral-600`}>{describeSchedule(discount)}</td>
                                    <td className={td}>
                                        <StatusBadge status={s.badge} label={s.label} />
                                    </td>
                                    <td className={td}>{activeSwitch(discount)}</td>
                                    <td className={`${td} text-right`}>{actions(discount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                <ul className="space-y-3 md:hidden">
                    {rows.map(({ discount, status: s }) => (
                        <li key={discount._id} className="rounded-xl border border-neutral-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium break-words">{discount.name}</p>
                                </div>
                                <StatusBadge status={s.badge} label={s.label} />
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div>
                                    <dt className="text-xs text-neutral-500">Value</dt>
                                    <dd>
                                        <DiscountValue discount={discount} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-neutral-500">Applies to</dt>
                                    <dd>
                                        <AppliesTo discount={discount} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-neutral-500">Schedule</dt>
                                    <dd>{describeSchedule(discount)}</dd>
                                </div>
                            </dl>
                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                                <div className="flex items-center gap-2 text-sm text-neutral-600">
                                    {activeSwitch(discount)}
                                    <span aria-hidden="true">{discount.isActive ? "Active" : "Off"}</span>
                                </div>
                                {actions(discount)}
                            </div>
                        </li>
                    ))}
                </ul>
            </>
        );
    }

    return (
        <div>
            <AdminPageHeader
                title="Discounts & sales"
                description="Sale campaigns lower product prices on the storefront automatically. Amounts are in PKR (₨). For a single product, use its own sale price instead."
                actions={
                    <Button onClick={openCreate}>
                        <Plus className="size-4" aria-hidden="true" /> New sale
                    </Button>
                }
            />

            {!isLoading && !isError && discounts.length > 0 && (
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search by name…" label="Search discounts" className="sm:max-w-xs sm:flex-1" />
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <FilterSelect value={status} onChange={setStatus} label="Filter by status">
                            {STATUS_FILTERS.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </FilterSelect>
                    </div>
                    {filtersActive && (
                        <p className="text-xs text-neutral-500 sm:ml-auto" aria-live="polite">
                            {pluralize(rows.length, "result")}
                        </p>
                    )}
                </div>
            )}

            {content}

            {formState.open && <DiscountFormModal discount={formState.discount} onClose={closeForm} />}

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Delete discount?"
                confirmLabel="Delete discount"
                message={
                    pendingDelete && (
                        <>
                            <span className="font-medium text-neutral-900">{pendingDelete.name}</span>
                            {" "}will be permanently removed. Affected products will return to their regular (or own sale) price.{" "}
                            Past orders are not changed.
                        </>
                    )
                }
            />
        </div>
    );
}

export default AdminDiscounts;
