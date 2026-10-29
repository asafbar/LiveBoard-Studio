const { createHttpError } = require("../utils/httpError");

const MAX_NAME_LENGTH = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISPLAY_KEYS = ["name", "boardId"];

function validateDisplayId(req, res, next) {
    if (typeof req.params.id === "string" && UUID_PATTERN.test(req.params.id)) {
        next();
        return;
    }

    next(createHttpError(400, "Validation failed.", [{
        path: "id",
        message: "Display id must be a UUID."
    }]));
}

function validateCreateDisplay(req, res, next) {
    const errors = [];
    const body = readBody(req.body, errors);

    if (body !== null) {
        rejectUnknownKeys(body, errors);
        const name = readName(body.name, errors);
        const boardId = readBoardId(body, errors);

        if (errors.length === 0) {
            req.displayInput = {
                name,
                boardId
            };
        }
    }

    if (errors.length > 0) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    next();
}

function validateUpdateDisplay(req, res, next) {
    const errors = [];
    const body = readBody(req.body, errors);

    if (body !== null) {
        rejectUnknownKeys(body, errors);

        const hasName = Object.prototype.hasOwnProperty.call(body, "name");
        const hasBoardId = Object.prototype.hasOwnProperty.call(body, "boardId");
        const update = {};

        if (!hasName && !hasBoardId) {
            errors.push({
                path: "",
                message: "Request must include a display name or board assignment."
            });
        }

        if (hasName) {
            update.name = readName(body.name, errors);
        }

        if (hasBoardId) {
            update.boardId = readBoardId(body, errors);
        }

        if (errors.length === 0) {
            req.displayUpdate = update;
        }
    }

    if (errors.length > 0) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    next();
}

function readBody(body, errors) {
    if (!isPlainObject(body)) {
        errors.push({
            path: "",
            message: "Request body must be an object."
        });
        return null;
    }

    return body;
}

function rejectUnknownKeys(body, errors) {
    Object.keys(body).forEach((key) => {
        if (DISPLAY_KEYS.includes(key)) {
            return;
        }

        errors.push({
            path: key,
            message: "Unknown field."
        });
    });
}

function readName(value, errors) {
    if (typeof value !== "string" || hasControlCharacter(value)) {
        errors.push({
            path: "name",
            message: "Display name is required."
        });
        return null;
    }

    const name = value.trim();

    if (name === "" || name.length > MAX_NAME_LENGTH) {
        errors.push({
            path: "name",
            message: `Display name is required and must be at most ${MAX_NAME_LENGTH} characters.`
        });
        return null;
    }

    return name;
}

function readBoardId(body, errors) {
    if (!Object.prototype.hasOwnProperty.call(body, "boardId") || body.boardId === null) {
        return null;
    }

    if (typeof body.boardId === "string" && UUID_PATTERN.test(body.boardId)) {
        return body.boardId.toLowerCase();
    }

    errors.push({
        path: "boardId",
        message: "Board id must be a UUID."
    });
    return null;
}

function hasControlCharacter(value) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
    validateDisplayId,
    validateCreateDisplay,
    validateUpdateDisplay
};
