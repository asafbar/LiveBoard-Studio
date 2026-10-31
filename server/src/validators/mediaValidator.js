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

module.exports = {
    validateMediaId
};
