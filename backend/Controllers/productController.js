import mongoose from "mongoose";
import Product from "../Models/Product.js";
import Category from "../Models/Category.js";
import Review from "../Models/Review.js";
import User from "../Models/User.js";
import Discount from "../Models/Discount.js";
import ApiError from "../Utils/ApiError.js";
import { buildMeta, escapeRegex, getPagination, sendSuccess, slugify } from "../Utils/helpers.js";
import { refreshProductPricing } from "../Services/pricingService.js";

const LOW_STOCK_THRESHOLD = 5;

const SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "price-asc": { finalPrice: 1, createdAt: -1 },
    "price-desc": { finalPrice: -1, createdAt: -1 },
    rating: { rating: -1, reviewCount: -1 },
    popular: { sold: -1, createdAt: -1 },
    name: { name: 1 },
    relevance: { featured: -1, createdAt: -1 },
};

const isAdmin = (req) => req.user?.role === "admin";

const findCategory = (idOrSlug) =>
    mongoose.isValidObjectId(idOrSlug) ? Category.findById(idOrSlug) : Category.findOne({ slug: String(idOrSlug).toLowerCase() });

const serialize = (product) => ({ ...product, inStock: product.stock > 0 });

const uniqueSlug = async (source, excludeId) => {
    const base = slugify(source) || "product";
    let slug = base;
    for (let n = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); n += 1) {
        slug = `${base}-${n}`;
    }
    return slug;
};

// GET /api/products — public catalog (admins can pass status=all|inactive to include hidden products).
const listProducts = async (req, res) => {
    const q = req.validatedQuery;
    const admin = isAdmin(req);
    const pagination = getPagination(q, { defaultLimit: 12, maxLimit: 100 });
    const filter = {};
    const and = [];

    if (admin && q.status) {
        if (q.status !== "all") filter.status = q.status;
    } else {
        filter.status = "active";
    }

    const activeCategoryIds = admin ? null : await Category.find({ isActive: true }).distinct("_id");

    if (q.category) {
        const category = await findCategory(q.category);
        if (!category || (!admin && !category.isActive)) {
            return sendSuccess(res, { message: "Products", data: [], meta: buildMeta(pagination, 0) });
        }
        filter.category = category._id;
    } else if (activeCategoryIds) {
        filter.category = { $in: activeCategoryIds };
    }

    if (q.search) {
        const pattern = new RegExp(escapeRegex(q.search), "i");
        const matchingCategories = await Category.find({ name: pattern }).distinct("_id");
        and.push({
            $or: [
                { name: pattern },
                { sku: pattern },
                { tags: pattern },
                { shortDescription: pattern },
                { description: pattern },
                ...(matchingCategories.length ? [{ category: { $in: matchingCategories } }] : []),
            ],
        });
    }

    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
        filter.finalPrice = {};
        if (q.minPrice !== undefined) filter.finalPrice.$gte = q.minPrice;
        if (q.maxPrice !== undefined) filter.finalPrice.$lte = q.maxPrice;
    }
    // "On sale" = the customer pays less than the regular price (product sale or running campaign).
    if (q.onSale !== undefined) and.push({ $expr: { [q.onSale ? "$lt" : "$gte"]: ["$finalPrice", "$price"] } });
    if (q.inStock !== undefined) filter.stock = q.inStock ? { $gt: 0 } : 0;
    if (q.stock === "in") filter.stock = { $gt: LOW_STOCK_THRESHOLD };
    if (q.stock === "low") filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
    if (q.stock === "out") filter.stock = 0;
    if (q.featured !== undefined) filter.featured = q.featured;
    if (q.condition) filter.condition = q.condition;
    if (q.tag) filter.tags = q.tag;
    if (q.ids) {
        const ids = q.ids.split(",").filter((id) => mongoose.isValidObjectId(id));
        filter._id = { $in: ids };
    }
    if (and.length) filter.$and = and;

    const [items, total] = await Promise.all([
        Product.find(filter)
            .sort(SORTS[q.sort] || SORTS.newest)
            .skip(pagination.skip)
            .limit(pagination.limit)
            .populate("category", "name slug isActive")
            .lean(),
        Product.countDocuments(filter),
    ]);

    sendSuccess(res, { message: "Products", data: items.map(serialize), meta: buildMeta(pagination, total) });
};

// GET /api/products/price-range — bounds for the shop price filter.
const getPriceRange = async (req, res) => {
    const activeCategoryIds = await Category.find({ isActive: true }).distinct("_id");
    const [range] = await Product.aggregate([
        { $match: { status: "active", category: { $in: activeCategoryIds } } },
        { $group: { _id: null, min: { $min: "$finalPrice" }, max: { $max: "$finalPrice" } } },
    ]);
    sendSuccess(res, { message: "Price range", data: { min: Math.floor(range?.min || 0), max: Math.ceil(range?.max || 0) } });
};

// GET /api/products/:id — accepts an ObjectId or a slug.
const getProduct = async (req, res) => {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { slug: String(id).toLowerCase() };
    const product = await Product.findOne(query).populate("category", "name slug isActive").lean();

    const hidden = !product || product.status !== "active" || product.category?.isActive === false;
    if (hidden && !isAdmin(req)) throw ApiError.notFound("Product not found");
    if (!product) throw ApiError.notFound("Product not found");

    sendSuccess(res, { message: "Product", data: serialize(product) });
};

const assertCategory = async (categoryId) => {
    if (!(await Category.exists({ _id: categoryId }))) throw ApiError.badRequest("Selected category does not exist");
};

// Resolves the product-level sale from the request. An explicit onSale wins; sending only a sale
// price turns the sale on, sending salePrice: null turns it off. A sale is never created implicitly.
const resolveSale = (body, existing) => {
    if (body.onSale === false) return { onSale: false, salePrice: null };
    if (body.onSale === true) return { onSale: true, salePrice: body.salePrice !== undefined ? body.salePrice : existing?.salePrice ?? null };
    if (body.salePrice === null) return { onSale: false, salePrice: null };
    if (typeof body.salePrice === "number") return { onSale: true, salePrice: body.salePrice };
    return existing ? {} : { onSale: false, salePrice: null };
};

const normaliseTags = (tags) => [...new Set((tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))];

const createProduct = async (req, res) => {
    const body = req.body;
    await assertCategory(body.category);

    const product = new Product({
        ...body,
        slug: await uniqueSlug(body.slug || body.name),
        tags: normaliseTags(body.tags),
        sku: body.sku || undefined,
        ...resolveSale(body, null),
        finalPrice: body.price,
    });
    await product.save();
    await refreshProductPricing({ _id: product._id });

    const created = await Product.findById(product._id).populate("category", "name slug").lean();
    sendSuccess(res, { status: 201, message: "Product created successfully", data: serialize(created) });
};

const updateProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw ApiError.notFound("Product not found");

    const body = { ...req.body };
    if (body.category) await assertCategory(body.category);
    if (body.tags) body.tags = normaliseTags(body.tags);
    if (body.slug !== undefined || (body.name && !product.slug)) {
        body.slug = await uniqueSlug(body.slug || body.name || product.name, product._id);
    }
    if (body.sku === "") {
        product.sku = undefined;
        delete body.sku;
    }

    const sale = resolveSale(body, product);
    delete body.onSale;
    delete body.salePrice;
    product.set({ ...body, ...sale });
    // The Product model validates the sale against the (possibly updated) regular price.
    await product.save();
    await refreshProductPricing({ _id: product._id });

    const updated = await Product.findById(product._id).populate("category", "name slug").lean();
    sendSuccess(res, { message: "Product updated successfully", data: serialize(updated) });
};

const deleteProduct = async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw ApiError.notFound("Product not found");

    // Orders keep their own product snapshots, so only live references need cleaning up.
    await Promise.all([
        Review.deleteMany({ product: product._id }),
        User.updateMany({}, { $pull: { wishlist: product._id, cart: { product: product._id } } }),
        Discount.updateMany({ products: product._id }, { $pull: { products: product._id } }),
    ]);

    sendSuccess(res, { message: "Product deleted successfully", data: { _id: product._id } });
};

export { listProducts, getPriceRange, getProduct, createProduct, updateProduct, deleteProduct };
