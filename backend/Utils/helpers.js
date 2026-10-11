// Consistent success envelope: { success, message, data, meta? }
export const sendSuccess = (res, { status = 200, message = "OK", data = null, meta } = {}) => {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(status).json(body);
};

export const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const slugify = (value = "") =>
    String(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

export const getPagination = (query, { defaultLimit = 12, maxLimit = 100 } = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit };
};

export const buildMeta = ({ page, limit }, total) => ({
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
});

export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
