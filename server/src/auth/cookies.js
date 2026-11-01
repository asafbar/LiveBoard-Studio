const { isSessionToken } = require("./sessionToken");

const COOKIE_NAME = "liveboard.sid";
const MAX_COOKIE_HEADER_LENGTH = 4096;

function readSessionToken(cookieHeader) {
    if (cookieHeader === undefined) {
        return { status: "absent" };
    }

    if (typeof cookieHeader !== "string"
        || cookieHeader.length === 0
        || cookieHeader.length > MAX_COOKIE_HEADER_LENGTH) {
        return { status: "malformed" };
    }

    const parts = cookieHeader.split(";");
    let found = null;

    for (const part of parts) {
        const trimmed = part.trim();

        if (trimmed === "") {
            continue;
        }

        const separator = trimmed.indexOf("=");

        if (separator <= 0) {
            continue;
        }

        const name = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();

        if (name !== COOKIE_NAME) {
            continue;
        }

        if (found !== null) {
            return { status: "malformed" };
        }

        found = value;
    }

    if (found === null) {
        return { status: "absent" };
    }

    if (!isSessionToken(found)) {
        return { status: "malformed" };
    }

    return {
        status: "valid",
        value: found
    };
}

function buildSessionCookie(token, options) {
    if (!isSessionToken(token)) {
        throw new Error("Session token format is invalid.");
    }

    return serializeCookie(token, options.maxAge, options.secure);
}

function buildClearSessionCookie(options) {
    return serializeCookie("", 0, options.secure);
}

function serializeCookie(value, maxAge, secure) {
    const parts = [
        `${COOKIE_NAME}=${value}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${maxAge}`
    ];

    if (secure) {
        parts.push("Secure");
    }

    return parts.join("; ");
}

module.exports = {
    COOKIE_NAME,
    MAX_COOKIE_HEADER_LENGTH,
    readSessionToken,
    buildSessionCookie,
    buildClearSessionCookie
};
