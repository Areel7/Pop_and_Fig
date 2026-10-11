import mongoose from "mongoose";
import { FONT_NAMES, HEX_COLOR } from "../Utils/constants.js";

const color = (fallback) => ({
    type: String,
    default: fallback,
    match: [HEX_COLOR, "Colors must be hex values such as #111111"],
});

const font = (fallback) => ({ type: String, enum: FONT_NAMES, default: fallback });

const settingsSchema = new mongoose.Schema(
    {
        // Singleton document key.
        key: { type: String, default: "store", unique: true },
        theme: {
            primaryColor: color("#111111"),
            secondaryColor: color("#f5f1eb"),
            accentColor: color("#d4a373"),
            backgroundColor: color("#ffffff"),
            textColor: color("#111111"),
            buttonColor: color("#111111"),
        },
        typography: {
            headingFont: font("Inter"),
            bodyFont: font("Inter"),
            buttonFont: font("Inter"),
        },
        hero: {
            image: { type: String, default: "" },
            label: { type: String, default: "POP & FIGS", maxlength: 60 },
            title: { type: String, default: "Collect the characters you love.", maxlength: 120 },
            subtitle: {
                type: String,
                default: "Hand-picked pops, minifigures and collectibles — new and pre-loved — ready for your shelf.",
                maxlength: 300,
            },
            buttonText: { type: String, default: "Shop Collection", maxlength: 40 },
            buttonUrl: { type: String, default: "/shop", maxlength: 300 },
        },
        promo: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: "A LITTLE SOMETHING", maxlength: 60 },
            title: { type: String, default: "Something special is waiting.", maxlength: 120 },
            subtitle: {
                type: String,
                default: "Limited drops, rare finds and seasonal deals. Find the piece your collection is missing.",
                maxlength: 300,
            },
            buttonText: { type: String, default: "Discover the sale", maxlength: 40 },
            buttonUrl: { type: String, default: "/shop?onSale=true", maxlength: 300 },
        },
        store: {
            name: { type: String, default: "Pop & Figs", maxlength: 80 },
            tagline: {
                type: String,
                default: "Thoughtfully selected collectibles for every shelf. Simple, curated and made to be enjoyed.",
                maxlength: 200,
            },
            email: { type: String, default: "", maxlength: 120 },
            phone: { type: String, default: "", maxlength: 40 },
            address: { type: String, default: "", maxlength: 250 },
        },
        social: {
            instagram: { type: String, default: "" },
            facebook: { type: String, default: "" },
            tiktok: { type: String, default: "" },
            twitter: { type: String, default: "" },
            youtube: { type: String, default: "" },
        },
        shipping: {
            // PKR. A threshold of 0 disables free shipping.
            flatRate: { type: Number, default: 250, min: 0 },
            freeShippingThreshold: { type: Number, default: 0, min: 0 },
        },
    },
    { timestamps: true, toJSON: { versionKey: false } }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
    return this.findOneAndUpdate(
        { key: "store" },
        { $setOnInsert: { key: "store" } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
