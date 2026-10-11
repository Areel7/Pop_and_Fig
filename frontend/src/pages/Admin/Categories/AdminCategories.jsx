import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FilterX, FolderOpen, ImageOff, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useGetCategoriesQuery,
    useUpdateCategoryMutation,
} from "../../../redux/api/categoryApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { adminPath } from "../../../redux/constant.js";
import {
    AdminPageHeader,
    FilterSelect,
    IconButton,
    SearchInput,
    Table,
    TableSkeleton,
    th,
    td,
} from "../../../components/admin/AdminUI.jsx";
import ImageUploader from "../../../components/admin/ImageUploader.jsx";
import Button from "../../../components/common/Button.jsx";
import { Alert, EmptyState, ErrorState } from "../../../components/common/Feedback.jsx";
import Modal, { ConfirmDialog } from "../../../components/common/Modal.jsx";
import { Input, Textarea, Toggle } from "../../../components/forms/Field.jsx";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { pluralize, resolveImageUrl } from "../../../utils/format.js";

const cleanSlugInput = (value) =>
    value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-{2,}/g, "-");

const excerpt = (text = "", length = 80) => (text.length > length ? `${text.slice(0, length).trimEnd()}…` : text);

function RowSwitch({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                checked ? "bg-neutral-900" : "bg-neutral-300"
            }`}
        >
            <span className={`inline-block size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
        </button>
    );
}

function AdminCategories() {
    useDocumentTitle("Categories · Admin");
    const navigate = useNavigate();
    const { data: categories = [], isLoading, isFetching, error, refetch } = useGetCategoriesQuery({ status: "all" });
    const [updateCategory] = useUpdateCategoryMutation();
    const [deleteCategory, { isLoading: deleting }] = useDeleteCategoryMutation();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [editor, setEditor] = useState(null); // { category } | null — category null means "new"
    const [toDelete, setToDelete] = useState(null);
    const [pendingId, setPendingId] = useState(null);
    const [deactivating, setDeactivating] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return categories.filter((category) => {
            if (status === "active" && !category.isActive) return false;
            if (status === "inactive" && category.isActive) return false;
            if (!q) return true;
            return [category.name, category.slug, category.description].some((value) => String(value || "").toLowerCase().includes(q));
        });
    }, [categories, search, status]);
    const hasFilters = Boolean(search.trim() || status);

    const setActive = async (category, isActive) => {
        setPendingId(category._id);
        try {
            await updateCategory({ id: category._id, isActive }).unwrap();
            toast.success(isActive ? `"${category.name}" is now active` : `"${category.name}" is now hidden from the store`);
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, "Couldn't update the category"));
            return false;
        } finally {
            setPendingId(null);
        }
    };

    const hasProducts = (toDelete?.productCount || 0) > 0;

    const handleConfirmDelete = async () => {
        if (!toDelete) return;
        if (hasProducts) {
            if (toDelete.isActive) {
                setDeactivating(true);
                const ok = await setActive(toDelete, false);
                setDeactivating(false);
                if (ok) setToDelete(null);
            } else {
                navigate(`${adminPath("products")}?category=${toDelete._id}`);
            }
            return;
        }
        try {
            await deleteCategory(toDelete._id).unwrap();
            toast.success(`"${toDelete.name}" deleted`);
            setToDelete(null);
        } catch (err) {
            // 409 → the category still has products (the list may have been stale).
            toast.error(getErrorMessage(err, "Couldn't delete the category"));
            if (err?.status === 409) refetch();
        }
    };

    let body;
    if (isLoading) {
        body = (
            <Table minWidth="min-w-[900px]">
                <TableHead />
                <TableSkeleton rows={6} cols={7} />
            </Table>
        );
    } else if (error && !categories.length) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <ErrorState error={error} title="Couldn't load categories" onRetry={refetch} />
            </div>
        );
    } else if (categories.length === 0) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <EmptyState
                    icon={FolderOpen}
                    title="No categories yet"
                    message="Categories group your products in the store menu and filters. Create one before adding products."
                    action={
                        <Button onClick={() => setEditor({ category: null })}>
                            <Plus className="size-4" aria-hidden="true" /> Add category
                        </Button>
                    }
                />
            </div>
        );
    } else if (filtered.length === 0) {
        body = (
            <div className="rounded-xl border border-neutral-200 bg-white">
                <EmptyState
                    icon={SearchX}
                    title="No categories match"
                    message="Try another search term or status."
                    action={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setStatus("");
                            }}
                        >
                            <FilterX className="size-4" aria-hidden="true" /> Clear filters
                        </Button>
                    }
                />
            </div>
        );
    } else {
        body = (
            <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching || undefined}>
                <Table minWidth="min-w-[900px]">
                    <TableHead />
                    <tbody>
                        {filtered.map((category) => (
                            <tr key={category._id} className="hover:bg-neutral-50">
                                <td className={td}>
                                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-secondary">
                                        {category.image ? (
                                            <img src={resolveImageUrl(category.image)} alt="" className="size-full object-cover" loading="lazy" />
                                        ) : (
                                            <ImageOff className="size-4 text-neutral-400" aria-hidden="true" />
                                        )}
                                    </div>
                                </td>
                                <td className={td}>
                                    <button
                                        type="button"
                                        onClick={() => setEditor({ category })}
                                        className="text-left font-medium hover:underline"
                                    >
                                        {category.name}
                                    </button>
                                    <p className="mt-0.5 text-xs text-neutral-500">Sort order {category.sortOrder ?? 0}</p>
                                </td>
                                <td className={`${td} font-mono text-xs text-neutral-600`}>{category.slug}</td>
                                <td className={`${td} max-w-[280px] text-neutral-600`}>
                                    {category.description ? (
                                        <span title={category.description}>{excerpt(category.description)}</span>
                                    ) : (
                                        <span className="text-neutral-400">—</span>
                                    )}
                                </td>
                                <td className={`${td} whitespace-nowrap`}>
                                    {category.productCount > 0 ? (
                                        <Link to={`${adminPath("products")}?category=${category._id}`} className="font-medium tabular-nums hover:underline">
                                            {pluralize(category.productCount, "product")}
                                        </Link>
                                    ) : (
                                        <span className="text-neutral-400 tabular-nums">0 products</span>
                                    )}
                                </td>
                                <td className={td}>
                                    <RowSwitch
                                        checked={Boolean(category.isActive)}
                                        disabled={pendingId === category._id}
                                        label={`${category.name} visible in store`}
                                        onChange={(value) => setActive(category, value)}
                                    />
                                </td>
                                <td className={td}>
                                    <div className="flex items-center justify-end gap-0.5">
                                        <IconButton label={`Edit ${category.name}`} icon={Pencil} onClick={() => setEditor({ category })} />
                                        <IconButton
                                            label={
                                                category.productCount > 0
                                                    ? `Delete ${category.name} (has ${pluralize(category.productCount, "product")})`
                                                    : `Delete ${category.name}`
                                            }
                                            icon={Trash2}
                                            tone="danger"
                                            disabled={pendingId === category._id}
                                            onClick={() => setToDelete(category)}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        );
    }

    const activeCount = categories.filter((c) => c.isActive).length;

    return (
        <>
            <AdminPageHeader
                title="Categories"
                description={
                    categories.length
                        ? `${pluralize(categories.length, "category", "categories")} · ${activeCount} active`
                        : "Group products for browsing and filtering."
                }
                actions={
                    <Button onClick={() => setEditor({ category: null })}>
                        <Plus className="size-4" aria-hidden="true" /> Add category
                    </Button>
                }
            />

            {categories.length > 0 && (
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" label="Search categories" className="min-w-0 sm:w-72" />
                    <FilterSelect value={status} onChange={setStatus} label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </FilterSelect>
                    {hasFilters && (
                        <p className="text-sm text-neutral-500 sm:ml-auto" aria-live="polite">
                            {filtered.length} of {categories.length} shown
                        </p>
                    )}
                </div>
            )}

            {error && categories.length > 0 && (
                <Alert tone="error" className="mb-4 rounded-lg">
                    Couldn't refresh categories. {getErrorMessage(error)}{" "}
                    <button type="button" onClick={refetch} className="font-semibold underline">
                        Try again
                    </button>
                </Alert>
            )}

            {body}

            {editor && <CategoryFormModal key={editor.category?._id || "new"} category={editor.category} onClose={() => setEditor(null)} />}

            <ConfirmDialog
                open={Boolean(toDelete)}
                onClose={() => !(deleting || deactivating) && setToDelete(null)}
                onConfirm={handleConfirmDelete}
                loading={deleting || deactivating}
                tone={hasProducts ? "primary" : "danger"}
                title={hasProducts ? "This category still has products" : "Delete category?"}
                confirmLabel={hasProducts ? (toDelete?.isActive ? "Deactivate instead" : "View its products") : "Delete category"}
                message={
                    toDelete &&
                    (hasProducts ? (
                        <>
                            <p>
                                <strong className="text-neutral-900">{toDelete.name}</strong> contains {pluralize(toDelete.productCount, "product")}, so it
                                can't be deleted. Move those products to another category (or delete them) first.
                            </p>
                            <p className="mt-2">
                                {toDelete.isActive
                                    ? "Deactivating hides the category and its products from customers without losing anything."
                                    : "It is already inactive, so it's hidden from customers."}
                            </p>
                        </>
                    ) : (
                        <p>
                            <strong className="text-neutral-900">{toDelete.name}</strong> will be permanently deleted and removed from any discounts that
                            target it. This can't be undone.
                        </p>
                    ))
                }
            />
        </>
    );
}

function TableHead() {
    return (
        <thead>
            <tr>
                <th scope="col" className={`${th} w-20`}>
                    <span className="sr-only">Image</span>
                </th>
                <th scope="col" className={th}>Name</th>
                <th scope="col" className={th}>Slug</th>
                <th scope="col" className={th}>Description</th>
                <th scope="col" className={th}>Products</th>
                <th scope="col" className={th}>Active</th>
                <th scope="col" className={`${th} text-right`}>Actions</th>
            </tr>
        </thead>
    );
}

const FORM_FIELDS = ["name", "slug", "description", "image", "isActive", "sortOrder"];

function CategoryFormModal({ category, onClose }) {
    const isEdit = Boolean(category);
    const [form, setForm] = useState(() => ({
        name: category?.name || "",
        slug: category?.slug || "",
        description: category?.description || "",
        image: category?.image || "",
        isActive: category ? Boolean(category.isActive) : true,
        sortOrder: String(category?.sortOrder ?? 0),
    }));
    const [errors, setErrors] = useState({});
    const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
    const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
    const saving = creating || updating;
    const formId = "category-form";

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const found = {};
        const name = form.name.trim();
        if (name.length < 2) found.name = "Name must be at least 2 characters.";
        else if (name.length > 80) found.name = "Name must be 80 characters or fewer.";
        if (form.slug.length > 100) found.slug = "Slug must be 100 characters or fewer.";
        if (form.description.length > 1000) found.description = "Description must be 1000 characters or fewer.";
        const sort = Number(form.sortOrder);
        if (form.sortOrder.trim() === "" || !Number.isInteger(sort) || sort < 0 || sort > 10000) {
            found.sortOrder = "Use a whole number from 0 to 10000.";
        }
        return found;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const found = validate();
        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }
        const name = form.name.trim();
        const body = {
            name,
            description: form.description.trim(),
            image: form.image,
            isActive: form.isActive,
            sortOrder: Number(form.sortOrder),
        };
        const slug = form.slug.replace(/^-+|-+$/g, "");
        if (isEdit) {
            // An empty slug makes the server regenerate it from the name.
            if (slug !== (category.slug || "")) body.slug = slug;
        } else if (slug) {
            body.slug = slug;
        }

        try {
            if (isEdit) await updateCategory({ id: category._id, ...body }).unwrap();
            else await createCategory(body).unwrap();
            toast.success(isEdit ? `"${name}" saved` : `"${name}" created`);
            onClose();
        } catch (err) {
            const fieldErrors = {};
            (err?.data?.errors || []).forEach(({ field, message }) => {
                const key = String(field || "").split(".")[0];
                if (key && !fieldErrors[key]) fieldErrors[key] = message;
            });
            setErrors(fieldErrors);
            toast.error(getErrorMessage(err, "Couldn't save the category"));
        }
    };

    const otherErrors = Object.entries(errors).filter(([key, message]) => message && !FORM_FIELDS.includes(key));

    return (
        <Modal
            open
            onClose={onClose}
            closeDisabled={saving}
            size="lg"
            title={isEdit ? "Edit category" : "Add category"}
            description={isEdit ? category.name : "Categories appear in the store menu and product filters."}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} loading={saving}>
                        {isEdit ? "Save changes" : "Create category"}
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
                {otherErrors.length > 0 && (
                    <Alert tone="error" className="rounded-lg">
                        {otherErrors.map(([key, message]) => (
                            <p key={key}>{message}</p>
                        ))}
                    </Alert>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                        label="Name"
                        required
                        maxLength={80}
                        autoComplete="off"
                        value={form.name}
                        error={errors.name}
                        onChange={(event) => setField("name", event.target.value)}
                    />
                    <Input
                        label="Slug"
                        maxLength={100}
                        autoComplete="off"
                        placeholder="generated-from-name"
                        hint="Optional. Leave blank to generate it from the name."
                        value={form.slug}
                        error={errors.slug}
                        onChange={(event) => setField("slug", cleanSlugInput(event.target.value))}
                    />
                </div>
                <Textarea
                    label="Description"
                    rows={3}
                    maxLength={1000}
                    hint={`${form.description.length}/1000`}
                    value={form.description}
                    error={errors.description}
                    onChange={(event) => setField("description", event.target.value)}
                />
                <div>
                    <ImageUploader
                        label="Image"
                        multiple={false}
                        value={form.image ? [form.image] : []}
                        onChange={(urls) => setField("image", urls[0] || "")}
                    />
                    {errors.image && <p className="mt-1.5 text-xs text-red-700">{errors.image}</p>}
                </div>
                <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                    <Input
                        label="Sort order"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="10000"
                        step="1"
                        hint="Lower numbers appear first."
                        value={form.sortOrder}
                        error={errors.sortOrder}
                        onChange={(event) => setField("sortOrder", event.target.value)}
                    />
                    <div className="sm:pt-7">
                        <Toggle
                            checked={form.isActive}
                            onChange={(value) => setField("isActive", value)}
                            label="Active"
                            description={form.isActive ? "Visible in the store." : "Hidden, along with its products."}
                        />
                    </div>
                </div>
                {isEdit && !form.isActive && category.isActive && category.productCount > 0 && (
                    <Alert tone="warning" className="rounded-lg">
                        Deactivating hides {pluralize(category.productCount, "product")} in this category from customers.
                    </Alert>
                )}
            </form>
        </Modal>
    );
}

export default AdminCategories;
