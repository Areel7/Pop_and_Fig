import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import AuthShell from "./AuthShell.jsx";
import { EMAIL_PATTERN, fieldErrors, validatePassword } from "../../utils/validation.js";
import Button from "../../components/common/Button.jsx";
import { Alert } from "../../components/common/Feedback.jsx";
import { Input, PasswordInput } from "../../components/forms/Field.jsx";
import { useRegisterMutation } from "../../redux/api/authApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";

function Signup() {
    useDocumentTitle("Create account");
    const navigate = useNavigate();
    const location = useLocation();
    const [register, { isLoading, error }] = useRegisterMutation();
    const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const from = location.state?.from;

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (values.name.trim().length < 2) nextErrors.name = "Enter your full name";
        if (!EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";
        const passwordError = validatePassword(values.password);
        if (passwordError) nextErrors.password = passwordError;
        if (values.confirm !== values.password) nextErrors.confirm = "Passwords do not match";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        try {
            const user = await register({ name: values.name.trim(), email: values.email.trim(), password: values.password }).unwrap();
            toast.success(`Welcome to the club, ${user.name.split(" ")[0]}!`);
            navigate(from || "/account", { replace: true });
        } catch (requestError) {
            setErrors(fieldErrors(requestError));
        }
    };

    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    return (
        <AuthShell
            label="JOIN US"
            title="Create account"
            description="Save your wishlist, track orders and check out faster."
            footer={
                <>
                    Already have an account?{" "}
                    <Link to="/login" state={{ from }} className="font-semibold text-foreground underline underline-offset-4">
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                {error && !error.data?.errors && <Alert tone="error">{getErrorMessage(error)}</Alert>}
                <Input label="Full name" autoComplete="name" required value={values.name} onChange={set("name")} error={errors.name} />
                <Input label="Email" type="email" autoComplete="email" required value={values.email} onChange={set("email")} error={errors.email} />
                <PasswordInput
                    autoComplete="new-password"
                    required
                    value={values.password}
                    onChange={set("password")}
                    error={errors.password}
                    hint="At least 8 characters with a letter and a number"
                />
                <PasswordInput
                    label="Confirm password"
                    autoComplete="new-password"
                    required
                    value={values.confirm}
                    onChange={set("confirm")}
                    error={errors.confirm}
                />
                <Button type="submit" block size="lg" loading={isLoading}>
                    Create account
                </Button>
            </form>
        </AuthShell>
    );
}

export default Signup;
