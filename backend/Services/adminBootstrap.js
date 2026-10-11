import User from "../Models/User.js";
import env from "../Config/env.js";

/**
 * Creates the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD, or promotes an existing
 * user with that email. Never overwrites an existing password unless `resetPassword` is true.
 */
export const ensureAdmin = async ({ resetPassword = false } = {}) => {
    const email = env.ADMIN_EMAIL?.toLowerCase();
    if (!email || !env.ADMIN_PASSWORD) return { status: "skipped" };

    if (env.ADMIN_PASSWORD.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }

    const existing = await User.findOne({ email }).select("+password");
    if (!existing) {
        await User.create({ name: env.ADMIN_NAME, email, password: env.ADMIN_PASSWORD, role: "admin" });
        return { status: "created", email };
    }

    let changed = false;
    if (existing.role !== "admin") {
        existing.role = "admin";
        changed = true;
    }
    if (existing.status !== "active") {
        existing.status = "active";
        changed = true;
    }
    if (resetPassword) {
        existing.password = env.ADMIN_PASSWORD;
        changed = true;
    }
    if (changed) await existing.save();
    return { status: changed ? "updated" : "exists", email };
};
