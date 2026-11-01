const {
    MAX_MEDIA_BYTES,
    removeTempUpload
} = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    validateUploadedFile
};
