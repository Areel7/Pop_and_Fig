export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number";
    return null;
};

// Maps backend field errors ([{ field, message }]) to an object keyed by field name.
export const fieldErrors = (error) =>
    Object.fromEntries((error?.data?.errors || []).map((e) => [e.field.split(".").pop(), e.message]));
