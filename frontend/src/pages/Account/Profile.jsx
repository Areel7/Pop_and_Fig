import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Button from "../../components/common/Button.jsx";
import { Input, PasswordInput } from "../../components/forms/Field.jsx";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useChangePasswordMutation, useUpdateProfileMutation } from "../../redux/api/accountApi.js";
import { getErrorMessage } from "../../redux/api/apiSlice.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { fieldErrors, validatePassword } from "../../utils/validation.js";

function Section({ title, description, children }) {
    return (
        <section className="grid gap-6 border-t border-neutral-200 pt-8 first:border-0 first:pt-0 lg:grid-cols-[1fr_2fr]">
            <div>
                <h2 className="text-lg font-medium tracking-tight">{title}</h2>
                {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            </div>
            <div className="min-w-0">{children}</div>
        </section>
    );
}

function PersonalInfoForm({ user }) {
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();
    const [values, setValues] = useState({
        name: user.name || "",
        phone: user.phone || "",
        address: user.shippingAddress?.address || "",
        city: user.shippingAddress?.city || "",
        state: user.shippingAddress?.state || "",
        postalCode: user.shippingAddress?.postalCode || "",
        country: user.shippingAddress?.country || "",
    });
    const [errors, setErrors] = useState({});
    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (values.name.trim().length < 2) nextErrors.name = "Enter your full name";
        if (values.phone && !/^[+()\d\s.-]{7,30}$/.test(values.phone.trim())) nextErrors.phone = "Enter a valid phone number";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        try {
            await updateProfile({
                name: values.name.trim(),
                phone: values.phone.trim(),
                shippingAddress: {
                    address: values.address.trim(),
                    city: values.city.trim(),
                    state: values.state.trim(),
                    postalCode: values.postalCode.trim(),
                    country: values.country.trim(),
                },
            }).unwrap();
            toast.success("Profile updated");
        } catch (error) {
            setErrors(fieldErrors(error));
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" autoComplete="name" required value={values.name} onChange={set("name")} error={errors.name} />
            <Input label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} error={errors.phone} />
            <Input label="Email" type="email" value={user.email} disabled hint="Contact us to change your email address" className="sm:col-span-2" />
            <p className="pt-2 text-sm font-medium sm:col-span-2">Default shipping address</p>
            <Input label="Street address" autoComplete="street-address" value={values.address} onChange={set("address")} error={errors.address} className="sm:col-span-2" />
            <Input label="City" autoComplete="address-level2" value={values.city} onChange={set("city")} />
            <Input label="State / province" autoComplete="address-level1" value={values.state} onChange={set("state")} />
            <Input label="Postal code" autoComplete="postal-code" value={values.postalCode} onChange={set("postalCode")} />
            <Input label="Country" autoComplete="country-name" value={values.country} onChange={set("country")} />
            <div className="sm:col-span-2">
                <Button type="submit" loading={isLoading}>
                    Save changes
                </Button>
            </div>
        </form>
    );
}

function PasswordForm() {
    const [changePassword, { isLoading }] = useChangePasswordMutation();
    const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" });
    const [errors, setErrors] = useState({});
    const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = {};
        if (!values.currentPassword) nextErrors.currentPassword = "Enter your current password";
        const passwordError = validatePassword(values.newPassword);
        if (passwordError) nextErrors.newPassword = passwordError;
        if (values.confirm !== values.newPassword) nextErrors.confirm = "Passwords do not match";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        try {
            await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
            toast.success("Password changed");
            setValues({ currentPassword: "", newPassword: "", confirm: "" });
        } catch (error) {
            const message = getErrorMessage(error);
            setErrors(message.toLowerCase().includes("current") ? { currentPassword: message } : fieldErrors(error));
            toast.error(message);
        }
    };

    return (
        <form onSubmit={submit} noValidate className="grid max-w-md gap-4">
            <PasswordInput label="Current password" autoComplete="current-password" required value={values.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} />
            <PasswordInput
                label="New password"
                autoComplete="new-password"
                required
                value={values.newPassword}
                onChange={set("newPassword")}
                error={errors.newPassword}
                hint="At least 8 characters with a letter and a number"
            />
            <PasswordInput label="Confirm new password" autoComplete="new-password" required value={values.confirm} onChange={set("confirm")} error={errors.confirm} />
            <div>
                <Button type="submit" variant="outline" loading={isLoading}>
                    Change password
                </Button>
            </div>
        </form>
    );
}

function Profile() {
    useDocumentTitle("Profile");
    const user = useSelector(selectCurrentUser);

    return (
        <div className="space-y-8">
            <Section title="Personal information" description="Used to pre-fill checkout. Only you and the store can see it.">
                <PersonalInfoForm key={user._id} user={user} />
            </Section>
            <Section title="Password" description="Changing your password signs you out on other devices.">
                <PasswordForm />
            </Section>
        </div>
    );
}

export default Profile;
