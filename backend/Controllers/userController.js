import User from "../Models/User.js";
import Product from "../Models/Product.js";
import Review from "../Models/Review.js";
import Category from "../Models/Category.js";
import ApiError from "../Utils/ApiError.js";
import generateToken from "../Utils/createToken.js";
import { sendSuccess } from "../Utils/helpers.js";
import { quoteCart } from "../Services/pricingService.js";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const updateProfile = async (req, res) => {
    const { name, phone, shippingAddress } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (shippingAddress) {
        user.shippingAddress = { ...(user.shippingAddress?.toObject?.() || user.shippingAddress || {}), ...shippingAddress };
    }
    await user.save();

    sendSuccess(res, { message: "Profile updated", data: user.toProfile() });
};

const changePassword = async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(req.body.currentPassword))) {
        throw ApiError.badRequest("Your current password is incorrect");
    }
    user.password = req.body.newPassword;
    await user.save();

    // Password change invalidates older tokens; issue a fresh session for this device.
    generateToken(res, user._id);

    sendSuccess(res, { message: "Password changed successfully" });
};

// ---------------------------------------------------------------------------
// Wishlist (persisted on the user document)
// ---------------------------------------------------------------------------

const visibleProductFilter = async () => ({
    status: "active",
    category: { $in: await Category.find({ isActive: true }).distinct("_id") },
});

const getWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).select("wishlist").lean();
    const products = await Product.find({ _id: { $in: user.wishlist }, ...(await visibleProductFilter()) })
        .populate("category", "name slug")
        .lean();

    // Keep the saved order (most recently added last).
    const order = new Map(user.wishlist.map((id, index) => [String(id), index]));
    products.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id)));

    sendSuccess(res, { message: "Wishlist", data: products.map((p) => ({ ...p, inStock: p.stock > 0 })) });
};

const addToWishlist = async (req, res) => {
    const { productId } = req.body;
    if (!(await Product.exists({ _id: productId, status: "active" }))) throw ApiError.notFound("Product not found");

    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: productId } });
    sendSuccess(res, { status: 201, message: "Added to wishlist", data: { productId } });
};

const removeFromWishlist = async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
    sendSuccess(res, { message: "Removed from wishlist", data: { productId: req.params.productId } });
};

// ---------------------------------------------------------------------------
// Cart (persisted for authenticated users; prices always come from quoteCart)
// ---------------------------------------------------------------------------

const getCart = async (req, res) => {
    const user = await User.findById(req.user._id).select("cart").lean();
    const existing = await Product.find({ _id: { $in: user.cart.map((i) => i.product) } }).distinct("_id");
    const valid = new Set(existing.map(String));
    const items = user.cart.filter((i) => valid.has(String(i.product))).map((i) => ({ product: String(i.product), quantity: i.quantity }));
    sendSuccess(res, { message: "Cart", data: { items } });
};

const saveCart = async (req, res) => {
    const merged = new Map();
    for (const item of req.body.items) {
        merged.set(item.product, Math.min(99, (merged.get(item.product) || 0) + item.quantity));
    }
    const existing = await Product.find({ _id: { $in: [...merged.keys()] } }).distinct("_id");
    const valid = new Set(existing.map(String));
    const items = [...merged].filter(([id]) => valid.has(id)).map(([product, quantity]) => ({ product, quantity }));

    await User.updateOne({ _id: req.user._id }, { $set: { cart: items } });
    sendSuccess(res, { message: "Cart saved", data: { items } });
};

const quote = async (req, res) => {
    const data = await quoteCart(req.body.items);
    sendSuccess(res, { message: "Cart totals", data });
};

// ---------------------------------------------------------------------------
// Reviews written by the current user
// ---------------------------------------------------------------------------

const getMyReviews = async (req, res) => {
    const reviews = await Review.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate("product", "name slug images")
        .lean();
    sendSuccess(res, { message: "Your reviews", data: reviews });
};

export { updateProfile, changePassword, getWishlist, addToWishlist, removeFromWishlist, getCart, saveCart, quote, getMyReviews };
