function createHttpError(statusCode, message, errors = null) {
    const error = new Error(message);
    error.statusCode = statusCode;

    if (errors !== null) {
        error.errors = errors;
    }

    return error;
}

module.exports = {
    createHttpError
};
