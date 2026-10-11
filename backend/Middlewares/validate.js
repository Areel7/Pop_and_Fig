import ApiError from "../Utils/ApiError.js";

// Validates and replaces req.body / req.params with the parsed (coerced, stripped) values.
// req.query is read-only in Express 5, so parsed query values are exposed as req.validatedQuery.
const validate = (schemas) => (req, res, next) => {
    for (const part of ["params", "body", "query"]) {
        const schema = schemas[part];
        if (!schema) continue;

        const result = schema.safeParse(req[part] ?? {});
        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
            throw ApiError.badRequest(errors[0]?.message || "Invalid request", errors);
        }

        if (part === "query") req.validatedQuery = result.data;
        else req[part] = result.data;
    }
    next();
};

export default validate;
