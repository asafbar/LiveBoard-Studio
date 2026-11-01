const env = require("../config/env");
const {
    buildClearSessionCookie,
    readSessionToken
} = require("../auth/cookies");
const { getActiveSession } = require("../services/authService");
const { createHttpError } = require("../utils/httpError");

const REQUEST_HEADER = "x-liveboard-request";
const MAX_ORIGIN_LENGTH = 200;
const MAX_REQUEST_MARK_LENGTH = 8;

function requireCsrf(req, res, next) {
    if (!isAllowedOrigin(req.headers.origin)) {
        next(createHttpError(403, "Request origin is not allowed."));
        return;
    }

    const mark = req.headers[REQUEST_HEADER];

    if (typeof mark !== "string"
        || mark.length > MAX_REQUEST_MARK_LENGTH
        || mark !== "1") {
        next(createHttpError(403, "Request verification failed."));
        return;
    }

    next();
}

async function requireSession(req, res, next) {
    try {
        const token = readSessionToken(req.headers.cookie);

        if (token.status === "absent") {
            next(createHttpError(401, "Authentication required."));
            return;
        }

        if (token.status === "malformed") {
            clearSessionCookie(res);
            next(createHttpError(400, "Invalid session cookie."));
            return;
        }

        const session = await getActiveSession(token.value);

        if (session === null) {
            clearSessionCookie(res);
            next(createHttpError(401, "Authentication required."));
            return;
        }

        req.adminSession = session;
        req.sessionToken = token.value;
        next();
    } catch (error) {
        next(error);
    }
}

function isAllowedOrigin(origin) {
    if (origin === undefined) {
        return true;
    }

    return typeof origin === "string"
        && origin.length <= MAX_ORIGIN_LENGTH
        && origin === env.clientUrl;
}

function clearSessionCookie(res) {
    res.append("Set-Cookie", buildClearSessionCookie({
        secure: env.cookieSecure
    }));
}

module.exports = {
    requireCsrf,
    requireSession,
    requireAdmin: requireSession
};
