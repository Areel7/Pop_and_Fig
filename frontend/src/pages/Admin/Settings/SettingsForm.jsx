import Button from "../../../components/common/Button.jsx";
import { Alert } from "../../../components/common/Feedback.jsx";
import { Card } from "../../../components/admin/AdminUI.jsx";

// Card wrapper shared by every settings section: its own form, error banner and Save button.
function SettingsForm({ title, description, onSubmit, saving, dirty, formError, secondaryAction, submitLabel = "Save changes", children }) {
    return (
        <Card title={title} description={description}>
            <form onSubmit={onSubmit} noValidate>
                {formError && (
                    <Alert tone="error" className="mb-5">
                        {formError}
                    </Alert>
                )}
                <div className="space-y-5">{children}</div>
                <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-neutral-500" aria-live="polite">
                        {dirty ? <span className="font-medium text-amber-700">You have unsaved changes.</span> : "All changes saved."}
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        {secondaryAction}
                        <Button type="submit" loading={saving} disabled={!dirty}>
                            {submitLabel}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

export default SettingsForm;
