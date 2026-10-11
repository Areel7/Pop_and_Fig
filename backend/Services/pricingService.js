import mongoose from "mongoose";
import Product from "../Models/Product.js";
import Discount from "../Models/Discount.js";
import Settings from "../Models/Settings.js";
import ApiError from "../Utils/ApiError.js";
import { roundMoney } from "../Utils/helpers.js";

// All amounts are numeric PKR values. Currency symbols are only added when displaying.

// ---------------------------------------------------------------------------
// Sales campaigns (Admin → Discounts / Sales)
// ---------------------------------------------------------------------------

const liveDateFilter = (now) => ({
    isActive: true,
    $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
});

export const isDiscountLive = (discount, now = new Date()) =>
    Boolean(discount?.isActive) &&
    (!discount.startDate || new Date(discount.startDate) <= now) &&
    (!discount.endDate || new Date(discount.endDate) >= now);

// Sales campaigns that are currently running.
export const getLiveAutomaticDiscounts = (now = new Date()) => Discount.find(liveDateFilter(now)).lean();

const idOf = (value) => String(value?._id ?? value);

export const discountAppliesToProduct = (discount, product) => {
    if (discount.appliesTo === "all") return true;
    if (discount.appliesTo === "products") return discount.products.some((id) => idOf(id) === idOf(product._id));
    if (discount.appliesTo === "categories") return discount.categories.some((id) => idOf(id) === idOf(product.category));
    return false;
};

// Campaign prices are rounded to whole rupees.
const applyDiscount = (price, discount) =>
    Math.round(discount.type === "percentage" ? price * (1 - discount.value / 100) : Math.max(0, price - discount.value));

/**
 * The unit price a customer pays: the regular price, or the admin's sale price when the product is
 * explicitly on sale, or a running campaign price if that is lower. Never derived from client input.
 */
export const priceProduct = (product, automaticDiscounts = []) => {
    const price = Number(product.price) || 0;
    let finalPrice = price;
    let activeDiscount = null;

    const salePrice = Number(product.salePrice);
    if (product.onSale === true && Number.isFinite(salePrice) && salePrice > 0 && salePrice < price) {
        finalPrice = salePrice;
    }

    for (const discount of automaticDiscounts) {
        if (!discountAppliesToProduct(discount, product)) continue;
        const discounted = applyDiscount(price, discount);
        if (discounted < finalPrice) {
            finalPrice = discounted;
            activeDiscount = discount;
        }
    }

    finalPrice = roundMoney(Math.max(0, finalPrice));
    const discountPercent = price > 0 && finalPrice < price ? Math.round(((price - finalPrice) / price) * 100) : 0;

    return {
        price,
        finalPrice,
        discountPercent,
        discounted: finalPrice < price,
        activeDiscount: activeDiscount ? activeDiscount._id : null,
        discountName: activeDiscount ? activeDiscount.name : null,
    };
};

// Re-computes denormalised pricing on products (after product/discount changes and periodically,
// so scheduled campaigns start and end on time).
export const refreshProductPricing = async (filter = {}) => {
    const discounts = await getLiveAutomaticDiscounts();
    const products = await Product.find(filter).select("price salePrice onSale category finalPrice discountPercent activeDiscount").lean();

    const operations = [];
    for (const product of products) {
        const pricing = priceProduct(product, discounts);
        const changed =
            product.finalPrice !== pricing.finalPrice ||
            product.discountPercent !== pricing.discountPercent ||
            idOf(product.activeDiscount) !== idOf(pricing.activeDiscount);

        if (changed) {
            operations.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        $set: {
                            finalPrice: pricing.finalPrice,
                            discountPercent: pricing.discountPercent,
                            activeDiscount: pricing.activeDiscount,
                        },
                    },
                },
            });
        }
    }

    if (operations.length) await Product.bulkWrite(operations, { ordered: false });
    return operations.length;
};

// ---------------------------------------------------------------------------
// Cart / order quote
// ---------------------------------------------------------------------------

const normaliseItems = (items = []) => {
    const merged = new Map();
    for (const item of items) {
        const productId = String(item.product ?? item.productId ?? "");
        if (!mongoose.isValidObjectId(productId)) continue;
        const quantity = Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1));
        merged.set(productId, Math.min(99, (merged.get(productId) || 0) + quantity));
    }
    return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
};

/**
 * Calculates every price on the server from MongoDB: unit prices × quantities = subtotal,
 * subtotal + shipping = total. Nothing price-related is ever accepted from the client.
 * With `strict`, any unavailable item throws instead of being reported.
 */
export const quoteCart = async (rawItems, { strict = false } = {}) => {
    const now = new Date();
    const items = normaliseItems(rawItems);
    const [settings, discounts] = await Promise.all([Settings.getSingleton(), getLiveAutomaticDiscounts(now)]);

    const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } })
        .populate("category", "name slug isActive")
        .lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const lines = [];
    const issues = [];

    for (const { productId, quantity } of items) {
        const product = productMap.get(productId);
        const available = product && product.status === "active" && product.category?.isActive !== false;

        if (!available) {
            issues.push({ productId, message: "A product in your cart is no longer available" });
            lines.push({ productId, available: false, quantity, issue: "No longer available" });
            continue;
        }

        const pricing = priceProduct(product, discounts);
        let issue = null;
        if (product.stock <= 0) issue = "Out of stock";
        else if (quantity > product.stock) issue = `Only ${product.stock} left in stock`;
        if (issue) issues.push({ productId, message: `${product.name}: ${issue}` });

        lines.push({
            productId,
            available: true,
            name: product.name,
            slug: product.slug,
            sku: product.sku || "",
            image: product.images?.[0]?.url || "",
            category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
            stock: product.stock,
            originalPrice: pricing.price,
            unitPrice: pricing.finalPrice,
            onSale: pricing.discounted,
            discountPercent: pricing.discountPercent,
            quantity,
            lineTotal: roundMoney(pricing.finalPrice * quantity),
            issue,
        });
    }

    const pricedLines = lines.filter((line) => line.available);
    const subtotal = roundMoney(pricedLines.reduce((sum, line) => sum + line.lineTotal, 0));
    const originalSubtotal = roundMoney(pricedLines.reduce((sum, line) => sum + line.originalPrice * line.quantity, 0));

    const { flatRate = 0, freeShippingThreshold = 0 } = settings.shipping || {};
    const qualifiesForFree = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;
    const shipping = pricedLines.length === 0 || qualifiesForFree ? 0 : roundMoney(flatRate);
    const total = roundMoney(subtotal + shipping);

    if (strict && issues.length) throw ApiError.conflict(issues[0].message, issues);
    if (strict && pricedLines.length === 0) throw ApiError.badRequest("Your cart is empty");

    return {
        items: lines,
        subtotal,
        originalSubtotal,
        savings: roundMoney(originalSubtotal - subtotal),
        shipping,
        total,
        freeShippingThreshold,
        amountToFreeShipping: freeShippingThreshold > 0 ? roundMoney(Math.max(0, freeShippingThreshold - subtotal)) : 0,
        issues,
    };
};
