import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, trim: true },
        alt: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 150 },
        slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
        description: { type: String, trim: true, maxlength: 5000, default: "" },
        shortDescription: { type: String, trim: true, maxlength: 300, default: "" },
        price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
        // Product-level sale, controlled explicitly by the admin. Invariant (enforced below):
        // onSale === false  ->  salePrice === null
        // onSale === true   ->  0 < salePrice < price
        onSale: { type: Boolean, default: false },
        salePrice: { type: Number, default: null },
        images: { type: [imageSchema], default: [] },
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
        stock: {
            type: Number,
            required: true,
            min: [0, "Stock cannot be negative"],
            validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
        },
        sku: { type: String, trim: true, uppercase: true, maxlength: 60 },
        status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
        condition: { type: String, enum: ["new", "used"], default: "new" },
        featured: { type: Boolean, default: false },
        tags: { type: [String], default: [] },

        // Aggregates maintained by the backend (never accepted from clients).
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0, min: 0 },
        sold: { type: Number, default: 0, min: 0 },

        // Denormalised pricing kept in sync by pricingService so the shop can filter/sort by the
        // price customers actually pay. Checkout always recalculates live.
        // finalPrice is the unit price customers pay (sale price and/or a running Discounts campaign);
        // discountPercent is derived from it — never entered manually.
        finalPrice: { type: Number, default: 0, index: true },
        discountPercent: { type: Number, default: 0 },
        activeDiscount: { type: mongoose.Schema.Types.ObjectId, ref: "Discount", default: null },
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

// Enforces the sale invariant on every save, whatever the client sent.
productSchema.pre("validate", function enforceSaleRules() {
    if (!this.onSale) {
        this.salePrice = null;
        return;
    }
    if (this.salePrice === null || this.salePrice === undefined || !Number.isFinite(this.salePrice)) {
        this.invalidate("salePrice", "Enter a sale price, or turn the sale off");
    } else if (this.salePrice <= 0) {
        this.invalidate("salePrice", "Sale price must be greater than 0");
    } else if (this.salePrice >= this.price) {
        this.invalidate("salePrice", "Sale price must be lower than the regular price");
    }
});

productSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: "string", $gt: "" } } });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, featured: 1, createdAt: -1 });
productSchema.index({ status: 1, sold: -1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: "text", tags: "text", sku: "text", shortDescription: "text", description: "text" }, {
    weights: { name: 10, tags: 6, sku: 6, shortDescription: 3, description: 1 },
    name: "product_text_search",
});

productSchema.virtual("inStock").get(function inStock() {
    return this.stock > 0;
});

productSchema.set("toJSON", { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret.id; return ret; } });

const Product = mongoose.model("Product", productSchema);

export default Product;
