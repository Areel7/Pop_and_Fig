import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import AuthShell from "./AuthShell.jsx";
import { EMAIL_PATTERN } from "../../utils/validation.js";
import Button from "../../components/common/Button.jsx";
import { Alert } from "../../components/common/Feedback.jsx";
import { Input, PasswordInput } from "../../components/forms/Field.jsx";
import { useLoginMutation } from "../../redux/api/authApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { adminPath } from "../../redux/constant.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function Login() {
    useDocumentTitle("Log in");
    const navigate = useNavigate();
    const location = useLocation();
    const [login, { isLoading, error }] = useLoginMutation();
    const [values, setValues] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const from = location.state?.from;

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";
        if (!values.password) nextErrors.password = "Enter your password";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        try {
            const user = await login({ email: values.email.trim(), password: values.password }).unwrap();
            toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
            navigate(from || (user.isAdmin ? adminPath("dashboard") : "/account"), { replace: true });
        } catch {
            // shown inline below
        }
    };

    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    return (
        <AuthShell
            label="WELCOME BACK"
            title="Log in"
            description={from === "/checkout" ? "Log in to complete your checkout — your cart is saved." : "Access your orders, wishlist and saved details."}
            footer={
                <>
                    New here?{" "}
                    <Link to="/signup" state={{ from }} className="font-semibold text-foreground underline underline-offset-4">
                        Create an account
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                {error && <Alert tone="error">{getErrorMessage(error)}</Alert>}
                <Input label="Email" type="email" autoComplete="email" required value={values.email} onChange={set("email")} error={errors.email} />
                <div>
                    <PasswordInput autoComplete="current-password" required value={values.password} onChange={set("password")} error={errors.password} />
                    <Link to="/forgot-password" className="mt-2 inline-block text-xs font-medium text-neutral-600 underline underline-offset-4 hover:text-foreground">
                        Forgot your password?
                    </Link>
                </div>
                <Button type="submit" block size="lg" loading={isLoading}>
                    Log in
                </Button>
            </form>
        </AuthShell>
    );
}

export default Login;
