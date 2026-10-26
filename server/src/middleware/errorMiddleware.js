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
        console.error(`Request failed: ${err.message}`);
    }

    res.status(statusCode).json(
        errorResponse(getPublicMessage(err, statusCode))
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

function getPublicMessage(err, statusCode) {
    if (err.type === "entity.parse.failed") {
        return "Invalid JSON.";
    }

    if (err.type === "entity.too.large") {
        return "Request body is too large.";
    }

    if (statusCode >= 500) {
        return "Internal server error.";
    }

    if (typeof err.message === "string" && err.message.trim() !== "") {
        return err.message;
    }

    return "Request failed.";
}

module.exports = {
    notFoundHandler,
    errorHandler
};
