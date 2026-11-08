const { errorResponse } = require("../utils/apiResponse");

function notFoundHandler(req, res) {
    res.status(404).json(
        errorResponse("Route not found.")
    );
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        next(err);
        return;
    }

    const statusCode = getStatusCode(err);

    if (statusCode >= 500) {
        console.error(`Request failed: ${err.message}${formatDiagnostic(err)}`);
    }

    res.status(statusCode).json(
        errorResponse(
            getPublicMessage(err, statusCode),
            getPublicErrors(err, statusCode)
        )
    );
}

function getStatusCode(err) {
    if (err.type === "entity.parse.failed") {
        return 400;
    }

    if (err.type === "entity.too.large") {
        return 413;
    }

    const statusCode = Number(err.statusCode || err.status);

    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600) {
        return statusCode;
    }

    return 500;
}

function formatDiagnostic(err) {
    const details = [];

    if (typeof err.code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(err.code)) {
        details.push(`code=${err.code}`);
    }

    if (typeof err.constraint === "string" && /^[A-Za-z0-9_]{1,80}$/.test(err.constraint)) {
        details.push(`constraint=${err.constraint}`);
    }

    if (details.length === 0) {
        return "";
    }

    return ` (${details.join(", ")})`;
}

function getPublicMessage(err, statusCode) {
    if (err.type === "entity.parse.failed") {
        return "Invalid JSON.";
    }

    if (err.type === "entity.too.large") {
        return "Request body is too large.";
    }

    if (statusCode >= 500 && err.expose !== true) {
        return "Internal server error.";
    }

    if (typeof err.message === "string" && err.message.trim() !== "") {
        return err.message;
    }

    return "Request failed.";
}

function getPublicErrors(err, statusCode) {
    if (statusCode >= 500 || !Array.isArray(err.errors)) {
        return null;
    }

    return err.errors.map((item) => ({
        path: typeof item.path === "string" ? item.path : "",
        message: typeof item.message === "string" ? item.message : "Invalid value."
    }));
}

module.exports = {
    notFoundHandler,
    errorHandler
};
