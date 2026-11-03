const {
    MAX_MEDIA_BYTES,
    removeTempUpload
} = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DISPLAY_NAME_LENGTH = 255;

function validateMediaId(req, res, next) {
    if (typeof req.params.id === "string" && UUID_PATTERN.test(req.params.id)) {
        next();
        return;
    }

    next(createHttpError(400, "Validation failed.", [{
        path: "id",
        message: "Media id must be a UUID."
    }]));
}

function validateMediaRename(req, res, next) {
    const errors = [];
    const body = readRenameBody(req.body, errors);
    let displayName = null;

    if (body !== null) {
        Object.keys(body).forEach((key) => {
            if (key !== "originalFilename") {
                errors.push({
                    path: key,
                    message: "Unknown field."
                });
            }
        });

        displayName = readDisplayName(body.originalFilename, errors);
    }

    if (errors.length > 0 || displayName === null) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    req.mediaFilename = displayName;
    next();
}

function readRenameBody(body, errors) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        errors.push({
            path: "",
            message: "Request body must be an object."
        });
        return null;
    }

    return body;
}

function readDisplayName(value, errors) {
    if (typeof value !== "string") {
        errors.push({
            path: "originalFilename",
            message: "Display name must be a string."
        });
        return null;
    }

    if (hasControlCharacter(value)) {
        errors.push({
            path: "originalFilename",
            message: "Display name cannot include control characters."
        });
        return null;
    }

    const displayName = value.trim();

    if (displayName === "") {
        errors.push({
            path: "originalFilename",
            message: "Display name is required."
        });
        return null;
    }

    if (displayName.includes("/") || displayName.includes("\\")) {
        errors.push({
            path: "originalFilename",
            message: "Display name cannot include slashes."
        });
        return null;
    }

    if (Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH) {
        errors.push({
            path: "originalFilename",
            message: "Display name must be at most 255 characters."
        });
        return null;
    }

    return displayName;
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

function validateUploadedFile(req, res, next) {
    const file = req.file;

    if (file === undefined || file === null) {
        next(missingFileError());
        return;
    }

    if (file.fieldname !== "file" || typeof file.path !== "string" || file.path === "") {
        rejectUpload(file.path, next, createHttpError(400, "Validation failed.", [{
            path: "file",
            message: "Upload one image in the file field."
        }]));
        return;
    }

    if (typeof file.size === "number" && file.size > MAX_MEDIA_BYTES) {
        rejectUpload(file.path, next, createHttpError(413, "Upload is too large.", [{
            path: "file",
            message: "The image must be 10 MB or smaller."
        }]));
        return;
    }

    if (typeof file.size === "number" && file.size < 1) {
        rejectUpload(file.path, next, missingFileError());
        return;
    }

    next();
}

function rejectUpload(filePath, next, error) {
    removeTempUpload(filePath).catch(() => {
        console.error("Temporary upload cleanup failed.");
    }).finally(() => {
        next(error);
    });
}

function missingFileError() {
    return createHttpError(400, "Validation failed.", [{
        path: "file",
        message: "An image file is required."
    }]);
}

module.exports = {
    validateMediaId,
    validateMediaRename,
    validateUploadedFile
};
