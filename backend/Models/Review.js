import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: { validator: Number.isInteger, message: "Rating must be a whole number" },
        },
        title: { type: String, trim: true, maxlength: 120, default: "" },
        comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
        status: { type: String, enum: ["published", "hidden"], default: "published" },
        verifiedPurchase: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ status: 1, createdAt: -1 });

// Recalculates a product's rating aggregate from published reviews (the only source of truth).
reviewSchema.statics.recalculateProductRating = async function recalculateProductRating(productId) {
    const [stats] = await this.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: "published" } },
        { $group: { _id: "$product", average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    await mongoose.model("Product").updateOne(
        { _id: productId },
        {
            $set: {
                rating: stats ? Math.round(stats.average * 10) / 10 : 0,
                reviewCount: stats ? stats.count : 0,
            },
        }
    );
};

const Review = mongoose.model("Review", reviewSchema);

export default Review;
