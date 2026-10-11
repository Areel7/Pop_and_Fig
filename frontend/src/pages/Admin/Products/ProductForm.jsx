import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ExternalLink, PackageX, Save, X } from "lucide-react";
import { toast } from "react-toastify";
import {
    useCreateProductMutation,
    useGetProductQuery,
    useUpdateProductMutation,
} from "../../../redux/api/productApi.js";
import { useGetCategoriesQuery } from "../../../redux/api/categoryApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { adminPath } from "../../../redux/constant.js";
import { AdminPageHeader, Card } from "../../../components/admin/AdminUI.jsx";
import ImageUploader from "../../../components/admin/ImageUploader.jsx";
import Button, { ButtonLink } from "../../../components/common/Button.jsx";
import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import { Input, Select, Textarea, Toggle } from "../../../components/forms/Field.jsx";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { formatPrice } from "../../../utils/format.js";
import { discountPercentOf } from "../../../utils/pricing.js";

const MAX_TAGS = 20;
const MAX_IMAGES = 10;

const slugify = (value) =>
    value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

// Keeps what the admin types slug-shaped without fighting a trailing hyphen mid-typing.
const cleanSlugInput = (value) =>
    value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-{2,}/g, "-");

const toForm = (product) => ({
    name: product?.name || "",
    slug: product?.slug || "",
    shortDescription: product?.shortDescription || "",
    description: product?.description || "",
    price: product ? String(product.price ?? "") : "",
    onSale: product?.onSale === true,
    salePrice: product?.onSale && product?.salePrice !== null && product?.salePrice !== undefined ? String(product.salePrice) : "",
    stock: product ? String(product.stock ?? 0) : "0",
    sku: product?.sku || "",
    status: product?.status || "active",
    condition: product?.condition || "new",
    featured: Boolean(product?.featured),
    category: product?.category?._id || (typeof product?.category === "string" ? product.category : ""),
    tags: product?.tags || [],
    images: (product?.images || []).map((image) => image.url).filter(Boolean),
});

const isNumber = (value) => value.trim() !== "" && Number.isFinite(Number(value));

const validate = (form) => {
    const errors = {};
    const name = form.name.trim();
    if (name.length < 2) errors.name = "Product name must be at least 2 characters.";
    else if (name.length > 150) errors.name = "Product name must be 150 characters or fewer.";
    if (form.slug.length > 100) errors.slug = "Slug must be 100 characters or fewer.";
    if (form.shortDescription.length > 300) errors.shortDescription = "Short description must be 300 characters or fewer.";
    if (form.description.length > 5000) errors.description = "Description must be 5000 characters or fewer.";

    if (!isNumber(form.price)) errors.price = "Enter a price in PKR.";
    else if (Number(form.price) < 0) errors.price = "Price cannot be negative.";

    if (form.onSale) {
        if (!isNumber(form.salePrice)) errors.salePrice = "Enter a sale price, or turn the sale off.";
        else if (Number(form.salePrice) <= 0) errors.salePrice = "Sale price must be greater than 0.";
        else if (isNumber(form.price) && Number(form.salePrice) >= Number(form.price)) errors.salePrice = "Invalid sale price — it must be lower than the regular price.";
    }

    if (!isNumber(form.stock)) errors.stock = "Enter the stock quantity.";
    else if (!Number.isInteger(Number(form.stock))) errors.stock = "Stock must be a whole number.";
    else if (Number(form.stock) < 0) errors.stock = "Stock cannot be negative.";

    if (form.sku.trim().length > 60) errors.sku = "SKU must be 60 characters or fewer.";
    if (!form.category) errors.category = "Choose a category.";
    if (form.tags.length > MAX_TAGS) errors.tags = `Use at most ${MAX_TAGS} tags.`;
    if (form.images.length > MAX_IMAGES) errors.images = `Use at most ${MAX_IMAGES} images.`;
    return errors;
};

// ---------------------------------------------------------------------------

function ProductForm() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    useDocumentTitle(isEdit ? "Edit product · Admin" : "Add product · Admin");
    const { data: product, error, refetch } = useGetProductQuery(id, { skip: !isEdit });
    const categoriesQuery = useGetCategoriesQuery({ status: "all" });

    const backLink = (
        <Link to={adminPath("products")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="size-4" aria-hidden="true" /> All products
        </Link>
    );

    if (isEdit && error) {
        const notFound = error.status === 404 || error.status === 400;
        return (
            <>
                {backLink}
                <div className="rounded-xl border border-neutral-200 bg-white">
                    {notFound ? (
                        <EmptyState
                            icon={PackageX}
                            title="Product not found"
                            message="It may have been deleted, or the link is incorrect."
                            action={<ButtonLink to={adminPath("products")}>Back to products</ButtonLink>}
                        />
                    ) : (
                        <ErrorState error={error} title="Couldn't load this product" onRetry={refetch} />
                    )}
                </div>
            </>
        );
    }

    // Wait until the product for *this* id is in hand so the editor initialises from the right data.
    if (isEdit && (!product || product._id !== id)) {
        return (
            <>
                {backLink}
                <FormSkeleton />
            </>
        );
    }

    return (
        <>
            {backLink}
            <ProductEditor key={product?._id || "new"} product={isEdit ? product : null} categoriesQuery={categoriesQuery} />
        </>
    );
}

// ---------------------------------------------------------------------------

function ProductEditor({ product, categoriesQuery }) {
    const navigate = useNavigate();
    const isEdit = Boolean(product);
    const [initial] = useState(() => toForm(product));
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [createProduct, { isLoading: creating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
    const saving = creating || updating;

    const { data: categories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = categoriesQuery;
    const currentCategoryMissing = form.category && !categoriesLoading && !categories.some((c) => c._id === form.category);

    const dirty = JSON.stringify(form) !== JSON.stringify(initial);

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
    const bind = (field) => ({ value: form[field], onChange: (event) => setField(field, event.target.value), error: errors[field] });

    // Live discount preview.
    const price = Number(form.price);
    const sale = Number(form.salePrice);
    const saleValid = form.onSale && isNumber(form.salePrice) && isNumber(form.price) && sale > 0 && sale < price;
    const discount = saleValid ? discountPercentOf(price, sale) : 0;

    const focusFirstError = () =>
        requestAnimationFrame(() => document.querySelector("#product-form [aria-invalid='true']")?.focus());

    const handleSubmit = async (event) => {
        event.preventDefault();
        const found = validate(form);
        if (Object.keys(found).length) {
            setErrors(found);
            toast.error("Please fix the highlighted fields.");
            focusFirstError();
            return;
        }

        const name = form.name.trim();
        const body = {
            name,
            shortDescription: form.shortDescription.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            onSale: form.onSale,
            salePrice: form.onSale ? Number(form.salePrice) : null,
            stock: Number(form.stock),
            sku: form.sku.trim(),
            status: form.status,
            condition: form.condition,
            featured: form.featured,
            category: form.category,
            tags: form.tags,
            images: form.images.map((url) => ({ url, alt: name })),
        };
        const slug = form.slug.trim().replace(/^-+|-+$/g, "");
        if (isEdit) {
            // Sending an empty slug asks the server to regenerate it from the name.
            if (slug !== (product.slug || "")) body.slug = slug;
        } else if (slug) {
            body.slug = slug;
        }

        try {
            if (isEdit) {
                await updateProduct({ id: product._id, ...body }).unwrap();
                toast.success(`"${name}" saved`);
            } else {
                await createProduct(body).unwrap();
                toast.success(`"${name}" created`);
            }
            navigate(adminPath("products"));
        } catch (err) {
            const fieldErrors = {};
            (err?.data?.errors || []).forEach(({ field, message }) => {
                const key = String(field || "").split(".")[0];
                if (key && !fieldErrors[key]) fieldErrors[key] = message;
            });
            if (Object.keys(fieldErrors).length) {
                setErrors(fieldErrors);
                focusFirstError();
            }
            toast.error(getErrorMessage(err, "Couldn't save the product"));
        }
    };

    const unknownErrors = Object.entries(errors).filter(
        ([key, message]) =>
            message &&
            ![
                "name",
                "slug",
                "shortDescription",
                "description",
                "price",
                "onSale",
                "salePrice",
                "stock",
                "sku",
                "status",
                "condition",
                "category",
                "tags",
                "images",
            ].includes(key)
    );

    return (
        <form id="product-form" onSubmit={handleSubmit} noValidate>
            <AdminPageHeader
                title={isEdit ? "Edit product" : "Add product"}
                description={isEdit ? product.name : "Create a new product for your catalog."}
                actions={
                    isEdit && product.slug ? (
                        <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
                        >
                            <ExternalLink className="size-4" aria-hidden="true" /> View on store
                            <span className="sr-only">(opens in a new tab)</span>
                        </a>
                    ) : null
                }
            />

            {unknownErrors.length > 0 && (
                <Alert tone="error" className="mb-6 rounded-lg">
                    <ul className="list-inside list-disc">
                        {unknownErrors.map(([key, message]) => (
                            <li key={key}>{message}</li>
                        ))}
                    </ul>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card title="Basic info" description="What customers see on the product page.">
                        <div className="space-y-5">
                            <Input
                                label="Product name"
                                required
                                maxLength={150}
                                placeholder="e.g. Linen tote bag"
                                autoComplete="off"
                                {...bind("name")}
                            />
                            <Input
                                label="URL slug"
                                maxLength={100}
                                placeholder={slugify(form.name) || "generated-from-name"}
                                hint={
                                    form.slug
                                        ? `Store link: /product/${form.slug}`
                                        : "Optional. Leave blank to generate it from the name. Lowercase letters, numbers and hyphens."
                                }
                                autoComplete="off"
                                value={form.slug}
                                error={errors.slug}
                                onChange={(event) => setField("slug", cleanSlugInput(event.target.value))}
                            />
                            <Textarea
                                label="Short description"
                                rows={2}
                                maxLength={300}
                                hint={`Shown on product cards and near the price · ${form.shortDescription.length}/300`}
                                {...bind("shortDescription")}
                            />
                            <Textarea
                                label="Description"
                                rows={7}
                                maxLength={5000}
                                hint={`Full details, materials, sizing and care · ${form.description.length}/5000`}
                                {...bind("description")}
                            />
                        </div>
                    </Card>

                    <Card title="Images" description="The first image is the main photo. Reorder them with the arrows.">
                        <ImageUploader
                            value={form.images}
                            onChange={(urls) => setField("images", urls)}
                            multiple
                            max={MAX_IMAGES}
                            label="Product images"
                        />
                        {errors.images && <p className="mt-2 text-xs text-red-700">{errors.images}</p>}
                    </Card>

                    <Card title="Pricing" description="All prices are in Pakistani Rupees (PKR, ₨).">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input
                                label="Price (PKR)"
                                required
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="1"
                                placeholder="e.g. 5000"
                                prefix="₨"
                                {...bind("price")}
                            />
                            <div className="rounded-lg border border-neutral-200 px-4 py-3 sm:self-end">
                                <Toggle
                                    checked={form.onSale}
                                    onChange={(value) => {
                                        setField("onSale", value);
                                        if (!value) setField("salePrice", "");
                                    }}
                                    label="On sale"
                                    description={form.onSale ? "Customers pay the sale price." : "Off — customers pay the regular price."}
                                />
                            </div>
                            <Input
                                label="Sale price (PKR)"
                                type="number"
                                inputMode="decimal"
                                min="1"
                                step="1"
                                placeholder={form.onSale ? "e.g. 4000" : "Turn on “On sale” first"}
                                prefix="₨"
                                disabled={!form.onSale}
                                required={form.onSale}
                                hint={form.onSale ? "Must be greater than 0 and lower than the price." : "Disabled while the product is not on sale."}
                                {...bind("salePrice")}
                            />
                            <div className="flex flex-col justify-end">
                                <p className="mb-1.5 text-sm font-medium text-neutral-800">Discount</p>
                                <p className="rounded-none border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm font-semibold tabular-nums" aria-live="polite">
                                    {discount}% {discount > 0 ? "OFF" : ""}
                                </p>
                                <p className="mt-1.5 text-xs text-neutral-500">Calculated automatically from the price and sale price.</p>
                            </div>
                        </div>
                        <div className="mt-5 rounded-lg bg-secondary px-4 py-3 text-sm" aria-live="polite">
                            {saleValid ? (
                                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span>Customers see</span>
                                    <del className="text-neutral-500">{formatPrice(price)}</del>
                                    <strong>{formatPrice(sale)}</strong>
                                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">{discount}% OFF</span>
                                </p>
                            ) : isNumber(form.price) && price >= 0 ? (
                                <p>
                                    Customers pay <strong>{formatPrice(price)}</strong>.{" "}
                                    {form.onSale ? "Enter a valid sale price to start the sale." : "Not on sale."}
                                </p>
                            ) : (
                                <p className="text-neutral-500">Enter a price to preview what customers pay.</p>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="min-w-0 space-y-6">
                    <Card title="Inventory & visibility">
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                <Input label="Stock" required type="number" inputMode="numeric" min="0" step="1" {...bind("stock")} />
                                <Input label="SKU" maxLength={60} placeholder="Optional" autoComplete="off" hint="Must be unique." {...bind("sku")} />
                            </div>
                            <Select
                                label="Status"
                                value={form.status}
                                error={errors.status}
                                onChange={(event) => setField("status", event.target.value)}
                                hint={form.status === "active" ? "Visible to customers." : "Hidden from the store."}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </Select>
                            <Select label="Condition" value={form.condition} error={errors.condition} onChange={(event) => setField("condition", event.target.value)}>
                                <option value="new">New</option>
                                <option value="used">Used</option>
                            </Select>
                            <Toggle
                                checked={form.featured}
                                onChange={(value) => setField("featured", value)}
                                label="Featured product"
                                description="Highlight it on the home page."
                            />
                        </div>
                    </Card>

                    <Card title="Organisation">
                        <div className="space-y-5">
                            {categoriesError ? (
                                <Alert tone="error" className="rounded-lg">
                                    Couldn't load categories. {getErrorMessage(categoriesError)}{" "}
                                    <button type="button" className="font-semibold underline" onClick={refetchCategories}>
                                        Retry
                                    </button>
                                </Alert>
                            ) : !categoriesLoading && categories.length === 0 ? (
                                <Alert tone="warning" className="rounded-lg">
                                    You need a category before you can save a product.{" "}
                                    <Link to={adminPath("categories")} className="font-semibold underline">
                                        Create a category
                                    </Link>
                                </Alert>
                            ) : null}
                            <Select
                                label="Category"
                                required
                                value={form.category}
                                error={errors.category}
                                disabled={categoriesLoading}
                                onChange={(event) => setField("category", event.target.value)}
                            >
                                <option value="">{categoriesLoading ? "Loading categories…" : "Choose a category"}</option>
                                {currentCategoryMissing && product?.category?.name && (
                                    <option value={form.category}>{product.category.name}</option>
                                )}
                                {categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                        {category.name}
                                        {category.isActive ? "" : " (inactive)"}
                                    </option>
                                ))}
                            </Select>
                            <TagsInput value={form.tags} onChange={(tags) => setField("tags", tags)} error={errors.tags} />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Save bar: sticks to the bottom of the viewport while the form scrolls. */}
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <p className="text-xs text-neutral-500 sm:mr-auto" aria-live="polite">
                        {dirty ? "You have unsaved changes." : isEdit ? "No changes yet." : ""}
                    </p>
                    <ButtonLink to={adminPath("products")} variant="ghost" aria-disabled={saving || undefined}>
                        Cancel
                    </ButtonLink>
                    <Button type="submit" loading={saving}>
                        {!saving && <Save className="size-4" aria-hidden="true" />}
                        {isEdit ? "Save changes" : "Create product"}
                    </Button>
                </div>
            </div>
        </form>
    );
}

// Tags as removable chips: Enter or comma adds, Backspace on an empty input removes the last one.
function TagsInput({ value, onChange, error }) {
    const [draft, setDraft] = useState("");
    const inputId = "product-tags-input";

    const addTags = (raw) => {
        const incoming = raw
            .split(",")
            .map((tag) => tag.trim().toLowerCase().slice(0, 40))
            .filter(Boolean);
        if (!incoming.length) return;
        const next = [...value];
        incoming.forEach((tag) => {
            if (!next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
        });
        if (next.length !== value.length) onChange(next);
        setDraft("");
    };

    return (
        <div>
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-800">
                Tags
            </label>
            <div
                className={`flex flex-wrap gap-1.5 border bg-white px-2 py-2 focus-within:ring-2 focus-within:ring-accent/40 ${
                    error ? "border-red-500" : "border-neutral-300 focus-within:border-neutral-900"
                }`}
            >
                {value.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-1 pr-1 pl-2.5 text-xs font-medium text-neutral-800">
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(value.filter((t) => t !== tag))}
                            className="flex size-5 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                            aria-label={`Remove tag ${tag}`}
                        >
                            <X className="size-3" aria-hidden="true" />
                        </button>
                    </span>
                ))}
                <input
                    id={inputId}
                    value={draft}
                    onChange={(event) => {
                        const next = event.target.value;
                        if (next.includes(",")) addTags(next);
                        else setDraft(next);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addTags(draft);
                        } else if (event.key === "Backspace" && !draft && value.length) {
                            onChange(value.slice(0, -1));
                        }
                    }}
                    onBlur={() => addTags(draft)}
                    disabled={value.length >= MAX_TAGS}
                    placeholder={value.length >= MAX_TAGS ? "Tag limit reached" : value.length ? "Add another…" : "e.g. summer, linen, gift"}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={`${inputId}-hint`}
                    className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
                />
            </div>
            <p id={`${inputId}-hint`} className={`mt-1.5 text-xs ${error ? "text-red-700" : "text-neutral-500"}`}>
                {error || `Press Enter or comma to add · ${value.length}/${MAX_TAGS} tags · helps search.`}
            </p>
        </div>
    );
}

function FormSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading product">
            <Skeleton className="mb-8 h-8 w-56 rounded" />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {[4, 2, 2].map((fields, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6">
                            <Skeleton className="h-4 w-32 rounded" />
                            {Array.from({ length: fields }, (_, j) => (
                                <div key={j} className="mt-5">
                                    <Skeleton className="h-3 w-24 rounded" />
                                    <Skeleton className="mt-2 h-10 w-full" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="space-y-6">
                    {[4, 2].map((fields, i) => (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6">
                            <Skeleton className="h-4 w-32 rounded" />
                            {Array.from({ length: fields }, (_, j) => (
                                <div key={j} className="mt-5">
                                    <Skeleton className="h-3 w-24 rounded" />
                                    <Skeleton className="mt-2 h-10 w-full" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProductForm;
