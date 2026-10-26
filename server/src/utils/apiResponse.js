function successResponse(message, data = null) {
    return {
        success: true,
        message,
        data
    };
}

function errorResponse(message, errors = null) {
    return {
        success: false,
        message,
        errors
    };
}

module.exports = {
    successResponse,
    errorResponse
};
