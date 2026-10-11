import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const controlBase =
    "block w-full rounded-none border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:bg-neutral-100 disabled:text-neutral-500";

const controlBorder = (error) => (error ? "border-red-500 focus:border-red-600" : "border-neutral-300 focus:border-neutral-900");

// Wraps a control with label, hint and error, wiring up aria attributes.
export function FormField({ label, error, hint, required, children, className = "", id: givenId }) {
    const generatedId = useId();
    const id = givenId || generatedId;
    const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">
                    {label}
                    {required && <span className="ml-0.5 text-red-700" aria-hidden="true">*</span>}
                </label>
            )}
            {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, required })}
            {hint && !error && (
                <p id={`${id}-hint`} className="mt-1.5 text-xs text-neutral-500">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-xs text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}

// `prefix` renders a fixed marker inside the field (e.g. the ₨ currency symbol).
export function Input({ label, error, hint, className, inputClassName = "", required, id, prefix, ...props }) {
    return (
        <FormField label={label} error={error} hint={hint} required={required} className={className} id={id}>
            {(field) =>
                prefix ? (
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-neutral-500" aria-hidden="true">
                            {prefix}
                        </span>
                        <input className={`${controlBase} ${controlBorder(error)} pl-9 ${inputClassName}`} {...field} {...props} />
                    </div>
                ) : (
                    <input className={`${controlBase} ${controlBorder(error)} ${inputClassName}`} {...field} {...props} />
                )
            }
        </FormField>
    );
}

export function PasswordInput({ label = "Password", error, hint, className, required, ...props }) {
    const [visible, setVisible] = useState(false);
    return (
        <FormField label={label} error={error} hint={hint} required={required} className={className}>
            {(field) => (
                <div className="relative">
                    <input type={visible ? "text" : "password"} className={`${controlBase} ${controlBorder(error)} pr-11`} {...field} {...props} />
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500 hover:text-neutral-900"
                        aria-label={visible ? "Hide password" : "Show password"}
                    >
                        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                </div>
            )}
        </FormField>
    );
}

export function Textarea({ label, error, hint, className, required, rows = 4, ...props }) {
    return (
        <FormField label={label} error={error} hint={hint} required={required} className={className}>
            {(field) => <textarea rows={rows} className={`${controlBase} ${controlBorder(error)} resize-y`} {...field} {...props} />}
        </FormField>
    );
}

export function Select({ label, error, hint, className, required, children, ...props }) {
    return (
        <FormField label={label} error={error} hint={hint} required={required} className={className}>
            {(field) => (
                <select className={`${controlBase} ${controlBorder(error)} pr-8`} {...field} {...props}>
                    {children}
                </select>
            )}
        </FormField>
    );
}

export function Checkbox({ label, description, className = "", ...props }) {
    const id = useId();
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-neutral-900" {...props} />
            <label htmlFor={id} className="text-sm">
                <span className="font-medium text-neutral-800">{label}</span>
                {description && <span className="block text-xs text-neutral-500">{description}</span>}
            </label>
        </div>
    );
}

// Accessible on/off switch.
export function Toggle({ checked, onChange, label, description, disabled }) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <label htmlFor={id} className="text-sm font-medium text-neutral-800">
                    {label}
                </label>
                {description && <p className="text-xs text-neutral-500">{description}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? "bg-neutral-900" : "bg-neutral-300"}`}
            >
                <span className={`inline-block size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
            </button>
        </div>
    );
}
