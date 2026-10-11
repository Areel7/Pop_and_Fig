import mongoose from "mongoose";
import Review from "../Models/Review.js";
import Product from "../Models/Product.js";
import Order from "../Models/Order.js";
import ApiError from "../Utils/ApiError.js";
import { buildMeta, escapeRegex, getPagination, sendSuccess } from "../Utils/helpers.js";

// A purchase counts once the order has been delivered or completed.
const REVIEWABLE_STATUSES = ["delivered", "completed"];

const hasPurchased = (userId, productId) =>
    Order.exists({ user: userId, "items.product": productId, status: { $in: REVIEWABLE_STATUSES } });

const findProduct = async (idOrSlug) => {
    const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
    return Product.findOne(query).select("_id status rating reviewCount").lean();
};

// GET /api/products/:id/reviews
const getProductReviews = async (req, res) => {
    const product = await findProduct(req.params.id);
    if (!product) throw ApiError.notFound("Product not found");

    const pagination = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const filter = { product: product._id, status: "published" };

    const [reviews, total, breakdownRows] = await Promise.all([
        Review.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).select("-user").lean(),
        Review.countDocuments(filter),
        Review.aggregate([{ $match: filter }, { $group: { _id: "$rating", count: { $sum: 1 } } }]),
    ]);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of breakdownRows) breakdown[row._id] = row.count;

    // Tell a logged-in customer whether they can review and surface their own review.
    let viewer = null;
    if (req.user) {
        const [ownReview, purchased] = await Promise.all([
            Review.findOne({ product: product._id, user: req.user._id }).lean(),
            hasPurchased(req.user._id, product._id),
        ]);
        viewer = { hasPurchased: Boolean(purchased), review: ownReview, canReview: Boolean(purchased) && !ownReview };
    }

    sendSuccess(res, {
        message: "Reviews",
        data: {
            reviews,
            summary: { averageRating: product.rating, reviewCount: product.reviewCount, breakdown },
            viewer,
        },
        meta: buildMeta(pagination, total),
    });
};

// POST /api/products/:id/reviews
const createReview = async (req, res) => {
    const product = await findProduct(req.params.id);
    if (!product || product.status !== "active") throw ApiError.notFound("Product not found");

    if (await Review.exists({ product: product._id, user: req.user._id })) {
        throw ApiError.conflict("You have already reviewed this product. You can edit your existing review.");
    }
    if (!(await hasPurchased(req.user._id, product._id))) {
        throw ApiError.forbidden("You can review this product once an order containing it has been delivered.");
    }

    const review = await Review.create({
        ...req.body,
        product: product._id,
        user: req.user._id,
        name: req.user.name,
        verifiedPurchase: true,
    });
    await Review.recalculateProductRating(product._id);

    sendSuccess(res, { status: 201, message: "Thank you for your review!", data: review });
};

const findOwnedReview = async (req) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound("Review not found");
    const isOwner = String(review.user) === String(req.user._id);
    return { review, isOwner };
};

// PATCH /api/reviews/:id — owner only.
const updateReview = async (req, res) => {
    const { review, isOwner } = await findOwnedReview(req);
    if (!isOwner) throw ApiError.notFound("Review not found");

    review.set(req.body);
    await review.save();
    await Review.recalculateProductRating(review.product);
    sendSuccess(res, { message: "Review updated", data: review });
};

// DELETE /api/reviews/:id — owner or admin.
const deleteReview = async (req, res) => {
    const { review, isOwner } = await findOwnedReview(req);
    if (!isOwner && req.user.role !== "admin") throw ApiError.notFound("Review not found");

    await review.deleteOne();
    await Review.recalculateProductRating(review.product);
    sendSuccess(res, { message: "Review deleted", data: { _id: review._id, product: review.product } });
};

// GET /api/reviews — recent published reviews for storefront testimonials (no customer identifiers).
const listRecentReviews = async (req, res) => {
    const limit = Math.min(12, Math.max(1, Number.parseInt(req.query.limit, 10) || 6));
    const minRating = Math.min(5, Math.max(1, Number.parseInt(req.query.minRating, 10) || 4));
    const reviews = await Review.find({ status: "published", rating: { $gte: minRating } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("name rating title comment createdAt product verifiedPurchase")
        .populate({ path: "product", select: "name slug status", match: { status: "active" } })
        .lean();
    const data = reviews
        .filter((r) => r.product)
        .map((r) => ({ ...r, name: r.name.split(" ")[0] + (r.name.split(" ")[1] ? ` ${r.name.split(" ")[1][0]}.` : "") }));
    sendSuccess(res, { message: "Recent reviews", data });
};

// GET /api/admin/reviews
const listReviews = async (req, res) => {
    const q = req.validatedQuery;
    const pagination = getPagination(q, { defaultLimit: 20, maxLimit: 100 });
    const filter = {};
    if (q.rating) filter.rating = q.rating;
    if (q.status === "published" || q.status === "hidden") filter.status = q.status;
    if (q.search) {
        const pattern = new RegExp(escapeRegex(q.search), "i");
        const productIds = await Product.find({ name: pattern }).distinct("_id");
        filter.$or = [{ name: pattern }, { comment: pattern }, { title: pattern }, { product: { $in: productIds } }];
    }

    const [reviews, total] = await Promise.all([
        Review.find(filter)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .populate("product", "name slug images")
            .populate("user", "name email")
            .lean(),
        Review.countDocuments(filter),
    ]);
    sendSuccess(res, { message: "Reviews", data: reviews, meta: buildMeta(pagination, total) });
};

// PATCH /api/admin/reviews/:id — publish / hide.
const moderateReview = async (req, res) => {
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { returnDocument: "after" });
    if (!review) throw ApiError.notFound("Review not found");
    await Review.recalculateProductRating(review.product);
    sendSuccess(res, { message: review.status === "hidden" ? "Review hidden" : "Review published", data: review });
};

export { listRecentReviews, getProductReviews, createReview, updateReview, deleteReview, listReviews, moderateReview };
