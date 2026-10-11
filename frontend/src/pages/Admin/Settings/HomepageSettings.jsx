import { useMemo } from "react";
import { EyeOff } from "lucide-react";
import { Input, Textarea, Toggle } from "../../../components/forms/Field.jsx";
import ImageUploader from "../../../components/admin/ImageUploader.jsx";
import { resolveImageUrl } from "../../../utils/format.js";
import SettingsForm from "./SettingsForm.jsx";
import { useSettingsSection } from "./useSettingsSection.js";
import { isSafeUrl, pickKeys, trimValues } from "./settingsUtils.js";

const HERO_DEFAULTS = { image: "", label: "", title: "", subtitle: "", buttonText: "", buttonUrl: "" };
const PROMO_DEFAULTS = { enabled: false, label: "", title: "", subtitle: "", buttonText: "", buttonUrl: "" };
const LIMITS = { label: 60, title: 120, subtitle: 300, buttonText: 40 };
const URL_HINT = "A full https:// link or a store path such as /shop or /category/dresses.";

const validateCopy = (values, { requireImageUrl = false } = {}) => {
    const errors = {};
    Object.entries(LIMITS).forEach(([key, max]) => {
        if ((values[key] || "").trim().length > max) errors[key] = `Keep this under ${max} characters`;
    });
    const buttonUrl = (values.buttonUrl || "").trim();
    if (!isSafeUrl(buttonUrl)) errors.buttonUrl = "Must be an http(s) URL or a path starting with /";
    if (values.buttonText?.trim() && !buttonUrl) errors.buttonUrl = "Add a link for the button";
    if (requireImageUrl && !isSafeUrl((values.image || "").trim())) errors.image = "Image must be an http(s) URL or an uploaded image";
    return errors;
};

function CopyFields({ values, errors, setField, disabled }) {
    const onInput = (key) => (event) => setField(key, event.target.value);
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Small label" value={values.label} onChange={onInput("label")} error={errors.label} maxLength={LIMITS.label} placeholder="New season" disabled={disabled} />
            <Input label="Title" value={values.title} onChange={onInput("title")} error={errors.title} maxLength={LIMITS.title} placeholder="Summer collection" disabled={disabled} />
            <Textarea
                label="Subtitle"
                className="sm:col-span-2"
                rows={2}
                value={values.subtitle}
                onChange={onInput("subtitle")}
                error={errors.subtitle}
                maxLength={LIMITS.subtitle}
                disabled={disabled}
            />
            <Input label="Button text" value={values.buttonText} onChange={onInput("buttonText")} error={errors.buttonText} maxLength={LIMITS.buttonText} placeholder="Shop now" disabled={disabled} />
            <Input label="Button link" value={values.buttonUrl} onChange={onInput("buttonUrl")} error={errors.buttonUrl} hint={URL_HINT} placeholder="/shop" disabled={disabled} />
        </div>
    );
}

function HeroPreview({ values }) {
    return (
        <div>
            <p className="mb-2 text-sm font-medium text-neutral-800">Live preview</p>
            <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-lg bg-neutral-800 sm:aspect-[16/7]">
                {values.image && <img src={resolveImageUrl(values.image)} alt="" className="absolute inset-0 size-full object-cover" />}
                <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
                <div className="relative max-w-lg p-5 text-white sm:p-8">
                    {values.label && <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-90">{values.label}</p>}
                    <p className="mt-2 text-2xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">{values.title || "Your hero title"}</p>
                    {values.subtitle && <p className="mt-2 text-sm leading-relaxed break-words opacity-90">{values.subtitle}</p>}
                    {values.buttonText && (
                        <span className="mt-4 inline-flex min-h-10 items-center bg-white px-5 text-xs font-semibold tracking-wide text-neutral-950">{values.buttonText}</span>
                    )}
                </div>
                {!values.image && <p className="absolute top-3 right-3 rounded bg-black/40 px-2 py-1 text-[11px] text-white/80">No image selected</p>}
            </div>
        </div>
    );
}

function PromoPreview({ values }) {
    return (
        <div>
            <p className="mb-2 text-sm font-medium text-neutral-800">Live preview</p>
            <div className={`relative rounded-lg bg-secondary px-5 py-8 text-center text-neutral-900 transition sm:px-10 ${values.enabled ? "" : "opacity-50"}`}>
                {values.label && <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-600 uppercase">{values.label}</p>}
                <p className="mt-2 text-xl font-semibold tracking-tight break-words sm:text-2xl">{values.title || "Promo title"}</p>
                {values.subtitle && <p className="mx-auto mt-2 max-w-md text-sm break-words text-neutral-600">{values.subtitle}</p>}
                {values.buttonText && (
                    <span className="mt-4 inline-flex min-h-10 items-center bg-neutral-950 px-5 text-xs font-semibold tracking-wide text-white">{values.buttonText}</span>
                )}
                {!values.enabled && (
                    <p className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-neutral-600">
                        <EyeOff className="size-3" aria-hidden="true" /> Hidden on storefront
                    </p>
                )}
            </div>
        </div>
    );
}

export function HeroSettings({ hero }) {
    const initial = useMemo(() => pickKeys(hero, HERO_DEFAULTS), [hero]);
    const { values, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("hero", initial);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!check(validateCopy(values, { requireImageUrl: true }))) return;
        await save(trimValues(values), "Homepage hero saved");
    };

    return (
        <SettingsForm
            title="Homepage hero"
            description="The large banner at the top of the homepage."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
            submitLabel="Save hero"
        >
            <div>
                <ImageUploader
                    label="Hero image"
                    multiple={false}
                    value={values.image ? [values.image] : []}
                    onChange={(images) => setField("image", images.filter(Boolean)[0] || "")}
                    hint="Wide landscape images work best (at least 1600px wide). JPEG, PNG, WebP, GIF or AVIF up to 5MB."
                />
                {errors.image && <p className="mt-1.5 text-xs text-red-700">{errors.image}</p>}
            </div>
            <CopyFields values={values} errors={errors} setField={setField} />
            <HeroPreview values={values} />
        </SettingsForm>
    );
}

export function PromoSettings({ promo }) {
    const initial = useMemo(() => pickKeys(promo, PROMO_DEFAULTS), [promo]);
    const { values, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("promo", initial);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const clientErrors = validateCopy(values);
        if (values.enabled && !values.title.trim()) clientErrors.title = "Add a title to show the promo section";
        if (!check(clientErrors)) return;
        await save(trimValues(values), "Promo section saved");
    };

    return (
        <SettingsForm
            title="Promo section"
            description="An optional highlighted banner further down the homepage."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
            submitLabel="Save promo"
        >
            <div className="rounded-lg border border-neutral-200 p-4">
                <Toggle
                    checked={values.enabled}
                    onChange={(value) => setField("enabled", value)}
                    label="Show promo section"
                    description="When off, the promo banner is hidden from the homepage."
                />
            </div>
            <CopyFields values={values} errors={errors} setField={setField} />
            <PromoPreview values={values} />
        </SettingsForm>
    );
}
