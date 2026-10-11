import mongoose from "mongoose";

// A sales campaign (Admin → Discounts / Sales) that lowers product prices automatically for all
// products, selected products or selected categories. Fixed amounts are in PKR.
const discountSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, trim: true, maxlength: 500, default: "" },
        type: { type: String, enum: ["percentage", "fixed"], required: true },
        value: {
            type: Number,
            required: true,
            min: [0.01, "Discount value must be greater than zero"],
            validate: {
                validator(value) {
                    return this.type !== "percentage" || value <= 100;
                },
                message: "Percentage discounts cannot exceed 100%",
            },
        },
        appliesTo: { type: String, enum: ["all", "products", "categories"], default: "all" },
        products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
        categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
        isActive: { type: Boolean, default: true },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Discount = mongoose.model("Discount", discountSchema);

export default Discount;
