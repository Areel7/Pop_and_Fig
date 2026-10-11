import { escapeHtml } from "../Utils/helpers.js";
import { formatPrice } from "../Utils/currency.js";

// Table-based, inline-styled layouts: the most reliable approach across Gmail, Outlook and
// mobile clients. No external CSS, fonts or scripts.

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const layout = ({ storeName, preheader, body, footerNote = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(storeName)}</title>
<style>
  @media only screen and (max-width:620px){
    .container{width:100% !important}
    .px{padding-left:20px !important;padding-right:20px !important}
    .stack td{display:block !important;width:100% !important;box-sizing:border-box !important;text-align:left !important}
    .hide-sm{display:none !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f1eb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1eb;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;">
    <tr><td class="px" style="background:#111111;padding:28px 40px;font-family:${FONT};">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">${escapeHtml(storeName.toUpperCase())}</span>
    </td></tr>
    ${body}
    <tr><td class="px" style="padding:28px 40px;background:#111111;font-family:${FONT};color:#999999;font-size:12px;line-height:1.7;">
      ${footerNote}
      <div style="margin-top:8px;">&copy; ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

const summaryRow = (label, value, { bold = false, color = "#111111" } = {}) => `
<tr>
  <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:#666666;">${label}</td>
  <td align="right" style="padding:6px 0;font-family:${FONT};font-size:${bold ? 17 : 14}px;color:${color};font-weight:${bold ? 700 : 500};">${value}</td>
</tr>`;

export const orderCompletionTemplate = ({ order, store }) => {
    const storeName = store?.name || "Pop & Figs";
    const money = (v) => escapeHtml(formatPrice(v));
    const firstName = escapeHtml(order.customer.name.split(" ")[0] || order.customer.name);
    const address = order.shippingAddress;

    const itemRows = order.items
        .map(
            (item) => `
<tr>
  <td style="padding:14px 0;border-bottom:1px solid #eeeeee;font-family:${FONT};">
    <div style="font-size:14px;font-weight:600;color:#111111;">${escapeHtml(item.name)}</div>
    <div style="font-size:12px;color:#888888;margin-top:3px;">Qty ${item.quantity} &times; ${money(item.unitPrice)}${
        item.unitPrice < item.originalPrice ? ` <span style="text-decoration:line-through;">${money(item.originalPrice)}</span>` : ""
    }</div>
  </td>
  <td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid #eeeeee;font-family:${FONT};font-size:14px;font-weight:600;color:#111111;white-space:nowrap;">${money(item.lineTotal)}</td>
</tr>`
        )
        .join("");

    const body = `
<tr><td class="px" style="padding:44px 40px 12px;font-family:${FONT};">
  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2px;color:#999999;">ORDER COMPLETED</p>
  <h1 style="margin:0;font-size:30px;line-height:1.15;letter-spacing:-1px;color:#111111;font-weight:600;">Thank you, ${firstName}.</h1>
  <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#555555;">Your order has been completed. We hope you love your new additions — here is a summary for your records.</p>
</td></tr>
<tr><td class="px" style="padding:24px 40px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1eb;">
    <tr class="stack">
      <td style="padding:18px 20px;font-family:${FONT};width:50%;">
        <div style="font-size:11px;letter-spacing:1.5px;color:#888888;font-weight:700;">ORDER NUMBER</div>
        <div style="font-size:15px;color:#111111;font-weight:700;margin-top:4px;">${escapeHtml(order.orderNumber)}</div>
      </td>
      <td style="padding:18px 20px;font-family:${FONT};width:50%;text-align:right;">
        <div style="font-size:11px;letter-spacing:1.5px;color:#888888;font-weight:700;">ORDER DATE</div>
        <div style="font-size:15px;color:#111111;font-weight:700;margin-top:4px;">${escapeHtml(formatDate(order.createdAt))}</div>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td class="px" style="padding:24px 40px 0;">
  <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:#999999;">YOUR ITEMS</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows}</table>
</td></tr>
<tr><td class="px" style="padding:16px 40px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${summaryRow("Subtotal", money(order.subtotal))}
    ${order.savings > 0 ? summaryRow("Sale savings (included)", money(order.savings), { color: "#2f7d4f" }) : ""}
    ${summaryRow("Shipping", order.shipping > 0 ? money(order.shipping) : "Free")}
    <tr><td colspan="2" style="border-top:1px solid #111111;padding-top:6px;"></td></tr>
    ${summaryRow("Total", money(order.total), { bold: true })}
  </table>
</td></tr>
<tr><td class="px" style="padding:24px 40px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eeeeee;">
    <tr><td style="padding:20px;font-family:${FONT};font-size:14px;line-height:1.7;color:#555555;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#888888;font-weight:700;margin-bottom:6px;">DELIVERED TO</div>
      <strong style="color:#111111;">${escapeHtml(order.customer.name)}</strong><br>
      ${escapeHtml(address.address)}<br>
      ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postalCode)}<br>
      ${escapeHtml(address.country)}<br>
      ${escapeHtml(order.customer.phone)}
    </td></tr>
  </table>
  <p style="margin:28px 0 0;font-family:${FONT};font-size:14px;line-height:1.7;color:#555555;">Thank you for shopping with ${escapeHtml(storeName)}. If anything is not quite right, simply reply to this email and we will make it right.</p>
</td></tr>`;

    const footerNote = store?.email || store?.phone
        ? `Questions? ${[store.email, store.phone].filter(Boolean).map(escapeHtml).join(" &middot; ")}`
        : "";

    const html = layout({ storeName, preheader: `Your order ${order.orderNumber} is complete. Thank you!`, body, footerNote });

    const text = [
        `Thank you, ${order.customer.name}!`,
        `Your ${storeName} order ${order.orderNumber} (placed ${formatDate(order.createdAt)}) has been completed.`,
        "",
        ...order.items.map((i) => `- ${i.name} x${i.quantity} @ ${formatPrice(i.unitPrice)} = ${formatPrice(i.lineTotal)}`),
        "",
        `Subtotal: ${formatPrice(order.subtotal)}`,
        `Shipping: ${order.shipping > 0 ? formatPrice(order.shipping) : "Free"}`,
        `Total: ${formatPrice(order.total)}`,
        "",
        "Delivered to:",
        order.customer.name,
        address.address,
        `${address.city}, ${address.state} ${address.postalCode}`,
        address.country,
        "",
        `Thank you for shopping with ${storeName}.`,
    ]
        .filter((line) => line !== null)
        .join("\n");

    return { subject: `Your ${storeName} order ${order.orderNumber} is complete`, html, text };
};

export const passwordResetTemplate = ({ name, resetUrl, store }) => {
    const storeName = store?.name || "Pop & Figs";
    const body = `
<tr><td class="px" style="padding:44px 40px 40px;font-family:${FONT};">
  <h1 style="margin:0;font-size:26px;letter-spacing:-0.8px;color:#111111;font-weight:600;">Reset your password</h1>
  <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#555555;">Hi ${escapeHtml(name)}, we received a request to reset your ${escapeHtml(storeName)} password. This link expires in 30 minutes.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>
    <td style="background:#111111;"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Choose a new password</a></td>
  </tr></table>
  <p style="margin:28px 0 0;font-size:13px;line-height:1.7;color:#888888;">If you did not request this, you can safely ignore this email — your password will not change.</p>
</td></tr>`;
    return {
        subject: `Reset your ${storeName} password`,
        html: layout({ storeName, preheader: "Reset your password", body }),
        text: `Hi ${name},\n\nReset your ${storeName} password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    };
};

export const testEmailTemplate = ({ store }) => {
    const storeName = store?.name || "Pop & Figs";
    const body = `
<tr><td class="px" style="padding:44px 40px 40px;font-family:${FONT};">
  <h1 style="margin:0;font-size:26px;color:#111111;font-weight:600;">Gmail API is working</h1>
  <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#555555;">This test message was sent by the ${escapeHtml(storeName)} backend through the Gmail API using OAuth 2.0. Order-completion emails will be delivered the same way.</p>
</td></tr>`;
    return {
        subject: `${storeName} — Gmail API test`,
        html: layout({ storeName, preheader: "Gmail API test", body }),
        text: `This test message was sent by the ${storeName} backend through the Gmail API.`,
    };
};
