import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import AuthShell from "./AuthShell.jsx";
import { validatePassword } from "../../utils/validation.js";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { Alert } from "../../components/common/Feedback.jsx";
import { PasswordInput } from "../../components/forms/Field.jsx";
import { useResetPasswordMutation } from "../../redux/api/authApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { logout, selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function ResetPassword() {
    useDocumentTitle("Reset password");
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const dispatch = useDispatch();
    const user = useSelector(selectCurrentUser);
    const [resetPassword, { isLoading, isSuccess, error }] = useResetPasswordMutation();
    const [values, setValues] = useState({ password: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const tokenValid = /^[a-f\d]{64}$/i.test(token);

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        const passwordError = validatePassword(values.password);
        if (passwordError) nextErrors.password = passwordError;
        if (values.confirm !== values.password) nextErrors.confirm = "Passwords do not match";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        try {
            await resetPassword({ token, password: values.password }).unwrap();
            // The server ends any existing session after a reset.
            if (user) dispatch(logout());
        } catch {
            // shown inline
        }
    };

    if (!tokenValid) {
        return (
            <AuthShell label="ACCOUNT HELP" title="Link not valid" description="This password reset link is missing or malformed.">
                <ButtonLink to="/forgot-password" block size="lg">
                    Request a new link
                </ButtonLink>
            </AuthShell>
        );
    }

    return (
        <AuthShell label="ACCOUNT HELP" title="Choose a new password" description="Pick a strong password you haven't used before.">
            {isSuccess ? (
                <div className="space-y-6">
                    <div className="flex gap-4 border border-green-200 bg-green-50 p-5 text-sm text-green-900" role="status">
                        <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                        <p>Your password has been updated. You can now log in with your new password.</p>
                    </div>
                    <ButtonLink to="/login" block size="lg">
                        Log in
                    </ButtonLink>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-5" noValidate>
                    {error && (
                        <Alert tone="error">
                            {getErrorMessage(error)}{" "}
                            <Link to="/forgot-password" className="font-semibold underline">
                                Request a new link
                            </Link>
                        </Alert>
                    )}
                    <PasswordInput
                        label="New password"
                        autoComplete="new-password"
                        required
                        value={values.password}
                        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                        error={errors.password}
                        hint="At least 8 characters with a letter and a number"
                    />
                    <PasswordInput
                        label="Confirm new password"
                        autoComplete="new-password"
                        required
                        value={values.confirm}
                        onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
                        error={errors.confirm}
                    />
                    <Button type="submit" block size="lg" loading={isLoading}>
                        Update password
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}

export default ResetPassword;
