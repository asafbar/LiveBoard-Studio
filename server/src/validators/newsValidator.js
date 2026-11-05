const { createHttpError } = require("../utils/httpError");
const {
    MAX_NEWS_LIMIT,
    NEWS_CATEGORIES,
    NEWS_SOURCES
} = require("../services/news/newsSources");

function validateNewsQuery(req, res, next) {
    const errors = [];
    const query = readQuery(req.query, errors);
    let source = null;
    let category = null;
    let limit = null;

    if (query !== null) {
        rejectUnknownKeys(query, ["source", "category", "limit"], errors);
        source = readChoice(query.source, "source", NEWS_SOURCES, errors);
        category = readChoice(query.category, "category", NEWS_CATEGORIES, errors);
        limit = readLimit(query.limit, errors);
    }

    if (errors.length > 0 || source === null || category === null || limit === null) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    req.newsQuery = {
        source,
        category,
        limit
    };
    next();
}

function readQuery(query, errors) {
    if (query === null || typeof query !== "object" || Array.isArray(query)) {
        errors.push({
            path: "",
            message: "Query must be an object."
        });
        return null;
    }

    return query;
}

function rejectUnknownKeys(query, allowed, errors) {
    Object.keys(query).forEach((key) => {
        if (!allowed.includes(key)) {
            errors.push({
                path: key,
                message: "Unknown field."
            });
        }
    });
}

function readChoice(value, path, choices, errors) {
    if (Array.isArray(value)) {
        errors.push({
            path,
            message: "Value must be a single choice."
        });
        return null;
    }

    if (typeof value !== "string" || !choices.includes(value)) {
        errors.push({
            path,
            message: "Value is not supported."
        });
        return null;
    }

    return value;
}

function readLimit(value, errors) {
    if (Array.isArray(value)) {
        errors.push({
            path: "limit",
            message: "Limit must be a single value."
        });
        return null;
    }

    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        errors.push({
            path: "limit",
            message: "Limit must be a whole number."
        });
        return null;
    }

    const limit = Number(value);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_NEWS_LIMIT) {
        errors.push({
            path: "limit",
            message: `Limit must be from 1 to ${MAX_NEWS_LIMIT}.`
        });
        return null;
    }

    return limit;
}

module.exports = {
    validateNewsQuery
};
