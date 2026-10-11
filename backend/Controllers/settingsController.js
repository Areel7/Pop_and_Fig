import Settings from "../Models/Settings.js";
import { FONT_OPTIONS } from "../Utils/constants.js";
import { sendSuccess } from "../Utils/helpers.js";

const SECTIONS = ["theme", "typography", "hero", "promo", "store", "social", "shipping"];

const serialize = (settings) => {
    const { _id, key, __v, ...rest } = settings.toJSON();
    return { ...rest, fonts: FONT_OPTIONS };
};

// GET /api/settings — public storefront configuration (contains no secrets).
const getSettings = async (req, res) => {
    const settings = await Settings.getSingleton();
    res.set("Cache-Control", "no-cache");
    sendSuccess(res, { message: "Settings", data: serialize(settings) });
};

// PATCH /api/admin/settings — partial update; only whitelisted, validated fields are applied.
const updateSettings = async (req, res) => {
    const settings = await Settings.getSingleton();

    for (const section of SECTIONS) {
        const values = req.body[section];
        if (!values) continue;
        for (const [field, value] of Object.entries(values)) {
            settings.set(`${section}.${field}`, value);
        }
    }
    await settings.save();

    sendSuccess(res, { message: "Settings saved", data: serialize(settings) });
};

export { getSettings, updateSettings };
