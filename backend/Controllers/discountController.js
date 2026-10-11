import Discount from "../Models/Discount.js";
import Product from "../Models/Product.js";
import Category from "../Models/Category.js";
import ApiError from "../Utils/ApiError.js";
import { sendSuccess } from "../Utils/helpers.js";
import { getLiveAutomaticDiscounts, isDiscountLive, refreshProductPricing } from "../Services/pricingService.js";

// GET /api/discounts — sales campaigns that are currently running.
const listActiveDiscounts = async (req, res) => {
    const discounts = await getLiveAutomaticDiscounts();
    sendSuccess(res, {
        message: "Active sales",
        data: discounts.map(({ _id, name, description, type, value, appliesTo, endDate }) => ({
            _id, name, description, type, value, appliesTo, endDate,
        })),
    });
};

// GET /api/admin/discounts
const listDiscounts = async (req, res) => {
    const discounts = await Discount.find()
        .sort({ createdAt: -1 })
        .populate("products", "name")
        .populate("categories", "name")
        .lean();
    const now = new Date();
    sendSuccess(res, {
        message: "Discounts",
        data: discounts.map((d) => ({ ...d, isLive: isDiscountLive(d, now) })),
    });
};

const assertTargets = async ({ products, categories }) => {
    if (products?.length && (await Product.countDocuments({ _id: { $in: products } })) !== new Set(products).size) {
        throw ApiError.badRequest("One or more selected products do not exist");
    }
    if (categories?.length && (await Category.countDocuments({ _id: { $in: categories } })) !== new Set(categories).size) {
        throw ApiError.badRequest("One or more selected categories do not exist");
    }
};

const normalise = (body) => {
    const data = { ...body };
    if (data.appliesTo === "all") {
        data.products = [];
        data.categories = [];
    } else if (data.appliesTo === "products") data.categories = [];
    else if (data.appliesTo === "categories") data.products = [];
    return data;
};

const createDiscount = async (req, res) => {
    await assertTargets(req.body);
    const discount = await Discount.create(normalise(req.body));
    await refreshProductPricing();
    sendSuccess(res, { status: 201, message: "Discount created successfully", data: discount });
};

const updateDiscount = async (req, res) => {
    const discount = await Discount.findById(req.params.id);
    if (!discount) throw ApiError.notFound("Discount not found");

    await assertTargets(req.body);
    discount.set(normalise(req.body));
    if (discount.endDate && discount.startDate && discount.endDate <= discount.startDate) {
        throw ApiError.badRequest("End date must be after the start date");
    }
    await discount.save();
    await refreshProductPricing();
    sendSuccess(res, { message: "Discount updated successfully", data: discount });
};

const deleteDiscount = async (req, res) => {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) throw ApiError.notFound("Discount not found");
    await refreshProductPricing();
    sendSuccess(res, { message: "Discount deleted successfully", data: { _id: discount._id } });
};

export { listActiveDiscounts, listDiscounts, createDiscount, updateDiscount, deleteDiscount };
