const { createHttpError } = require("../utils/httpError");

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const UNITS = ["celsius", "fahrenheit"];

function validateLocationQuery(req, res, next) {
    const errors = [];
    const query = readQuery(req.query, errors);
    let text = null;

    if (query !== null) {
        rejectUnknownKeys(query, ["q"], errors);
        text = readSearchText(query.q, errors);
    }

    if (errors.length > 0 || text === null) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    req.weatherQuery = text;
    next();
}

function validateForecastQuery(req, res, next) {
    const errors = [];
    const query = readQuery(req.query, errors);
    let latitude = null;
    let longitude = null;
    let units = null;

    if (query !== null) {
        rejectUnknownKeys(query, ["latitude", "longitude", "unit"], errors);
        latitude = readCoordinate(query.latitude, "latitude", -90, 90, errors);
        longitude = readCoordinate(query.longitude, "longitude", -180, 180, errors);
        units = readUnits(query.unit, errors);
    }

    if (errors.length > 0 || latitude === null || longitude === null || units === null) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    req.weatherForecast = {
        latitude,
        longitude,
        units
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

function readSearchText(value, errors) {
    if (Array.isArray(value)) {
        errors.push({
            path: "q",
            message: "Search text must be a single value."
        });
        return null;
    }

    if (typeof value !== "string") {
        errors.push({
            path: "q",
            message: "Search text is required."
        });
        return null;
    }

    if (/[\u0000-\u001F\u007F]/.test(value)) {
        errors.push({
            path: "q",
            message: "Search text cannot include control characters."
        });
        return null;
    }

    const text = value.trim();

    if (text.length < MIN_QUERY_LENGTH) {
        errors.push({
            path: "q",
            message: "Search text must be at least 2 characters."
        });
        return null;
    }

    if (text.length > MAX_QUERY_LENGTH) {
        errors.push({
            path: "q",
            message: "Search text must be 80 characters or fewer."
        });
        return null;
    }

    return text;
}

function readCoordinate(value, path, minimum, maximum, errors) {
    if (Array.isArray(value)) {
        errors.push({
            path,
            message: `${label(path)} must be a single value.`
        });
        return null;
    }

    if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value)) {
        errors.push({
            path,
            message: `${label(path)} must be a decimal number.`
        });
        return null;
    }

    const coordinate = Number(value);

    if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
        errors.push({
            path,
            message: `${label(path)} must be from ${minimum} to ${maximum}.`
        });
        return null;
    }

    return coordinate;
}

function readUnits(value, errors) {
    if (value === undefined) {
        return "celsius";
    }

    if (Array.isArray(value) || typeof value !== "string" || !UNITS.includes(value)) {
        errors.push({
            path: "unit",
            message: "Unit must be celsius or fahrenheit."
        });
        return null;
    }

    return value;
}

function label(path) {
    if (path === "latitude") {
        return "Latitude";
    }

    return "Longitude";
}

module.exports = {
    validateForecastQuery,
    validateLocationQuery
};
