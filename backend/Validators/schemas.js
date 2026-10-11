import { z } from "zod";
import { FONT_NAMES, HEX_COLOR } from "../Utils/constants.js";
import { ORDER_STATUSES } from "../Models/Order.js";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const idParams = z.object({ id: objectId });
export const idOrSlugParams = z.object({ id: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i, "Invalid ID") });

const text = (max, min = 0) => z.string().trim().min(min).max(max);
const requiredText = (label, max, min = 1) =>
    z.string({ error: `${label} is required` }).trim().min(min, `${label} is required`).max(max, `${label} is too long`);
const email = z.string({ error: "Email is required" }).trim().toLowerCase().pipe(z.email("Enter a valid email address"));
const money = (label) => z.coerce.number({ error: `${label} must be a number` }).min(0, `${label} cannot be negative`).max(1_000_000);
const password = z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number");
const phone = z.string().trim().max(30).regex(/^[+()\d\s.-]*$/, "Enter a valid phone number");
const queryBool = z.enum(["true", "false"]).transform((v) => v === "true");
const optionalDate = z.union([z.coerce.date(), z.null(), z.literal("")]).transform((v) => (v ? v : null));

// URLs rendered as links/images must be http(s) or site-relative (blocks javascript: and data: URLs).
const safeUrl = z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), "Must be an http(s) URL or a path starting with /");
const httpsUrl = z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must be a full URL starting with https://");

// ---------------------------------------------------------------------------
// Auth & account
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
    name: requiredText("Name", 80, 2),
    email,
    password,
});

export const loginSchema = z.object({
    email,
    password: z.string({ error: "Password is required" }).min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
    token: z.string().regex(/^[a-f\d]{64}$/i, "Invalid or expired reset link"),
    password,
});

const addressShape = {
    address: requiredText("Address", 200, 3),
    city: requiredText("City", 100),
    state: requiredText("State / province", 100),
    postalCode: requiredText("Postal code", 20, 2),
    country: requiredText("Country", 100),
};

export const updateProfileSchema = z.object({
    name: requiredText("Name", 80, 2).optional(),
    phone: phone.optional(),
    shippingAddress: z
        .object({
            address: text(200),
            city: text(100),
            state: text(100),
            postalCode: text(20),
            country: text(100),
        })
        .partial()
        .optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: password,
});

export const wishlistSchema = z.object({ productId: objectId });
export const productIdParams = z.object({ productId: objectId });

const cartItems = z
    .array(z.object({ product: objectId, quantity: z.coerce.number().int().min(1).max(99) }))
    .max(100, "Too many items in cart");

export const cartSchema = z.object({ items: cartItems });
export const quoteSchema = z.object({ items: cartItems });

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

// Empty / null means "no sale price". Never coerced to 0 (that previously created ₨0 sales).
const salePrice = z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v) : v),
    z.number({ error: "Sale price must be a number" }).max(1_000_000).nullable()
);

const productBase = {
    name: requiredText("Product name", 150, 2),
    slug: text(100).optional(),
    description: text(5000).optional(),
    shortDescription: text(300).optional(),
    price: money("Price"),
    // Explicit sale switch. Off => salePrice is forced to null; on => 0 < salePrice < price.
    onSale: z.boolean({ error: "On sale must be true or false" }).optional(),
    salePrice: salePrice.optional(),
    images: z.array(z.object({ url: safeUrl.refine((v) => v !== "", "Image URL is required"), alt: text(150).optional() })).max(10).optional(),
    category: objectId,
    stock: z.coerce.number({ error: "Stock must be a number" }).int("Stock must be a whole number").min(0, "Stock cannot be negative").max(1_000_000),
    sku: text(60).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    condition: z.enum(["new", "used"]).optional(),
    featured: z.boolean().optional(),
    tags: z.array(text(40, 1)).max(20).optional(),
};

// A sale is on when onSale is true, or when a sale price is sent without an explicit onSale.
// Updates without a price are checked against the stored price by the Product model.
const saleRules = (data, ctx) => {
    const onSale = data.onSale ?? (data.salePrice !== null && data.salePrice !== undefined);
    if (!onSale) return;
    if (data.salePrice === null || data.salePrice === undefined) {
        if (data.onSale === true) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Enter a sale price, or turn the sale off" });
    } else if (data.salePrice <= 0) {
        ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be greater than 0" });
    } else if (data.price !== undefined && data.salePrice >= data.price) {
        ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the regular price" });
    }
};

export const createProductSchema = z.object(productBase).superRefine(saleRules);

export const updateProductSchema = z.object(productBase).partial().superRefine(saleRules);

export const productQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: text(100).optional(),
    category: text(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    onSale: queryBool.optional(),
    inStock: queryBool.optional(),
    featured: queryBool.optional(),
    tag: text(40).optional(),
    sort: z.enum(["newest", "oldest", "price-asc", "price-desc", "rating", "popular", "name", "relevance"]).optional(),
    status: z.enum(["active", "inactive", "all"]).optional(),
    stock: z.enum(["in", "low", "out"]).optional(),
    condition: z.enum(["new", "used"]).optional(),
    ids: text(2600).optional(),
});

export const categorySchema = z.object({
    name: requiredText("Category name", 80, 2),
    slug: text(100).optional(),
    description: text(1000).optional(),
    image: safeUrl.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});
export const updateCategorySchema = categorySchema.partial();

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const createOrderSchema = z.object({
    items: cartItems.min(1, "Your cart is empty"),
    customer: z.object({
        name: requiredText("Full name", 80, 2),
        email,
        phone: phone.min(7, "Enter a valid phone number"),
    }),
    shippingAddress: z.object(addressShape),
    notes: text(500).optional(),
});

export const orderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES, { error: "Invalid order status" }),
    note: text(300).optional(),
});

export const paymentStatusSchema = z.object({ paymentStatus: z.enum(["pending", "paid", "refunded"]) });

export const adminOrderQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum([...ORDER_STATUSES, "all"]).optional(),
    search: text(100).optional(),
    customer: objectId.optional(),
    emailStatus: z.enum(["not_sent", "pending", "sent", "failed"]).optional(),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const createReviewSchema = z.object({
    rating: z.coerce.number().int("Rating must be a whole number").min(1, "Rating must be 1–5").max(5, "Rating must be 1–5"),
    title: text(120).optional(),
    comment: requiredText("Review", 2000, 3),
});
export const updateReviewSchema = createReviewSchema.partial();
export const reviewModerationSchema = z.object({ status: z.enum(["published", "hidden"]) });

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

const discountBase = z.object({
    name: requiredText("Discount name", 100, 2),
    description: text(500).optional(),
    type: z.enum(["percentage", "fixed"]),
    // Percentage (1–100) or a fixed amount in PKR.
    value: z.coerce.number().positive("Discount value must be greater than zero").max(1_000_000),
    appliesTo: z.enum(["all", "products", "categories"]).optional(),
    products: z.array(objectId).max(500).optional(),
    categories: z.array(objectId).max(200).optional(),
    isActive: z.boolean().optional(),
    startDate: optionalDate.optional(),
    endDate: optionalDate.optional(),
});

const discountRules = (data, ctx) => {
    if (data.type === "percentage" && data.value > 100) {
        ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage discounts cannot exceed 100%" });
    }
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
    }
    if (data.appliesTo === "products" && !data.products?.length) {
        ctx.addIssue({ code: "custom", path: ["products"], message: "Select at least one product" });
    }
    if (data.appliesTo === "categories" && !data.categories?.length) {
        ctx.addIssue({ code: "custom", path: ["categories"], message: "Select at least one category" });
    }
};

export const createDiscountSchema = discountBase.superRefine(discountRules);
export const updateDiscountSchema = discountBase.partial().superRefine(discountRules);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const hex = z.string().trim().regex(HEX_COLOR, "Colors must be hex values such as #111111");
const fontName = z.enum(FONT_NAMES, { error: "Unsupported font" });

export const settingsSchema = z.object({
    theme: z
        .object({
            primaryColor: hex,
            secondaryColor: hex,
            accentColor: hex,
            backgroundColor: hex,
            textColor: hex,
            buttonColor: hex,
        })
        .partial()
        .optional(),
    typography: z.object({ headingFont: fontName, bodyFont: fontName, buttonFont: fontName }).partial().optional(),
    hero: z
        .object({
            image: safeUrl,
            label: text(60),
            title: text(120),
            subtitle: text(300),
            buttonText: text(40),
            buttonUrl: safeUrl,
        })
        .partial()
        .optional(),
    promo: z
        .object({
            enabled: z.boolean(),
            label: text(60),
            title: text(120),
            subtitle: text(300),
            buttonText: text(40),
            buttonUrl: safeUrl,
        })
        .partial()
        .optional(),
    store: z
        .object({
            name: text(80, 1),
            tagline: text(200),
            email: z.union([z.literal(""), email]),
            phone: phone,
            address: text(250),
        })
        .partial()
        .optional(),
    social: z
        .object({ instagram: httpsUrl, facebook: httpsUrl, tiktok: httpsUrl, twitter: httpsUrl, youtube: httpsUrl })
        .partial()
        .optional(),
    shipping: z.object({ flatRate: money("Shipping rate"), freeShippingThreshold: money("Free shipping threshold") }).partial().optional(),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const customerStatusSchema = z.object({ status: z.enum(["active", "blocked"]) });
export const adminListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: text(100).optional(),
    status: text(20).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: text(30).optional(),
});
export const testEmailSchema = z.object({ to: email });
export const dashboardQuerySchema = z.object({ days: z.coerce.number().int().min(7).max(365).optional() });
