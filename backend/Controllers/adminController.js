import mongoose from "mongoose";
import User from "../Models/User.js";
import Order from "../Models/Order.js";
import Product from "../Models/Product.js";
import Review from "../Models/Review.js";
import ApiError from "../Utils/ApiError.js";
import { buildMeta, escapeRegex, getPagination, roundMoney, sendSuccess } from "../Utils/helpers.js";
import { getGmailStatus } from "../Config/gmail.js";
import { sendTestEmail } from "../Services/emailService.js";
import { isCloudinaryConfigured, storeImage } from "../Services/uploadService.js";

// Revenue counts every order that has not been cancelled.
const REVENUE_MATCH = { status: { $ne: "cancelled" } };
const LOW_STOCK_THRESHOLD = 5;

const dayKey = (date) => date.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Dashboard — every number is computed from MongoDB.
// ---------------------------------------------------------------------------

const getDashboard = async (req, res) => {
    const days = req.validatedQuery?.days || 30;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [
        revenueTotals,
        totalOrders,
        totalProducts,
        totalCustomers,
        totalReviews,
        statusRows,
        dailyRows,
        topProducts,
        topCustomers,
        recentOrders,
        lowStockCount,
        outOfStockCount,
    ] = await Promise.all([
        Order.aggregate([{ $match: REVENUE_MATCH }, { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } }]),
        Order.countDocuments(),
        Product.countDocuments(),
        User.countDocuments({ role: "customer" }),
        Review.countDocuments(),
        Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Order.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
                },
            },
        ]),
        Order.aggregate([
            { $match: REVENUE_MATCH },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $ifNull: ["$items.product", "$items.name"] },
                    name: { $last: "$items.name" },
                    image: { $last: "$items.image" },
                    quantity: { $sum: "$items.quantity" },
                    revenue: { $sum: "$items.lineTotal" },
                },
            },
            { $sort: { quantity: -1, revenue: -1 } },
            { $limit: 5 },
        ]),
        Order.aggregate([
            { $match: REVENUE_MATCH },
            { $group: { _id: "$user", totalSpent: { $sum: "$total" }, orders: { $sum: 1 }, lastOrderAt: { $max: "$createdAt" } } },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: { totalSpent: 1, orders: 1, lastOrderAt: 1, name: "$user.name", email: "$user.email" } },
        ]),
        Order.find().sort({ createdAt: -1 }).limit(6).select("orderNumber customer.name total status createdAt").lean(),
        Product.countDocuments({ stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
        Product.countDocuments({ stock: 0 }),
    ]);

    const statusCounts = Object.fromEntries(statusRows.map((s) => [s._id, s.count]));
    const byDay = new Map(dailyRows.map((row) => [row._id, row]));
    const timeline = [];
    for (let i = 0; i < days; i += 1) {
        const date = new Date(since);
        date.setUTCDate(since.getUTCDate() + i);
        const key = dayKey(date);
        timeline.push({ date: key, orders: byDay.get(key)?.orders || 0, revenue: roundMoney(byDay.get(key)?.revenue || 0) });
    }

    const revenue = roundMoney(revenueTotals[0]?.revenue || 0);
    const revenueOrders = revenueTotals[0]?.count || 0;

    sendSuccess(res, {
        message: "Dashboard",
        data: {
            stats: {
                totalRevenue: revenue,
                totalOrders,
                totalProducts,
                totalCustomers,
                totalReviews,
                pendingOrders: statusCounts.pending || 0,
                completedOrders: statusCounts.completed || 0,
                averageOrderValue: revenueOrders ? roundMoney(revenue / revenueOrders) : 0,
                lowStockProducts: lowStockCount,
                outOfStockProducts: outOfStockCount,
            },
            statusCounts,
            timeline,
            topProducts: topProducts.map((p) => ({ ...p, revenue: roundMoney(p.revenue) })),
            topCustomers: topCustomers.map((c) => ({ ...c, totalSpent: roundMoney(c.totalSpent) })),
            recentOrders,
            range: { days, since },
        },
    });
};

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

const orderStatsLookup = {
    $lookup: {
        from: "orders",
        let: { userId: "$_id" },
        pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$userId"] } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
                    lastOrderAt: { $max: "$createdAt" },
                },
            },
        ],
        as: "orderStats",
    },
};

const CUSTOMER_SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    spending: { totalSpent: -1, createdAt: -1 },
    orders: { totalOrders: -1, createdAt: -1 },
    name: { name: 1 },
};

const listCustomers = async (req, res) => {
    const q = req.validatedQuery;
    const pagination = getPagination(q, { defaultLimit: 20, maxLimit: 100 });
    const match = { role: "customer" };
    if (q.status === "active" || q.status === "blocked") match.status = q.status;
    if (q.search) {
        const pattern = new RegExp(escapeRegex(q.search), "i");
        match.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const [result] = await User.aggregate([
        { $match: match },
        orderStatsLookup,
        {
            $addFields: {
                totalOrders: { $ifNull: [{ $first: "$orderStats.totalOrders" }, 0] },
                totalSpent: { $ifNull: [{ $first: "$orderStats.totalSpent" }, 0] },
                lastOrderAt: { $first: "$orderStats.lastOrderAt" },
            },
        },
        { $project: { name: 1, email: 1, phone: 1, status: 1, createdAt: 1, totalOrders: 1, totalSpent: 1, lastOrderAt: 1 } },
        { $sort: CUSTOMER_SORTS[q.sort] || CUSTOMER_SORTS.newest },
        { $facet: { items: [{ $skip: pagination.skip }, { $limit: pagination.limit }], total: [{ $count: "count" }] } },
    ]);

    sendSuccess(res, {
        message: "Customers",
        data: result.items.map((c) => ({ ...c, totalSpent: roundMoney(c.totalSpent) })),
        meta: buildMeta(pagination, result.total[0]?.count || 0),
    });
};

const getCustomer = async (req, res) => {
    const customer = await User.findOne({ _id: req.params.id, role: "customer" }).lean();
    if (!customer) throw ApiError.notFound("Customer not found");

    const userId = new mongoose.Types.ObjectId(String(customer._id));
    const [orders, stats, reviewCount] = await Promise.all([
        Order.find({ user: userId }).sort({ createdAt: -1 }).limit(50).select("orderNumber total status paymentStatus createdAt items.quantity").lean(),
        Order.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
                    completedOrders: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    firstOrderAt: { $min: "$createdAt" },
                    lastOrderAt: { $max: "$createdAt" },
                },
            },
        ]),
        Review.countDocuments({ user: userId }),
    ]);

    const s = stats[0] || { totalOrders: 0, totalSpent: 0, completedOrders: 0, cancelledOrders: 0 };
    const paidOrders = s.totalOrders - s.cancelledOrders;

    sendSuccess(res, {
        message: "Customer",
        data: {
            customer: {
                _id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                status: customer.status,
                shippingAddress: customer.shippingAddress,
                createdAt: customer.createdAt,
                lastLoginAt: customer.lastLoginAt,
                wishlistCount: customer.wishlist?.length || 0,
            },
            stats: {
                totalOrders: s.totalOrders,
                totalSpent: roundMoney(s.totalSpent),
                averageOrderValue: paidOrders > 0 ? roundMoney(s.totalSpent / paidOrders) : 0,
                completedOrders: s.completedOrders,
                cancelledOrders: s.cancelledOrders,
                firstOrderAt: s.firstOrderAt || null,
                lastOrderAt: s.lastOrderAt || null,
                reviewCount,
            },
            orders: orders.map((o) => ({ ...o, itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0), items: undefined })),
        },
    });
};

const updateCustomerStatus = async (req, res) => {
    const customer = await User.findOneAndUpdate(
        { _id: req.params.id, role: "customer" },
        { $set: { status: req.body.status } },
        { returnDocument: "after" }
    );
    if (!customer) throw ApiError.notFound("Customer not found");
    sendSuccess(res, {
        message: customer.status === "blocked" ? "Customer blocked" : "Customer re-activated",
        data: customer.toProfile(),
    });
};

// ---------------------------------------------------------------------------
// Uploads & email diagnostics
// ---------------------------------------------------------------------------

const uploadImages = async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest("Choose at least one image to upload");
    const urls = await Promise.all(req.files.map((file) => storeImage(file)));
    sendSuccess(res, {
        status: 201,
        message: `${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`,
        data: { urls, storage: isCloudinaryConfigured() ? "cloudinary" : "local" },
    });
};

const getEmailStatus = async (req, res) => {
    const [failed, pending] = await Promise.all([
        Order.countDocuments({ status: "completed", emailStatus: "failed" }),
        Order.countDocuments({ status: "completed", emailStatus: "pending" }),
    ]);
    sendSuccess(res, { message: "Email status", data: { gmail: getGmailStatus(), failedEmails: failed, pendingEmails: pending } });
};

const sendTestEmailHandler = async (req, res) => {
    try {
        await sendTestEmail(req.body.to);
    } catch (error) {
        console.error(`[gmail] Test email failed: ${error.message}`);
        throw new ApiError(502, error.message);
    }
    sendSuccess(res, { message: `Test email sent to ${req.body.to}` });
};

export { getDashboard, listCustomers, getCustomer, updateCustomerStatus, uploadImages, getEmailStatus, sendTestEmailHandler };
