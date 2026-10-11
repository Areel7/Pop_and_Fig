import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
        slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
        description: { type: String, trim: true, maxlength: 1000, default: "" },
        image: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
