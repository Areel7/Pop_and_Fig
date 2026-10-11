import { useId, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../../components/common/Modal.jsx";
import Button from "../../../components/common/Button.jsx";
import { Alert, Skeleton } from "../../../components/common/Feedback.jsx";
import { Input, Select, Textarea, Toggle } from "../../../components/forms/Field.jsx";
import { SearchInput } from "../../../components/admin/AdminUI.jsx";
import { useCreateDiscountMutation, useUpdateDiscountMutation } from "../../../redux/api/discountApi.js";
import { useGetProductsQuery } from "../../../redux/api/productApi.js";
import { useGetCategoriesQuery } from "../../../redux/api/categoryApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { useDebounce } from "../../../hooks/useCommon.js";
import { isoToLocalInput, localInputToIso, toFieldErrors } from "./discountUtils.js";

const idOf = (value) => String(value?._id ?? value);

const initialForm = (discount) => ({
    name: discount?.name || "",
    description: discount?.description || "",
    type: discount?.type || "percentage",
    value: discount ? String(discount.value ?? "") : "",
    appliesTo: discount?.appliesTo || "all",
    products: (discount?.products || []).filter(Boolean).map(idOf),
    categories: (discount?.categories || []).filter(Boolean).map(idOf),
    isActive: discount ? Boolean(discount.isActive) : true,
    startDate: isoToLocalInput(discount?.startDate),
    endDate: isoToLocalInput(discount?.endDate),
});

const validate = (form) => {
    const errors = {};
    const name = form.name.trim();
    if (name.length < 2) errors.name = "Name must be at least 2 characters";
    else if (name.length > 100) errors.name = "Name is too long (max 100 characters)";
    if (form.description.trim().length > 500) errors.description = "Description is too long (max 500 characters)";


    const value = Number(form.value);
    if (form.value === "" || !Number.isFinite(value) || value <= 0) errors.value = "Enter a value greater than zero";
    else if (form.type === "percentage" && (value < 1 || value > 100)) errors.value = "Percentage must be between 1 and 100";
    else if (value > 1_000_000) errors.value = "Value is too large";

    if (form.appliesTo === "products" && !form.products.length) errors.products = "Select at least one product";
    if (form.appliesTo === "categories" && !form.categories.length) errors.categories = "Select at least one category";

    const start = localInputToIso(form.startDate);
    const end = localInputToIso(form.endDate);
    if (form.startDate && !start) errors.startDate = "Enter a valid start date";
    if (form.endDate && !end) errors.endDate = "Enter a valid end date";
    if (start && end && new Date(end) <= new Date(start)) errors.endDate = "End date must be after the start date";
    return errors;
};

const buildBody = (form) => {
    return {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        value: Number(form.value),
        appliesTo: form.appliesTo,
        products: form.appliesTo === "products" ? form.products : [],
        categories: form.appliesTo === "categories" ? form.categories : [],
        isActive: form.isActive,
        startDate: localInputToIso(form.startDate),
        endDate: localInputToIso(form.endDate),
    };
};

function SelectedChips({ ids, names, onRemove, noun }) {
    if (!ids.length) return null;
    return (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label={`Selected ${noun}`}>
            {ids.map((id) => (
                <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-neutral-900 py-1 pr-1 pl-3 text-xs font-medium text-white">
                    <span className="truncate">{names[id] || `Selected ${noun.replace(/s$/, "")}`}</span>
                    <button
                        type="button"
                        onClick={() => onRemove(id)}
                        className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        aria-label={`Remove ${names[id] || noun}`}
                    >
                        <X className="size-3" aria-hidden="true" />
                    </button>
                </li>
            ))}
        </ul>
    );
}

function ChecklistSkeleton() {
    return (
        <div className="space-y-3 p-3" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-2/3" />
            ))}
        </div>
    );
}

function ProductPicker({ selected, names, onToggle, error }) {
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search.trim());
    const { data, isLoading, isFetching, isError, error: loadError, refetch } = useGetProductsQuery({
        status: "all",
        limit: 100,
        search: debounced || undefined,
    });
    const items = data?.items || [];
    const errorId = useId();

    return (
        <fieldset aria-describedby={error ? errorId : undefined}>
            <legend className="mb-1.5 text-sm font-medium text-neutral-800">
                Products<span className="ml-0.5 text-red-700" aria-hidden="true">*</span>
            </legend>
            <SelectedChips ids={selected} names={names} noun="products" onRemove={(id) => onToggle({ _id: id, name: names[id] })} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search products…" label="Search products" />
            <div className={`mt-2 max-h-64 overflow-y-auto rounded-lg border ${error ? "border-red-500" : "border-neutral-200"}`} aria-busy={isFetching || undefined}>
                {isLoading ? (
                    <ChecklistSkeleton />
                ) : isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-red-700">
                        <span>{getErrorMessage(loadError, "Could not load products")}</span>
                        <Button size="sm" variant="outline" onClick={refetch}>
                            Retry
                        </Button>
                    </div>
                ) : items.length === 0 ? (
                    <p className="p-3 text-sm text-neutral-500">{debounced ? `No products match "${debounced}".` : "No products yet."}</p>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {items.map((product) => {
                            const checked = selected.includes(product._id);
                            return (
                                <li key={product._id}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-50">
                                        <input type="checkbox" checked={checked} onChange={() => onToggle(product)} className="size-4 shrink-0 accent-neutral-900" />
                                        <span className="min-w-0 flex-1 truncate">{product.name}</span>
                                        {product.status && product.status !== "active" && (
                                            <span className="text-xs text-neutral-400 capitalize">{product.status}</span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {data?.meta?.total > items.length && (
                <p className="mt-1.5 text-xs text-neutral-500">Showing {items.length} of {data.meta.total}. Search to find other products.</p>
            )}
            {error && (
                <p id={errorId} className="mt-1.5 text-xs text-red-700">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

function CategoryPicker({ selected, names, onToggle, error }) {
    const { data: categories = [], isLoading, isError, error: loadError, refetch } = useGetCategoriesQuery({ status: "all" });
    const errorId = useId();

    return (
        <fieldset aria-describedby={error ? errorId : undefined}>
            <legend className="mb-1.5 text-sm font-medium text-neutral-800">
                Categories<span className="ml-0.5 text-red-700" aria-hidden="true">*</span>
            </legend>
            <SelectedChips ids={selected} names={names} noun="categories" onRemove={(id) => onToggle({ _id: id, name: names[id] })} />
            <div className={`max-h-64 overflow-y-auto rounded-lg border ${error ? "border-red-500" : "border-neutral-200"}`}>
                {isLoading ? (
                    <ChecklistSkeleton />
                ) : isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-red-700">
                        <span>{getErrorMessage(loadError, "Could not load categories")}</span>
                        <Button size="sm" variant="outline" onClick={refetch}>
                            Retry
                        </Button>
                    </div>
                ) : categories.length === 0 ? (
                    <p className="p-3 text-sm text-neutral-500">No categories yet. Create categories first.</p>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {categories.map((category) => (
                            <li key={category._id}>
                                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-50">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(category._id)}
                                        onChange={() => onToggle(category)}
                                        className="size-4 shrink-0 accent-neutral-900"
                                    />
                                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                                    {category.isActive === false && <span className="text-xs text-neutral-400">Inactive</span>}
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-xs text-red-700">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

// Rendered only while open, so each opening starts from fresh state.
function DiscountFormModal({ discount, onClose }) {
    const formId = useId();
    const isEdit = Boolean(discount);

    const [form, setForm] = useState(() => initialForm(discount));
    const [names, setNames] = useState(() =>
        Object.fromEntries([...(discount?.products || []), ...(discount?.categories || [])].filter((item) => item?._id).map((item) => [String(item._id), item.name]))
    );
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");

    const [createDiscount, { isLoading: creating }] = useCreateDiscountMutation();
    const [updateDiscount, { isLoading: updating }] = useUpdateDiscountMutation();
    const saving = creating || updating;

    const set = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };
    const onInput = (field) => (event) => set(field, event.target.value);

    const toggleTarget = (field) => (item) => {
        const id = String(item._id);
        if (item.name) setNames((current) => ({ ...current, [id]: item.name }));
        setForm((current) => ({
            ...current,
            [field]: current[field].includes(id) ? current[field].filter((x) => x !== id) : [...current[field], id],
        }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");
        const clientErrors = validate(form);
        setErrors(clientErrors);
        if (Object.keys(clientErrors).length) {
            setFormError("Please fix the highlighted fields.");
            return;
        }
        const body = buildBody(form);
        try {
            if (isEdit) await updateDiscount({ id: discount._id, ...body }).unwrap();
            else await createDiscount(body).unwrap();
            toast.success(isEdit ? "Sale updated" : "Sale created");
            onClose();
        } catch (error) {
            const fieldErrors = toFieldErrors(error);
            setErrors(fieldErrors);
            setFormError(getErrorMessage(error));
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            closeDisabled={saving}
            title={isEdit ? "Edit sale" : "New sale"}
            description={isEdit ? discount.name : "Lower prices automatically on all products, selected products or selected categories."}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} loading={saving}>
                        {isEdit ? "Save changes" : "Create sale"}
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
                {formError && <Alert tone="error">{formError}</Alert>}


                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Name" required value={form.name} onChange={onInput("name")} error={errors.name} maxLength={100} placeholder="e.g. Summer sale" />
                    <Textarea
                        label="Description"
                        className="sm:col-span-2"
                        rows={2}
                        value={form.description}
                        onChange={onInput("description")}
                        error={errors.description}
                        maxLength={500}
                        hint="Optional. Internal note or a short line shown with the sale."
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Discount type" value={form.type} onChange={onInput("type")} error={errors.type}>
                        <option value="percentage">Percentage off</option>
                        <option value="fixed">Fixed amount off</option>
                    </Select>
                    <Input
                        label={form.type === "percentage" ? "Value (%)" : "Amount off (PKR ₨)"}
                        required
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={form.type === "percentage" ? 100 : undefined}
                        step={1}
                        value={form.value}
                        onChange={onInput("value")}
                        error={errors.value}
                        hint={form.type === "percentage" ? "Between 1 and 100. Sale prices are rounded to whole rupees." : "Rupees taken off each eligible product's regular price."}
                    />
                </div>

                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-neutral-800">Applies to</legend>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                        {[
                            ["all", "All products"],
                            ["products", "Specific products"],
                            ["categories", "Specific categories"],
                        ].map(([value, label]) => (
                            <label
                                key={value}
                                className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition focus-within:ring-2 focus-within:ring-accent/40 ${
                                    form.appliesTo === value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={`${formId}-applies`}
                                    value={value}
                                    checked={form.appliesTo === value}
                                    onChange={() => set("appliesTo", value)}
                                    className="sr-only"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {form.appliesTo === "products" && (
                    <ProductPicker selected={form.products} names={names} onToggle={toggleTarget("products")} error={errors.products} />
                )}
                {form.appliesTo === "categories" && (
                    <CategoryPicker selected={form.categories} names={names} onToggle={toggleTarget("categories")} error={errors.categories} />
                )}


                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        label="Starts"
                        type="datetime-local"
                        value={form.startDate}
                        onChange={onInput("startDate")}
                        error={errors.startDate}
                        hint="Leave empty to start immediately."
                    />
                    <Input
                        label="Ends"
                        type="datetime-local"
                        value={form.endDate}
                        onChange={onInput("endDate")}
                        error={errors.endDate}
                        hint="Leave empty to run until turned off."
                    />
                </div>

                <div className="rounded-lg border border-neutral-200 p-4">
                    <Toggle
                        checked={form.isActive}
                        onChange={(value) => set("isActive", value)}
                        label="Active"
                        description={"Inactive sales are not applied to product prices, even inside the scheduled dates."}
                    />
                </div>
            </form>
        </Modal>
    );
}

export default DiscountFormModal;
