import { useState } from "react";
import { toast } from "react-toastify";
import { useUpdateSettingsMutation } from "../../../redux/api/settingsApi.js";
import { getErrorMessage } from "../../../redux/api/apiSlice.js";
import { sectionFieldErrors } from "./settingsUtils.js";

/**
 * Local form state for one settings section. The parent keys each section by its saved data,
 * so after a successful save the form remounts with the server's (normalised) values.
 */
export function useSettingsSection(section, initialValues) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();

    const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);

    const setField = (field, value) => {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    };

    // Returns true when the client-side errors object is empty; otherwise shows them.
    const check = (clientErrors) => {
        setErrors(clientErrors);
        const ok = Object.values(clientErrors).every((message) => !message);
        setFormError(ok ? "" : "Please fix the highlighted fields.");
        return ok;
    };

    const save = async (payload, successMessage = "Settings saved") => {
        setFormError("");
        try {
            await updateSettings({ [section]: payload }).unwrap();
            toast.success(successMessage);
            return true;
        } catch (error) {
            setErrors(sectionFieldErrors(error, section));
            setFormError(getErrorMessage(error));
            toast.error(getErrorMessage(error));
            return false;
        }
    };

    return { values, setValues, setField, errors, formError, saving, dirty, check, save };
}
