import mongoose from "mongoose";
import Category from "../Models/Category.js";
import Product from "../Models/Product.js";
import Discount from "../Models/Discount.js";
import ApiError from "../Utils/ApiError.js";
import { sendSuccess, slugify } from "../Utils/helpers.js";

const isAdmin = (req) => req.user?.role === "admin";

const uniqueSlug = async (source, excludeId) => {
    const base = slugify(source) || "category";
    let slug = base;
    for (let n = 2; await Category.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); n += 1) {
        slug = `${base}-${n}`;
    }
    return slug;
};

// Product counts per category (customers only see active products counted).
const countProducts = async (categoryIds, { activeOnly }) => {
    const match = { category: { $in: categoryIds } };
    if (activeOnly) match.status = "active";
    const counts = await Product.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]);
    return new Map(counts.map((c) => [String(c._id), c.count]));
};

// GET /api/categories — admins may pass ?status=all to include inactive categories.
const listCategories = async (req, res) => {
    const admin = isAdmin(req) && req.query.status === "all";
    const categories = await Category.find(admin ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await countProducts(categories.map((c) => c._id), { activeOnly: !admin });

    sendSuccess(res, {
        message: "Categories",
        data: categories.map((c) => ({ ...c, productCount: counts.get(String(c._id)) || 0 })),
    });
};

// GET /api/categories/:id — accepts an ObjectId or slug.
const getCategory = async (req, res) => {
    const { id } = req.params;
    const category = mongoose.isValidObjectId(id)
        ? await Category.findById(id).lean()
        : await Category.findOne({ slug: String(id).toLowerCase() }).lean();

    if (!category || (!category.isActive && !isAdmin(req))) throw ApiError.notFound("Category not found");

    const counts = await countProducts([category._id], { activeOnly: !isAdmin(req) });
    sendSuccess(res, { message: "Category", data: { ...category, productCount: counts.get(String(category._id)) || 0 } });
};

const createCategory = async (req, res) => {
    const category = await Category.create({ ...req.body, slug: await uniqueSlug(req.body.slug || req.body.name) });
    sendSuccess(res, { status: 201, message: "Category created successfully", data: { ...category.toJSON(), productCount: 0 } });
};

const updateCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw ApiError.notFound("Category not found");

    const body = { ...req.body };
    if (body.slug !== undefined) body.slug = await uniqueSlug(body.slug || body.name || category.name, category._id);

    category.set(body);
    await category.save();
    sendSuccess(res, { message: "Category updated successfully", data: category });
};

// Categories with products cannot be deleted — products must be moved or removed first.
const deleteCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw ApiError.notFound("Category not found");

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
        throw ApiError.conflict(
            `"${category.name}" still has ${productCount} product${productCount === 1 ? "" : "s"}. Move or delete them first, or deactivate the category instead.`
        );
    }

    await category.deleteOne();
    await Discount.updateMany({ categories: category._id }, { $pull: { categories: category._id } });
    sendSuccess(res, { message: "Category deleted successfully", data: { _id: category._id } });
};

export { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
