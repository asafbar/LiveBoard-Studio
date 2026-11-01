const { createHash, randomBytes } = require("crypto");

const TOKEN_BYTES = 32;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function createSessionToken() {
    return randomBytes(TOKEN_BYTES).toString("base64url");
}

function isSessionToken(value) {
    return typeof value === "string" && TOKEN_PATTERN.test(value);
}

function hashSessionToken(token) {
    if (!isSessionToken(token)) {
        const error = new Error("Session token format is invalid.");
        error.code = "admin-session-malformed";
        throw error;
    }

    return createHash("sha256").update(token, "utf8").digest("hex");
}

module.exports = {
    SESSION_TTL_SECONDS,
    createSessionToken,
    isSessionToken,
    hashSessionToken
};
