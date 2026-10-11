import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import Button from "../../../components/common/Button.jsx";
import { FormField, Select } from "../../../components/forms/Field.jsx";
import { contrastText, googleFontsUrl, safeColor } from "../../../utils/theme.js";
import SettingsForm from "./SettingsForm.jsx";
import { useSettingsSection } from "./useSettingsSection.js";
import { DEFAULT_COLORS, DEFAULT_FONTS, HEX_PATTERN, pickKeys, toColorInputValue } from "./settingsUtils.js";

const COLOR_FIELDS = [
    { key: "primaryColor", label: "Primary", hint: "Header, footer and outlined buttons." },
    { key: "secondaryColor", label: "Secondary", hint: "Soft section and card backgrounds." },
    { key: "accentColor", label: "Accent", hint: "Highlights, badges and focus rings." },
    { key: "backgroundColor", label: "Background", hint: "Main page background." },
    { key: "textColor", label: "Text", hint: "Headings and body text." },
    { key: "buttonColor", label: "Buttons", hint: "Primary call-to-action buttons." },
];

const FONT_FIELDS = [
    { key: "headingFont", label: "Headings", hint: "Page titles, product names and section headings." },
    { key: "bodyFont", label: "Body text", hint: "Paragraphs, descriptions and navigation." },
    { key: "buttonFont", label: "Buttons", hint: "Buttons and calls to action." },
];

const hexInputClass = (error) =>
    `block w-full min-w-0 rounded-none border bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-neutral-900 transition focus:outline-none focus:ring-2 focus:ring-accent/40 ${
        error ? "border-red-500 focus:border-red-600" : "border-neutral-300 focus:border-neutral-900"
    }`;

function ColorField({ label, hint, value, onChange, error }) {
    return (
        <FormField label={label} hint={hint} error={error}>
            {(field) => (
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={toColorInputValue(value, "#000000")}
                        onChange={(event) => onChange(event.target.value)}
                        aria-label={`${label} color picker`}
                        className="h-11 w-12 shrink-0 cursor-pointer rounded-none border border-neutral-300 bg-white p-1 focus:ring-2 focus:ring-accent/40 focus:outline-none"
                    />
                    <input
                        type="text"
                        {...field}
                        value={value}
                        onChange={(event) => {
                            let next = event.target.value.trim();
                            if (next && !next.startsWith("#")) next = `#${next}`;
                            onChange(next);
                        }}
                        maxLength={7}
                        spellCheck={false}
                        autoComplete="off"
                        placeholder="#111111"
                        className={hexInputClass(error)}
                    />
                </div>
            )}
        </FormField>
    );
}

function ColorPreview({ colors }) {
    const c = Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([key, fallback]) => [key, safeColor(colors[key], fallback)]));
    return (
        <div>
            <p className="mb-2 text-sm font-medium text-neutral-800">Live preview</p>
            <div className="overflow-hidden rounded-lg border border-neutral-200" style={{ backgroundColor: c.backgroundColor, color: c.textColor }}>
                <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ backgroundColor: c.primaryColor, color: contrastText(c.primaryColor) }}>
                    <span className="font-extrabold tracking-tight">
                        POP<span className="font-normal">-AND-FIGS</span>
                    </span>
                    <span className="text-xs opacity-80">Shop · Categories · Contact</span>
                </div>
                <div className="p-5">
                    <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                        style={{ backgroundColor: c.accentColor, color: contrastText(c.accentColor) }}
                    >
                        NEW IN
                    </span>
                    <p className="mt-3 text-xl font-semibold tracking-tight">Linen summer dress</p>
                    <p className="mt-1 text-sm opacity-75">Breathable, relaxed fit and made to last. This is how body text will look.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex min-h-10 items-center px-4 text-xs font-semibold" style={{ backgroundColor: c.buttonColor, color: contrastText(c.buttonColor) }}>
                            Add to cart
                        </span>
                        <span className="inline-flex min-h-10 items-center border px-4 text-xs font-semibold" style={{ borderColor: c.primaryColor, color: c.primaryColor }}>
                            View details
                        </span>
                    </div>
                    <div className="mt-5 px-4 py-3 text-xs" style={{ backgroundColor: c.secondaryColor, color: contrastText(c.secondaryColor) }}>
                        Secondary background — used for soft sections and cards.
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ColorsSettings({ theme }) {
    const initial = useMemo(() => pickKeys(theme, DEFAULT_COLORS), [theme]);
    const { values, setValues, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("theme", initial);
    const isDefault = JSON.stringify(values) === JSON.stringify(DEFAULT_COLORS);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const clientErrors = {};
        COLOR_FIELDS.forEach(({ key, label }) => {
            if (!HEX_PATTERN.test(values[key] || "")) clientErrors[key] = `${label} must be a hex color such as #111111`;
        });
        if (!check(clientErrors)) return;
        await save(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.toLowerCase()])), "Brand colors saved");
    };

    return (
        <SettingsForm
            title="Brand colors"
            description="Colors used across the storefront. The admin panel always keeps its neutral look."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
            submitLabel="Save colors"
            secondaryAction={
                <Button variant="outline" onClick={() => setValues(DEFAULT_COLORS)} disabled={saving || isDefault}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Reset to defaults
                </Button>
            }
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
                <div className="grid gap-4 sm:grid-cols-2">
                    {COLOR_FIELDS.map(({ key, label, hint }) => (
                        <ColorField key={key} label={label} hint={hint} value={values[key]} onChange={(value) => setField(key, value)} error={errors[key]} />
                    ))}
                </div>
                <ColorPreview colors={values} />
            </div>
            <p className="text-xs text-neutral-500">Reset only fills in the default colors — click Save to apply them to the storefront.</p>
        </SettingsForm>
    );
}

export function TypographySettings({ typography, fonts = [] }) {
    const initial = useMemo(() => pickKeys(typography, DEFAULT_FONTS), [typography]);
    const { values, setValues, setField, errors, formError, saving, dirty, check, save } = useSettingsSection("typography", initial);
    const isDefault = JSON.stringify(values) === JSON.stringify(DEFAULT_FONTS);

    const groups = useMemo(() => {
        const byCategory = new Map();
        fonts.forEach((font) => {
            const category = font.category || "other";
            byCategory.set(category, [...(byCategory.get(category) || []), font]);
        });
        return [...byCategory.entries()];
    }, [fonts]);

    const names = fonts.map((font) => font.name);
    const previewHref = googleFontsUrl([values.headingFont, values.bodyFont, values.buttonFont], fonts);
    const family = (name) => ({ fontFamily: `"${names.includes(name) ? name : "Inter"}", ui-sans-serif, system-ui, sans-serif` });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const clientErrors = {};
        FONT_FIELDS.forEach(({ key }) => {
            if (!names.includes(values[key])) clientErrors[key] = "Choose one of the available fonts";
        });
        if (!check(clientErrors)) return;
        await save(values, "Typography saved");
    };

    return (
        <SettingsForm
            title="Typography"
            description="Fonts are loaded from Google Fonts on the storefront."
            onSubmit={handleSubmit}
            saving={saving}
            dirty={dirty}
            formError={formError}
            submitLabel="Save fonts"
            secondaryAction={
                <Button variant="outline" onClick={() => setValues(DEFAULT_FONTS)} disabled={saving || isDefault}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Reset to Inter
                </Button>
            }
        >
            {previewHref && <link rel="stylesheet" href={previewHref} />}
            <div className="grid gap-4 sm:grid-cols-3">
                {FONT_FIELDS.map(({ key, label, hint }) => (
                    <Select key={key} label={label} hint={hint} value={values[key]} onChange={(event) => setField(key, event.target.value)} error={errors[key]}>
                        {!names.includes(values[key]) && <option value={values[key]}>{values[key] || "Select a font"}</option>}
                        {groups.map(([category, list]) => (
                            <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                                {list.map((font) => (
                                    <option key={font.name} value={font.name}>
                                        {font.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </Select>
                ))}
            </div>

            <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Live preview</p>
                <div className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
                    <p className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase" style={family(values.bodyFont)}>
                        Heading · {values.headingFont}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl" style={family(values.headingFont)}>
                        Everyday pieces, beautifully made
                    </p>
                    <p className="mt-4 text-[11px] tracking-[0.2em] text-neutral-500 uppercase" style={family(values.bodyFont)}>
                        Body · {values.bodyFont}
                    </p>
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-neutral-700" style={family(values.bodyFont)}>
                        Soft cotton, relaxed fits and colors that go with everything. Free returns within 30 days — because the right fit matters.
                    </p>
                    <p className="mt-4 text-[11px] tracking-[0.2em] text-neutral-500 uppercase" style={family(values.bodyFont)}>
                        Button · {values.buttonFont}
                    </p>
                    <span className="mt-2 inline-flex min-h-11 items-center bg-neutral-950 px-5 text-sm font-semibold tracking-wide text-white" style={family(values.buttonFont)}>
                        Shop the collection
                    </span>
                </div>
            </div>
        </SettingsForm>
    );
}
