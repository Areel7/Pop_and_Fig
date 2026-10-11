import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
    {
        address: { type: String, trim: true, maxlength: 200 },
        city: { type: String, trim: true, maxlength: 100 },
        state: { type: String, trim: true, maxlength: 100 },
        postalCode: { type: String, trim: true, maxlength: 20 },
        country: { type: String, trim: true, maxlength: 100 },
    },
    { _id: false }
);

const cartItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
        phone: { type: String, trim: true, maxlength: 30, default: "" },
        status: { type: String, enum: ["active", "blocked"], default: "active" },
        shippingAddress: { type: addressSchema, default: () => ({}) },
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
        cart: { type: [cartItemSchema], default: [] },
        passwordChangedAt: Date,
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },
        lastLoginAt: Date,
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                delete ret.passwordChangedAt;
                delete ret.__v;
                return ret;
            },
        },
    }
);

userSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
    return bcrypt.compare(candidate, this.password);
};

// Public profile returned to the frontend: never includes credentials, cart or wishlist internals.
userSchema.methods.toProfile = function toProfile() {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        role: this.role,
        isAdmin: this.role === "admin",
        status: this.status,
        shippingAddress: this.shippingAddress || {},
        createdAt: this.createdAt,
    };
};

const User = mongoose.model("User", userSchema);

export default User;
