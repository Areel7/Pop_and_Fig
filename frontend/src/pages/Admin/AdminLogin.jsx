import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { toast } from "react-toastify";
import { useAdminLoginMutation } from "../../redux/api/authApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { selectCurrentUser, setCredentials } from "../../redux/features/auth/authSlice.js";
import { ADMIN_BASE_PATH, adminPath } from "../../redux/constant.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import Spinner from "../../components/common/Spinner.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (error) =>
    `block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-950 placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-neutral-950/15 ${
        error ? "border-red-500 focus:border-red-600" : "border-neutral-300 focus:border-neutral-950"
    }`;

// Only follow "from" when it points back inside the admin panel.
const safeRedirect = (from) =>
    typeof from === "string" && from.startsWith(`${ADMIN_BASE_PATH}/`) ? from : adminPath("dashboard");

const validate = ({ email, password }) => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    return errors;
};

function AdminLogin() {
    useDocumentTitle("Admin login");
    const user = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = safeRedirect(location.state?.from);

    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [adminLogin, { isLoading }] = useAdminLoginMutation();

    if (user?.isAdmin) return <Navigate to={redirectTo} replace />;

    const update = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");
        const clientErrors = validate(form);
        setErrors(clientErrors);
        if (Object.keys(clientErrors).length) return;

        try {
            const profile = await adminLogin({ email: form.email.trim(), password: form.password }).unwrap();
            if (!profile?.isAdmin) {
                setFormError("This account does not have admin access.");
                return;
            }
            dispatch(setCredentials(profile));
            toast.success(`Welcome back${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}`);
            navigate(redirectTo, { replace: true });
        } catch (error) {
            const fieldErrors = {};
            (error?.data?.errors || []).forEach(({ field, message }) => {
                if (field === "email" || field === "password") fieldErrors[field] = message;
            });
            setErrors(fieldErrors);
            setFormError(
                error?.status === 429
                    ? getErrorMessage(error, "Too many login attempts. Please wait a few minutes and try again.")
                    : getErrorMessage(error, "Invalid admin credentials")
            );
            setForm((current) => ({ ...current, password: "" }));
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-neutral-100 font-admin text-neutral-950">
            <header className="flex items-center justify-between px-4 py-5 sm:px-8">
                <p className="text-lg font-bold tracking-tight">
                    POP<span className="font-normal">-AND-FIGS</span>
                </p>
                <Link
                    to="/"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:outline-none"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Back to store
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 pb-16">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
                        <span className="mb-6 flex size-12 items-center justify-center rounded-full bg-neutral-950 text-white">
                            <LockKeyhole className="size-5" aria-hidden="true" />
                        </span>
                        <p className="text-[11px] font-bold tracking-[0.2em] text-neutral-500">ADMIN PANEL</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>
                        <p className="mt-2 text-sm text-neutral-500">Manage products, orders, customers and store settings.</p>

                        {user && !user.isAdmin && (
                            <div role="status" className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                                You are signed in as <span className="font-medium">{user.email}</span>, a customer account. Signing in as an admin
                                will replace that session.
                            </div>
                        )}

                        {formError && (
                            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                            <div>
                                <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-neutral-800">
                                    Email
                                </label>
                                <input
                                    id="admin-email"
                                    type="email"
                                    autoComplete="username"
                                    inputMode="email"
                                    value={form.email}
                                    onChange={update("email")}
                                    aria-invalid={errors.email ? true : undefined}
                                    aria-describedby={errors.email ? "admin-email-error" : undefined}
                                    className={inputClass(errors.email)}
                                    placeholder="admin@example.com"
                                    required
                                />
                                {errors.email && (
                                    <p id="admin-email-error" className="mt-1.5 text-xs text-red-700">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-neutral-800">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="admin-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={update("password")}
                                        aria-invalid={errors.password ? true : undefined}
                                        aria-describedby={errors.password ? "admin-password-error" : undefined}
                                        className={`${inputClass(errors.password)} pr-11`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-neutral-500 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p id="admin-password-error" className="mt-1.5 text-xs text-red-700">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                aria-busy={isLoading || undefined}
                                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 text-sm font-semibold tracking-wide text-white transition hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLoading && <Spinner className="size-4" />}
                                {isLoading ? "Signing in…" : "Sign in"}
                            </button>
                        </form>
                    </div>
                    <p className="mt-6 text-center text-xs text-neutral-500">Restricted area. Only store administrators can sign in here.</p>
                </div>
            </main>
        </div>
    );
}

export default AdminLogin;
