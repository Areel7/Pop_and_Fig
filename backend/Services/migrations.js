import Product from "../Models/Product.js";
import Discount from "../Models/Discount.js";
import Settings from "../Models/Settings.js";

/**
 * Idempotent data fixes run at start-up so existing records follow the current business rules.
 * Safe to run on every boot: each step only touches documents that are out of line.
 */
export const runMigrations = async () => {
    const results = {};

    // 1. Product sale invariant: a sale exists only with 0 < salePrice < price (this also repairs
    //    products that were saved with salePrice 0 by the old validator and showed as 100% off).
    const invalidSale = await Product.updateMany(
        {
            $or: [
                { salePrice: { $ne: null }, $expr: { $or: [{ $lte: ["$salePrice", 0] }, { $gte: ["$salePrice", "$price"] }] } },
                { onSale: true, salePrice: null },
            ],
        },
        { $set: { onSale: false, salePrice: null } }
    );
    const validSale = await Product.updateMany(
        { onSale: { $ne: true }, salePrice: { $ne: null }, $expr: { $and: [{ $gt: ["$salePrice", 0] }, { $lt: ["$salePrice", "$price"] }] } },
        { $set: { onSale: true } }
    );
    results.productsSaleRemoved = invalidSale.modifiedCount;
    results.productsSaleFlagged = validSale.modifiedCount;

    // 2. Coupons were removed: delete coupon documents and drop coupon-only fields/indexes.
    const coupons = await Discount.collection.deleteMany({ code: { $type: "string", $gt: "" } });
    await Discount.collection.updateMany({}, { $unset: { code: "", minOrderAmount: "", usageLimit: "", usageCount: "" } });
    await Discount.syncIndexes();
    results.couponsRemoved = coupons.deletedCount;

    // 3. Store currency is PKR by business rule; replace the old USD shipping defaults.
    await Settings.collection.updateMany({}, { $unset: { "store.currency": "" } });
    const shipping = await Settings.collection.updateMany(
        { "shipping.flatRate": 5, "shipping.freeShippingThreshold": 75 },
        { $set: { "shipping.flatRate": 250, "shipping.freeShippingThreshold": 0 } }
    );
    results.shippingDefaultsUpdated = shipping.modifiedCount;

    return results;
};
