import { formatDate } from "../../../utils/format.js";

// Status shown in the admin list, derived from isActive, the schedule and the server's isLive flag.
export const getDiscountStatus = (discount) => {
    const now = Date.now();
    if (!discount.isActive) return { key: "inactive", badge: "inactive", label: "Inactive" };
    if (discount.endDate && new Date(discount.endDate).getTime() < now) return { key: "expired", badge: "refunded", label: "Expired" };
    if (discount.startDate && new Date(discount.startDate).getTime() > now) return { key: "scheduled", badge: "confirmed", label: "Scheduled" };
    if (discount.isLive) return { key: "live", badge: "active", label: "Live" };
    return { key: "inactive", badge: "inactive", label: "Not live" };
};

export const describeSchedule = (discount) => {
    const { startDate, endDate } = discount;
    if (!startDate && !endDate) return "Always";
    if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    return `Until ${formatDate(endDate)}`;
};

// <input type="datetime-local"> works in local time without a timezone suffix.
export const isoToLocalInput = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const localInputToIso = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Maps backend validation errors ([{ field, message }]) to { field: message }.
export const toFieldErrors = (error) =>
    (error?.data?.errors || []).reduce((acc, { field, message }) => {
        const key = String(field || "").split(".")[0];
        if (key && !acc[key]) acc[key] = message;
        return acc;
    }, {});
