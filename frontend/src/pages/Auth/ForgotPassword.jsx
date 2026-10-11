import { useState } from "react";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import AuthShell from "./AuthShell.jsx";
import { EMAIL_PATTERN } from "../../utils/validation.js";
import Button from "../../components/common/Button.jsx";
import { Alert } from "../../components/common/Feedback.jsx";
import { Input } from "../../components/forms/Field.jsx";
import { useForgotPasswordMutation } from "../../redux/api/authApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function ForgotPassword() {
    useDocumentTitle("Forgot password");
    const [forgotPassword, { isLoading, isSuccess, error, data }] = useForgotPasswordMutation();
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const submit = async (event) => {
        event.preventDefault();
        if (!EMAIL_PATTERN.test(email.trim())) {
            setEmailError("Enter a valid email address");
            return;
        }
        setEmailError("");
        try {
            await forgotPassword({ email: email.trim() }).unwrap();
        } catch {
            // shown inline
        }
    };

    return (
        <AuthShell
            label="ACCOUNT HELP"
            title="Forgot password"
            description="Enter the email you signed up with and we'll send you a link to choose a new password."
            footer={
                <>
                    Remembered it?{" "}
                    <Link to="/login" className="font-semibold text-foreground underline underline-offset-4">
                        Back to log in
                    </Link>
                </>
            }
        >
            {isSuccess ? (
                <div className="flex gap-4 border border-green-200 bg-green-50 p-5 text-sm text-green-900" role="status">
                    <MailCheck className="size-5 shrink-0" aria-hidden="true" />
                    <p>{data?.message || "If an account exists for that email, a reset link is on its way."} The link expires in 30 minutes.</p>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-5" noValidate>
                    {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}
                    <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
                    <Button type="submit" block size="lg" loading={isLoading}>
                        Send reset link
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}

export default ForgotPassword;
