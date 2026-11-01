const env = require("../config/env");
const {
    buildClearSessionCookie,
    buildSessionCookie,
    readSessionToken
} = require("../auth/cookies");
const { SESSION_TTL_SECONDS } = require("../auth/sessionToken");
const authService = require("../services/authService");
const { successResponse } = require("../utils/apiResponse");

async function login(req, res, next) {
    try {
        const presented = readSessionToken(req.headers.cookie);
        const result = await authService.login({
            username: req.authLogin.username,
            password: req.authLogin.password,
            presentedToken: presented.status === "valid" ? presented.value : null,
            clientAddress: readClientAddress(req)
        });

        res.append("Set-Cookie", buildSessionCookie(result.token, {
            maxAge: SESSION_TTL_SECONDS,
            secure: env.cookieSecure
        }));
        res.status(200).json(successResponse("Signed in successfully.", {
            username: result.username
        }));
    } catch (error) {
        next(error);
    }
}

async function logout(req, res, next) {
    try {
        await authService.logout(req.sessionToken);
        res.append("Set-Cookie", buildClearSessionCookie({
            secure: env.cookieSecure
        }));
        res.status(200).json(successResponse("Signed out successfully.", null));
    } catch (error) {
        next(error);
    }
}

function getSession(req, res, next) {
    try {
        res.status(200).json(successResponse("Session is active.", {
            username: req.adminSession.username
        }));
    } catch (error) {
        next(error);
    }
}

function readClientAddress(req) {
    if (typeof req.ip === "string" && req.ip.trim() !== "") {
        return req.ip;
    }

    if (req.socket && typeof req.socket.remoteAddress === "string") {
        return req.socket.remoteAddress;
    }

    return "";
}

module.exports = {
    login,
    logout,
    getSession
};
