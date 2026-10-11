import crypto from "crypto";
import env from "../Config/env.js";
import { gmailNotConfiguredMessage, isGmailConfigured, sendRawEmail } from "../Config/gmail.js";
import Settings from "../Models/Settings.js";
import { orderCompletionTemplate, passwordResetTemplate, testEmailTemplate } from "./emailTemplates.js";

// Header values must never contain CR/LF (prevents header injection).
const headerSafe = (value = "") => String(value).replace(/[\r\n]+/g, " ").trim();

// RFC 2047 encoded-word for non-ASCII header text.
const encodeHeader = (value) => {
    const safe = headerSafe(value);
    return /^[\x20-\x7E]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, "utf8").toString("base64")}?=`;
};

const wrapBase64 = (content) => Buffer.from(content, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");

// Builds an RFC 2822 multipart/alternative message (plain text + HTML).
export const buildMimeMessage = ({ to, subject, html, text, replyTo }) => {
    const boundary = `pf_${crypto.randomBytes(12).toString("hex")}`;
    // ASCII display names are quoted (RFC 5322); non-ASCII ones become an encoded-word.
    const senderName = headerSafe(env.GMAIL_SENDER_NAME).replace(/["\\]/g, "");
    const fromName = /^[\x20-\x7E]*$/.test(senderName) ? `"${senderName}"` : encodeHeader(senderName);
    const senderDomain = (env.GMAIL_SENDER_EMAIL || "localhost").split("@")[1] || "localhost";

    const headers = [
        `From: ${fromName} <${headerSafe(env.GMAIL_SENDER_EMAIL)}>`,
        `To: ${headerSafe(to)}`,
        replyTo ? `Reply-To: ${headerSafe(replyTo)}` : null,
        `Subject: ${encodeHeader(subject)}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${crypto.randomUUID()}@${senderDomain}>`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean);

    const message = [
        ...headers,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        wrapBase64(text || ""),
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        wrapBase64(html),
        `--${boundary}--`,
        "",
    ].join("\r\n");

    return Buffer.from(message, "utf8").toString("base64url");
};

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
    if (!EMAIL_PATTERN.test(String(to || ""))) throw new Error("Recipient email address is invalid");
    if (!isGmailConfigured()) {
        throw new Error(gmailNotConfiguredMessage());
    }
    const raw = buildMimeMessage({ to, subject, html, text, replyTo });
    return sendRawEmail(raw);
};

const getStore = async () => (await Settings.getSingleton()).store;

/**
 * Sends the order-completion email to the customer through the Gmail API.
 * Duplicate prevention and status tracking are handled by the caller (orderService).
 */
export const sendOrderCompletionEmail = async (order) => {
    const store = await getStore();
    const { subject, html, text } = orderCompletionTemplate({ order, store });
    return sendEmail({ to: order.customer.email, subject, html, text, replyTo: store.email || undefined });
};

export const sendPasswordResetEmail = async ({ user, resetUrl }) => {
    const store = await getStore();
    const { subject, html, text } = passwordResetTemplate({ name: user.name, resetUrl, store });
    return sendEmail({ to: user.email, subject, html, text });
};

export const sendTestEmail = async (to) => {
    const store = await getStore();
    const { subject, html, text } = testEmailTemplate({ store });
    return sendEmail({ to, subject, html, text });
};
