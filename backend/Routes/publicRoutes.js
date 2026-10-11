import express from "express";
import { listActiveDiscounts } from "../Controllers/discountController.js";
import { getSettings } from "../Controllers/settingsController.js";

// Small public read-only resources.
const router = express.Router();

router.get("/discounts", listActiveDiscounts);
router.get("/settings", getSettings);

export default router;
