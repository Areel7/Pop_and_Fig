import { AlertTriangle, PackageOpen, RefreshCw } from "lucide-react";
import Button from "./Button.jsx";
import Spinner from "./Spinner.jsx";
import { getErrorMessage } from "../../redux/api/apiSlice.js";

export function Skeleton({ className = "" }) {
    return <div className={`animate-pulse bg-neutral-200/70 ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = "Loading" }) {
    return (
        <div className="flex min-h-[40vh] items-center justify-center text-neutral-500">
            <Spinner className="size-7" label={label} />
        </div>
    );
}

export function EmptyState({ icon: Icon = PackageOpen, title, message, action, className = "" }) {
    return (
        <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
            <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-secondary text-neutral-600">
                <Icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {message && <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">{message}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

export function ErrorState({ error, title = "Something went wrong", onRetry, className = "" }) {
    return (
        <div role="alert" className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
            <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-700">
                <AlertTriangle className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500">{getErrorMessage(error)}</p>
            {onRetry && (
                <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
                    <RefreshCw className="size-4" aria-hidden="true" /> Try again
                </Button>
            )}
        </div>
    );
}

export function Alert({ tone = "info", children, className = "" }) {
    const tones = {
        info: "border-neutral-200 bg-secondary text-neutral-800",
        success: "border-green-200 bg-green-50 text-green-800",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
        error: "border-red-200 bg-red-50 text-red-800",
    };
    return (
        <div role={tone === "error" ? "alert" : "status"} className={`border px-4 py-3 text-sm leading-relaxed ${tones[tone]} ${className}`}>
            {children}
        </div>
    );
}
