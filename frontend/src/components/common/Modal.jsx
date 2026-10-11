import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEscapeKey, useLockBodyScroll } from "../../hooks/useCommon.js";
import Button from "./Button.jsx";

const SIZES = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

function Modal({ open, onClose, title, description, children, footer, size = "md", closeDisabled = false }) {
    const titleId = useId();
    const panelRef = useRef(null);
    useLockBodyScroll(open);
    useEscapeKey(open && !closeDisabled, onClose);

    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        const focusable = panelRef.current?.querySelector("input, select, textarea, button:not([data-close])");
        (focusable || panelRef.current)?.focus();
        return () => previouslyFocused?.focus?.();
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={closeDisabled ? undefined : onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`relative flex max-h-[92vh] w-full ${SIZES[size]} animate-fade-in flex-col bg-white font-admin text-neutral-900 shadow-2xl outline-none`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 id={titleId} className="font-admin text-lg font-semibold tracking-tight">
                            {title}
                        </h2>
                        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
                    </div>
                    <button
                        type="button"
                        data-close
                        onClick={onClose}
                        disabled={closeDisabled}
                        className="-mr-2 flex size-9 shrink-0 items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        aria-label="Close dialog"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message,
    confirmLabel = "Delete",
    tone = "danger",
    loading = false,
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            closeDisabled={loading}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="text-sm leading-relaxed text-neutral-600">{message}</div>
        </Modal>
    );
}

export default Modal;
