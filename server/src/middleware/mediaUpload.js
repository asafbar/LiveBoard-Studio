const { randomUUID } = require("crypto");
const multer = require("multer");
const { MAX_MEDIA_BYTES, ensureTempDirectory, removeTempUpload } = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

const MAX_ACTIVE_UPLOADS = 1;
const MAX_WAITING_UPLOADS = 2;

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            ensureTempDirectory().then(
                (directory) => {
                    callback(null, directory);
                },
                (error) => {
                    callback(error);
                }
            );
        },
        filename(req, file, callback) {
            callback(null, `${randomUUID()}.part`);
        }
    }),
    limits: {
        fileSize: MAX_MEDIA_BYTES,
        files: 1,
        fields: 0,
        parts: 1,
        fieldNameSize: 100,
        headerPairs: 2000
    }
}).single("file");

function gateUploads(req, res, next) {
    if (activeUploads < MAX_ACTIVE_UPLOADS) {
        activeUploads += 1;
        releaseUploadWhenDone(res);
        next();
        return;
    }

    if (waitingUploads.length >= MAX_WAITING_UPLOADS) {
        next(createHttpError(429, "Too many upload requests. Try again later."));
        return;
    }

    let settled = false;

    function start() {
        if (settled) {
            releaseReservedSlot();
            return;
        }

        settled = true;
        releaseUploadWhenDone(res);
        next();
    }

    function cancel() {
        if (settled) {
            return;
        }

        settled = true;
        const index = waitingUploads.indexOf(start);

        if (index !== -1) {
            waitingUploads.splice(index, 1);
        }
    }

    waitingUploads.push(start);
    res.once("close", cancel);
}

function parseMediaUpload(req, res, next) {
    upload(req, res, (error) => {
        const tempPath = req.file && typeof req.file.path === "string"
            ? req.file.path
            : "";

        if (!error) {
            next();
            return;
        }

        removeTempUpload(tempPath).catch(() => {
            console.error("Temporary upload cleanup failed.");
        }).finally(() => {
            next(mapUploadError(error));
        });
    });
}

function releaseReservedSlot() {
    activeUploads -= 1;
    const start = waitingUploads.shift();

    if (start !== undefined) {
        activeUploads += 1;
        start();
    }
}

function releaseUploadWhenDone(res) {
    let released = false;

    function release() {
        if (released) {
            return;
        }

        released = true;
        releaseReservedSlot();
    }

    res.once("finish", release);
    res.once("close", release);
}

function mapUploadError(error) {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return createHttpError(413, "Upload is too large.", [{
                path: "file",
                message: "The image must be 10 MB or smaller."
            }]);
        }

        if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
            return createHttpError(400, "Validation failed.", [{
                path: "file",
                message: "Upload one image in the file field."
            }]);
        }

        return createHttpError(400, "Validation failed.", [{
            path: "file",
            message: "The upload form is not valid."
        }]);
    }

    if (isMultipartParseError(error)) {
        return createHttpError(400, "Malformed upload.");
    }

    return error;
}

function isMultipartParseError(error) {
    const message = typeof error.message === "string" ? error.message : "";

    return /multipart|boundary|unexpected end|malformed part/i.test(message);
}

let activeUploads = 0;
const waitingUploads = [];

module.exports = {
    gateUploads,
    parseMediaUpload
};
