import { useMemo } from "react";
import { Info } from "lucide-react";
import { Input, Textarea } from "../../../components/forms/Field.jsx";
import { formatPrice } from "../../../utils/format.js";
import SettingsForm from "./SettingsForm.jsx";
import { useSettingsSection } from "./useSettingsSection.js";
import { EMAIL_PATTERN, isFullUrl, pickKeys, trimValues } from "./settingsUtils.js";

const STORE_DEFAULTS = { name: "", tagline: "", email: "", phone: "", address: "" };
const SOCIAL_FIELDS = [
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourstore" },
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourstore" },
    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourstore" },
    { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourstore" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourstore" },
];
const SOCIAL_DEFAULTS = Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, ""]));

export function StoreInfoSettings({ store }) {
    const initial = useMemo(() => pickKeys(store, STORE_DEFAULTS), [store]);
    const { values, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("store", initial);
    const onInput = (key) => (event) => setField(key, event.target.value);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const v = trimValues(values);
        const clientErrors = {};
        if (!v.name) clientErrors.name = "Store name is required";
        else if (v.name.length > 80) clientErrors.name = "Keep the name under 80 characters";
        if (v.tagline.length > 200) clientErrors.tagline = "Keep the tagline under 200 characters";
        if (v.email && !EMAIL_PATTERN.test(v.email)) clientErrors.email = "Enter a valid email address";
        if (v.phone && (!/^[+()\d\s.-]*$/.test(v.phone) || v.phone.length > 30)) clientErrors.phone = "Enter a valid phone number";
        if (v.address.length > 250) clientErrors.address = "Keep the address under 250 characters";
        if (!check(clientErrors)) return;
        await save({ ...v, email: v.email.toLowerCase() }, "Store information saved");
    };

    return (
        <SettingsForm
            title="Store information"
            description="Shown in the header, footer, contact page and customer emails."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Store name" required value={values.name} onChange={onInput("name")} error={errors.name} maxLength={80} />
                <Input label="Tagline" value={values.tagline} onChange={onInput("tagline")} error={errors.tagline} maxLength={200} placeholder="Everyday pieces, beautifully made" />
                <Input label="Contact email" type="email" value={values.email} onChange={onInput("email")} error={errors.email} placeholder="hello@example.com" autoComplete="off" />
                <Input label="Phone" type="tel" value={values.phone} onChange={onInput("phone")} error={errors.phone} maxLength={30} placeholder="+1 555 123 4567" />
                <Textarea label="Address" className="sm:col-span-2" rows={3} value={values.address} onChange={onInput("address")} error={errors.address} maxLength={250} />
                <p className="flex items-start gap-2 text-sm text-neutral-600 sm:col-span-2">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                        Store currency: <strong className="text-neutral-900">Pakistani Rupee (PKR, ₨)</strong>. All prices, discounts, shipping and
                        totals are entered and shown in PKR.
                    </span>
                </p>
            </div>
        </SettingsForm>
    );
}

const describeShipping = (flatRate, threshold) => {
    const flat = Number(flatRate);
    const free = Number(threshold);
    if (!Number.isFinite(flat) || !Number.isFinite(free) || flat < 0 || free < 0) return null;
    if (flat === 0) return "Shipping is free on every order.";
    if (free > 0) return `Orders of ${formatPrice(free)} or more ship free. Smaller orders pay ${formatPrice(flat)}.`;
    return `Every order pays ${formatPrice(flat)} shipping.`;
};

export function ShippingSettings({ shipping }) {
    const initial = useMemo(
        () => ({ flatRate: String(shipping?.flatRate ?? 0), freeShippingThreshold: String(shipping?.freeShippingThreshold ?? 0) }),
        [shipping]
    );
    const { values, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("shipping", initial);
    const summary = describeShipping(values.flatRate, values.freeShippingThreshold);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const clientErrors = {};
        [
            ["flatRate", "Flat rate"],
            ["freeShippingThreshold", "Free shipping threshold"],
        ].forEach(([key, label]) => {
            const n = Number(values[key]);
            if (values[key] === "" || !Number.isFinite(n)) clientErrors[key] = `${label} must be a number`;
            else if (n < 0) clientErrors[key] = `${label} cannot be negative`;
            else if (n > 1_000_000) clientErrors[key] = `${label} is too large`;
        });
        if (!check(clientErrors)) return;
        await save({ flatRate: Number(values.flatRate), freeShippingThreshold: Number(values.freeShippingThreshold) }, "Shipping saved");
    };

    return (
        <SettingsForm
            title="Shipping"
            description="A single flat rate with an optional free-shipping threshold."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    label="Flat shipping rate (PKR ₨)"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={values.flatRate}
                    onChange={(event) => setField("flatRate", event.target.value)}
                    error={errors.flatRate}
                    hint="Charged on orders below the threshold. Use 0 for free shipping on everything."
                />
                <Input
                    label="Free shipping threshold (PKR ₨)"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={values.freeShippingThreshold}
                    onChange={(event) => setField("freeShippingThreshold", event.target.value)}
                    error={errors.freeShippingThreshold}
                    hint="Orders at or above this amount ship free. Use 0 to turn free shipping off."
                />
            </div>
            {summary && (
                <p className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 text-sm text-neutral-800" aria-live="polite">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {summary}
                </p>
            )}
        </SettingsForm>
    );
}

export function SocialSettings({ social }) {
    const initial = useMemo(() => pickKeys(social, SOCIAL_DEFAULTS), [social]);
    const { values, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("social", initial);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const v = trimValues(values);
        const clientErrors = {};
        SOCIAL_FIELDS.forEach(({ key }) => {
            if (!isFullUrl(v[key])) clientErrors[key] = "Enter a full URL starting with https://";
            else if (v[key].length > 300) clientErrors[key] = "URL is too long";
        });
        if (!check(clientErrors)) return;
        await save(v, "Social links saved");
    };

    return (
        <SettingsForm
            title="Social links"
            description="Links to your social profiles on the storefront. Leave a field empty to hide it."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                    <Input
                        key={key}
                        label={label}
                        type="url"
                        inputMode="url"
                        value={values[key]}
                        onChange={(event) => setField(key, event.target.value)}
                        error={errors[key]}
                        placeholder={placeholder}
                        maxLength={300}
                        autoComplete="off"
                        spellCheck={false}
                    />
                ))}
            </div>
        </SettingsForm>
    );
}
