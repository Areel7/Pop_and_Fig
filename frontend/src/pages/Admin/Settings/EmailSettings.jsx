import { useState } from "react";
import { Link } from "react-router";
import { useSelector } from "react-redux";
import { CircleCheck, CircleX, ExternalLink, MailCheck, RefreshCw, Send } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button.jsx";
import { Alert, ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import { Input } from "../../../components/forms/Field.jsx";
import { Card } from "../../../components/admin/AdminUI.jsx";
import { StatusBadge } from "../../../components/orders/OrderParts.jsx";
import { useGetEmailStatusQuery, useSendTestEmailMutation } from "../../../redux/api/adminApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { selectCurrentUser } from "../../../redux/features/auth/authSlice.js";
import { BASE_URL, adminPath } from "../../../redux/constant.js";
import { pluralize } from "../../../utils/format.js";
import { EMAIL_PATTERN } from "./settingsUtils.js";

function CheckItem({ ok, title, description }) {
    return (
        <li className="flex gap-3 py-3">
            {ok ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden="true" />
            ) : (
                <CircleX className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                    {title}
                    <span className="sr-only">{ok ? " — done" : " — not done"}</span>
                </p>
                {description && <p className="mt-0.5 text-xs leading-relaxed break-words text-neutral-500">{description}</p>}
            </div>
        </li>
    );
}

function StatusSkeleton() {
    return (
        <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex gap-3">
                    <Skeleton className="size-5 rounded-full" />
                    <div className="flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="mt-2 h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function TestEmailForm({ ready }) {
    const user = useSelector(selectCurrentUser);
    const [to, setTo] = useState(user?.email || "");
    const [error, setError] = useState("");
    const [sendTestEmail, { isLoading }] = useSendTestEmailMutation();

    const handleSubmit = async (event) => {
        event.preventDefault();
        const email = to.trim();
        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter a valid email address");
            return;
        }
        setError("");
        try {
            const result = await sendTestEmail(email).unwrap();
            toast.success(result?.message || `Test email sent to ${email}`);
        } catch (err) {
            const fieldError = (err?.data?.errors || []).find((e) => e.field === "to");
            if (fieldError) setError(fieldError.message);
            toast.error(getErrorMessage(err, "Could not send the test email"));
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {!ready && <Alert tone="warning">Gmail is not fully configured yet, so the test will probably fail. The error message will explain what is missing.</Alert>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                    label="Send to"
                    type="email"
                    className="flex-1"
                    value={to}
                    onChange={(event) => {
                        setTo(event.target.value);
                        if (error) setError("");
                    }}
                    error={error}
                    autoComplete="email"
                    placeholder="you@example.com"
                />
                <Button type="submit" loading={isLoading} className="sm:mt-7">
                    {!isLoading && <Send className="size-4" aria-hidden="true" />} Send test email
                </Button>
            </div>
        </form>
    );
}

function EmailSettings() {
    const { data, isLoading, isFetching, isError, error, refetch } = useGetEmailStatusQuery();
    const gmail = data?.gmail;
    const authorizeUrl = `${BASE_URL}/api/auth/google`;

    let statusContent;
    if (isLoading) statusContent = <StatusSkeleton />;
    else if (isError && !data) statusContent = <ErrorState error={error} title="Could not load email status" onRetry={refetch} className="py-8" />;
    else if (gmail) {
        statusContent = (
            <>
                <ul className="divide-y divide-neutral-100">
                    <CheckItem
                        ok={gmail.clientConfigured}
                        title="Google OAuth client configured"
                        description={
                            gmail.clientConfigured
                                ? "GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REDIRECT_URI are set on the server."
                                : "Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REDIRECT_URI to the backend .env and restart the server."
                        }
                    />
                    <CheckItem
                        ok={gmail.refreshTokenConfigured}
                        title="Store Gmail account authorized"
                        description={
                            gmail.refreshTokenConfigured
                                ? "A refresh token (GMAIL_REFRESH_TOKEN) is configured on the server."
                                : "Missing GMAIL_REFRESH_TOKEN — authorize the store Gmail account once using the button below."
                        }
                    />
                    <CheckItem
                        ok={Boolean(gmail.senderEmail)}
                        title="Sender address"
                        description={gmail.senderEmail ? `Emails are sent from ${gmail.senderEmail}.` : "Set GMAIL_SENDER_EMAIL in the backend .env (the Gmail address you authorize)."}
                    />
                    <CheckItem
                        ok={gmail.ready}
                        title="Ready to send"
                        description={gmail.ready ? "Order completion emails will be sent automatically." : "Complete the steps above to enable email sending."}
                    />
                </ul>

                {(data.failedEmails > 0 || data.pendingEmails > 0) && (
                    <Alert tone={data.failedEmails > 0 ? "warning" : "info"} className="mt-4">
                        {data.failedEmails > 0 && (
                            <>
                                {pluralize(data.failedEmails, "completed order")} could not be emailed.{" "}
                                <Link to={`${adminPath("orders")}?email=failed`} className="font-semibold underline underline-offset-2">
                                    Review failed emails
                                </Link>{" "}
                                — you can retry them from each order once Gmail is working.
                            </>
                        )}
                        {data.failedEmails > 0 && data.pendingEmails > 0 && " "}
                        {data.pendingEmails > 0 && <>{pluralize(data.pendingEmails, "completion email")} still pending.</>}
                    </Alert>
                )}
            </>
        );
    }

    return (
        <div className="space-y-6">
            <Card
                title="Email / Gmail"
                description="Order emails are sent through the store's own Gmail account."
                actions={
                    <div className="flex items-center gap-2">
                        {gmail && <StatusBadge status={gmail.ready ? "active" : "failed"} label={gmail.ready ? "Ready" : "Not configured"} />}
                        <Button variant="ghost" size="sm" onClick={refetch} disabled={isFetching} aria-label="Refresh email status">
                            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
                        </Button>
                    </div>
                }
            >
                <p className="mb-4 flex items-start gap-2 text-sm leading-relaxed text-neutral-600">
                    <MailCheck className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span>
                        A completion email is sent to the customer automatically when an order&apos;s status changes to <strong>Completed</strong>. Secrets are
                        never shown here — only whether each item is configured.
                    </span>
                </p>
                {statusContent}
            </Card>

            {gmail?.setupEnabled && (
                <Card title="Authorize the store Gmail account" description="One-time setup, done by the store owner.">
                    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
                        <li>
                            Click the button below and sign in to Google as <strong>{gmail.senderEmail || "the store Gmail account"}</strong>. Customers never do this —
                            their address is only the recipient.
                        </li>
                        <li>Allow the &quot;Send email on your behalf&quot; permission.</li>
                        <li>
                            The server saves the refresh token to the backend <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">.env</code> as{" "}
                            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">GMAIL_REFRESH_TOKEN</code> and activates it immediately — no copying or restart needed.
                        </li>
                        <li>Send a test email below, then use &quot;Retry email&quot; on any order whose completion email failed.</li>
                    </ol>
                    <a
                        href={authorizeUrl}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 bg-neutral-900 px-5 text-sm font-semibold tracking-wide text-white transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        <ExternalLink className="size-4" aria-hidden="true" /> Authorize store Gmail account
                    </a>
                </Card>
            )}

            {gmail && !gmail.setupEnabled && !gmail.refreshTokenConfigured && (
                <Alert tone="info">
                    To authorize the store Gmail account, set <code>GMAIL_OAUTH_SETUP_ENABLED=true</code> in the backend <code>.env</code>, restart the server and
                    reload this page.
                </Alert>
            )}

            <Card title="Send a test email" description="Checks that the Gmail connection works end to end.">
                {isLoading ? <Skeleton className="h-11 w-full" /> : <TestEmailForm ready={Boolean(gmail?.ready)} />}
            </Card>
        </div>
    );
}

export default EmailSettings;
