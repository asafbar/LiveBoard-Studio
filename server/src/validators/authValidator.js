const { createHttpError } = require("../utils/httpError");
const { MAX_PASSWORD_LENGTH } = require("../auth/passwordHash");

const MAX_USERNAME_LENGTH = 64;

function validateLogin(req, res, next) {
    const errors = [];
    const body = readBody(req.body, errors);

    if (body !== null) {
        Object.keys(body).forEach((key) => {
            if (key !== "username" && key !== "password") {
                errors.push({
                    path: key,
                    message: "Unknown field."
                });
            }
        });

        const username = readUsername(body.username, errors);
        const password = readPassword(body.password, errors);

        if (errors.length === 0) {
            req.authLogin = {
                username,
                password
            };
        }
    }

    if (errors.length > 0) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    next();
}

function readBody(body, errors) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        errors.push({
            path: "",
            message: "Request body must be an object."
        });
        return null;
    }

    return body;
}

function readUsername(value, errors) {
    if (typeof value !== "string" || value.trim() === "") {
        errors.push({
            path: "username",
            message: "Username is required."
        });
        return "";
    }

    if (value !== value.trim()
        || value.length > MAX_USERNAME_LENGTH
        || /[\u0000-\u001F\u007F]/.test(value)) {
        errors.push({
            path: "username",
            message: "Username must be 1 to 64 characters without surrounding spaces or control characters."
        });
        return "";
    }

    return value;
}

function readPassword(value, errors) {
    if (typeof value !== "string" || value === "") {
        errors.push({
            path: "password",
            message: "Password is required."
        });
        return "";
    }

    if (value.length > MAX_PASSWORD_LENGTH || value.includes("\0")) {
        errors.push({
            path: "password",
            message: "Password must be at most 128 characters and must not contain a null character."
        });
        return "";
    }

    return value;
}

module.exports = {
    validateLogin
};
