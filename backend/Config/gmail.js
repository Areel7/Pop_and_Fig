import env from "./env.js";

// Gmail API over OAuth 2.0 (no Gmail password, no SMTP). Implemented against Google's REST
// endpoints with Node's built-in fetch, so no SDK is needed. Credentials stay on the server.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const REQUEST_TIMEOUT_MS = 15000;

// Minimum scope required: send-only access to the store owner's mailbox.
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const CLIENT_KEYS = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REDIRECT_URI"];
const SEND_KEYS = [...CLIENT_KEYS, "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER_EMAIL"];

// Names (never values) of the Gmail variables that are still empty.
export const getMissingGmailConfig = (keys = SEND_KEYS) => keys.filter((key) => !env[key]);

export const isOAuthClientConfigured = () => getMissingGmailConfig(CLIENT_KEYS).length === 0;

export const isGmailConfigured = () => getMissingGmailConfig().length === 0;

export const gmailNotConfiguredMessage = () =>
    `Gmail API is not configured. Missing: ${getMissingGmailConfig().join(", ")}`;

export const getGmailStatus = () => ({
    clientConfigured: isOAuthClientConfigured(),
    refreshTokenConfigured: Boolean(env.GMAIL_REFRESH_TOKEN),
    senderEmail: env.GMAIL_SENDER_EMAIL || null,
    missing: getMissingGmailConfig(),
    ready: isGmailConfigured(),
    setupEnabled: env.GMAIL_OAUTH_SETUP_ENABLED,
});

export const buildAuthUrl = (state) => {
    const params = new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        redirect_uri: env.GMAIL_REDIRECT_URI,
        response_type: "code",
        scope: GMAIL_SCOPE,
        access_type: "offline", // required to receive a refresh token
        prompt: "consent", // forces Google to issue a refresh token even on re-authorization
        include_granted_scopes: "true",
        state,
    });
    if (env.GMAIL_SENDER_EMAIL) params.set("login_hint", env.GMAIL_SENDER_EMAIL);
    return `${GOOGLE_AUTH_URL}?${params}`;
};

const postToken = async (form) => {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error_description || body.error || `Google token endpoint returned ${response.status}`);
        error.code = body.error;
        throw error;
    }
    return body;
};

export const exchangeCodeForTokens = (code) =>
    postToken({
        code,
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        redirect_uri: env.GMAIL_REDIRECT_URI,
        grant_type: "authorization_code",
    });

let cachedAccessToken = null; // { token, expiresAt }

// Activates a refresh token obtained through the setup flow without restarting the server.
export const setRefreshToken = (refreshToken) => {
    env.GMAIL_REFRESH_TOKEN = refreshToken;
    process.env.GMAIL_REFRESH_TOKEN = refreshToken;
    cachedAccessToken = null;
};

// Uses the stored refresh token to obtain (and cache) a short-lived access token.
export const getAccessToken = async ({ forceRefresh = false } = {}) => {
    if (!isGmailConfigured()) {
        throw new Error(gmailNotConfiguredMessage());
    }

    if (!forceRefresh && cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > Date.now()) {
        return cachedAccessToken.token;
    }

    try {
        const body = await postToken({
            client_id: env.GMAIL_CLIENT_ID,
            client_secret: env.GMAIL_CLIENT_SECRET,
            refresh_token: env.GMAIL_REFRESH_TOKEN,
            grant_type: "refresh_token",
        });
        cachedAccessToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
        return cachedAccessToken.token;
    } catch (error) {
        cachedAccessToken = null;
        if (error.code === "invalid_grant") {
            throw new Error("Gmail refresh token is invalid, expired or revoked. Re-authorize the store Gmail account via /api/auth/google.");
        }
        if (error.code === "invalid_client") {
            throw new Error("Gmail OAuth client ID/secret are invalid. Check GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET.");
        }
        throw error;
    }
};

// Sends an RFC 2822 message (base64url encoded) through the Gmail API.
export const sendRawEmail = async (rawBase64Url) => {
    const attempt = async (token) =>
        fetch(GMAIL_SEND_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: rawBase64Url }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

    let response = await attempt(await getAccessToken());
    if (response.status === 401) {
        response = await attempt(await getAccessToken({ forceRefresh: true }));
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const reason = body?.error?.message || `Gmail API returned ${response.status}`;
        throw new Error(`Gmail send failed: ${reason}`);
    }
    return { id: body.id, threadId: body.threadId };
};
