// Usage: npm run create-admin            (create/promote the ADMIN_EMAIL account)
//        npm run create-admin -- --reset (also reset its password to ADMIN_PASSWORD)
import mongoose from "mongoose";
import env, { assertRequiredEnv } from "../Config/env.js";
import { ensureAdmin } from "../Services/adminBootstrap.js";

const run = async () => {
    assertRequiredEnv();
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
    }

    await mongoose.connect(env.MONGODB_URI);
    const result = await ensureAdmin({ resetPassword: process.argv.includes("--reset") });

    const messages = {
        created: `Admin account created for ${result.email}`,
        updated: `Admin account updated for ${result.email}`,
        exists: `Admin account already exists for ${result.email} (use --reset to reset its password)`,
    };
    console.log(messages[result.status]);
};

run()
    .catch((error) => {
        console.error(`Failed to create admin: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
