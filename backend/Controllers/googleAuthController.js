import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import env, { ROOT_DIR } from "../Config/env.js";
import { buildAuthUrl, exchangeCodeForTokens, GMAIL_SCOPE, isOAuthClientConfigured, setRefreshToken } from "../Config/gmail.js";
import { escapeHtml } from "../Utils/helpers.js";

// One-time setup flow for the STORE OWNER's Gmail account (never customers).
// The refresh token is saved to the git-ignored backend .env (fallback: .secrets/) and activated in
// memory. It is never included in an HTTP response or written to logs.

const STATE_COOKIE = "gmail_oauth_state";
const SECRETS_DIR = path.join(ROOT_DIR, ".secrets");
const TOKEN_FILE = path.join(SECRETS_DIR, "gmail-refresh-token.txt");
const TOKEN_FILE_DISPLAY = ".secrets/gmail-refresh-token.txt";
const ENV_FILE = path.join(ROOT_DIR, ".env");

// Stores the refresh token in the backend .env (git-ignored), replacing any previous value.
const saveRefreshTokenToEnv = async (refreshToken) => {
    const current = await fs.readFile(ENV_FILE, "utf8");
    const line = `GMAIL_REFRESH_TOKEN=${refreshToken}`;
    const pattern = /^GMAIL_REFRESH_TOKEN[ \t]*=.*$/m;
    const next = pattern.test(current)
        ? current.replace(pattern, () => line)
        : `${current.replace(/\n?$/, "\n")}${line}\n`;
    await fs.writeFile(ENV_FILE, next);
};

const stateCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: 10 * 60 * 1000,
    path: "/api/auth/google",
};

const page = (res, status, { title, tone = "info", body }) => {
    const accent = { success: "#2f7d4f", error: "#b42318", info: "#111111" }[tone];
    res.status(status)
        .set("Content-Type", "text/html; charset=utf-8")
        .set("Cache-Control", "no-store")
        .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Pop & Figs</title></head>
<body style="margin:0;background:#f5f1eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
<main style="max-width:640px;margin:48px auto;padding:0 16px;">
<p style="font-weight:800;letter-spacing:-0.5px;margin:0 0 24px;">POP<span style="font-weight:400">-AND-FIGS</span> · Gmail setup</p>
<section style="background:#fff;padding:32px;border-top:4px solid ${accent};">
<h1 style="margin:0 0 16px;font-size:24px;letter-spacing:-0.5px;">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.7;color:#444;">${body}</div>
</section></main></body></html>`);
};

const ADMIN_PATH = "/fahad-azeem-pop-and-figs-admin-fahad-login";
const adminLoginUrl = `${env.CLIENT_URL}${ADMIN_PATH}`;

// GET /api/auth/google — redirects the logged-in store admin to Google's consent screen.
export const startGoogleAuth = (req, res) => {
    if (!env.GMAIL_OAUTH_SETUP_ENABLED) {
        return page(res, 403, { title: "Gmail setup is disabled", tone: "error", body: "<p>Set <code>GMAIL_OAUTH_SETUP_ENABLED=true</code> in the backend <code>.env</code> and restart the server to run the setup flow.</p>" });
    }
    if (req.user?.role !== "admin") {
        return page(res, 401, {
            title: "Admin login required",
            tone: "error",
            body: `<p>Only the store admin can authorize the store's Gmail account.</p><p><a href="${escapeHtml(adminLoginUrl)}">Log in to the admin panel</a> in this browser, then open this page again.</p>`,
        });
    }
    if (!isOAuthClientConfigured()) {
        return page(res, 500, {
            title: "Google OAuth client is not configured",
            tone: "error",
            body: "<p>Add <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code> and <code>GMAIL_REDIRECT_URI</code> to the backend <code>.env</code> and restart the server.</p>",
        });
    }

    const state = crypto.randomBytes(24).toString("hex");
    res.cookie(STATE_COOKIE, state, stateCookieOptions);
    res.redirect(buildAuthUrl(state));
};

const statesMatch = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// GET /api/auth/google/callback — Google redirects here with an authorization code.
export const googleAuthCallback = async (req, res) => {
    const { code, state, error, scope } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...stateCookieOptions, maxAge: undefined });

    if (!env.GMAIL_OAUTH_SETUP_ENABLED) {
        return page(res, 403, { title: "Gmail setup is disabled", tone: "error", body: "<p>The OAuth setup flow is turned off.</p>" });
    }
    if (error) {
        return page(res, 400, { title: "Authorization was not completed", tone: "error", body: `<p>Google returned: <code>${escapeHtml(error)}</code>. <a href="/api/auth/google">Try again</a>.</p>` });
    }
    if (typeof code !== "string" || typeof state !== "string" || !statesMatch(state, expectedState)) {
        return page(res, 400, {
            title: "Invalid or expired setup request",
            tone: "error",
            body: '<p>The security check failed (state mismatch or the link expired). Start again from <a href="/api/auth/google">/api/auth/google</a> in the same browser.</p>',
        });
    }
    if (typeof scope === "string" && !scope.split(" ").includes(GMAIL_SCOPE)) {
        return page(res, 400, { title: "Gmail send permission was not granted", tone: "error", body: '<p>Please tick the "Send email on your behalf" permission. <a href="/api/auth/google">Try again</a>.</p>' });
    }

    let tokens;
    try {
        tokens = await exchangeCodeForTokens(code);
    } catch (exchangeError) {
        console.error(`[gmail-oauth] Token exchange failed: ${exchangeError.message}`);
        return page(res, 502, { title: "Token exchange failed", tone: "error", body: `<p>${escapeHtml(exchangeError.message)}</p><p>Check the client ID/secret and that the redirect URI exactly matches the one registered in Google Cloud.</p>` });
    }

    if (!tokens.refresh_token) {
        return page(res, 400, {
            title: "Google did not return a refresh token",
            tone: "error",
            body: '<p>This usually happens when the app was already authorized. Remove the app at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a> and <a href="/api/auth/google">authorize again</a>.</p>',
        });
    }

    // Activate immediately (no restart needed) and persist in the backend .env for future restarts.
    setRefreshToken(tokens.refresh_token);
    let savedTo = ".env";
    try {
        await saveRefreshTokenToEnv(tokens.refresh_token);
    } catch (writeError) {
        // e.g. read-only filesystem or env vars managed by the host: fall back to a private file.
        console.error(`[gmail-oauth] Could not update .env (${writeError.code || writeError.message}); using ${TOKEN_FILE_DISPLAY}`);
        await fs.mkdir(SECRETS_DIR, { recursive: true });
        await fs.writeFile(TOKEN_FILE, `${tokens.refresh_token}\n`, { mode: 0o600 });
        savedTo = TOKEN_FILE_DISPLAY;
    }
    console.log(`[gmail-oauth] Refresh token obtained and saved to ${savedTo} (value not logged)`);

    const failedEmailsLink = `${env.CLIENT_URL}${ADMIN_PATH}/orders?email=failed`;
    const savedToEnv = savedTo === ".env";

    return page(res, 200, {
        title: "Gmail authorized successfully",
        tone: "success",
        body: `<p>The store Gmail account granted <strong>send-only</strong> access, and order-completion emails are now <strong>active</strong>. For your security the refresh token is not shown on this page.</p>
${
    savedToEnv
        ? "<p>The token was saved to the backend <code>.env</code> as <code>GMAIL_REFRESH_TOKEN</code>, so it keeps working after restarts. No restart is needed.</p>"
        : `<p>The backend <code>.env</code> could not be updated, so the token was saved to <code>${TOKEN_FILE_DISPLAY}</code>. It works until the server restarts — copy it into your environment as <code>GMAIL_REFRESH_TOKEN</code> and delete the file.</p>`
}
<ol>
<li>Make sure you signed in as <strong>${escapeHtml(env.GMAIL_SENDER_EMAIL || "the store Gmail account")}</strong> (the <code>GMAIL_SENDER_EMAIL</code> account).</li>
<li>In the admin panel open <em>Settings → Email / Gmail</em> and click <em>Send test email</em>.</li>
<li>Retry any <a href="${escapeHtml(failedEmailsLink)}">orders whose completion email failed</a> with the <em>Retry email</em> button.</li>
</ol>`,
    });
};
