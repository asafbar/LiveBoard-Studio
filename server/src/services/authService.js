const { randomBytes } = require("crypto");
const adminRepository = require("../repositories/adminRepository");
const {
    clearLoginFailures,
    isLoginLimited,
    recordLoginFailure
} = require("../auth/loginAttempts");
const {
    hashPassword,
    verifyPassword
} = require("../auth/passwordHash");
const {
    createSessionToken,
    hashSessionToken,
    isSessionToken
} = require("../auth/sessionToken");
const { createHttpError } = require("../utils/httpError");

const INVALID_CREDENTIALS = "Invalid credentials.";
let dummyHash = null;

async function createInitialAccount(username, password) {
    assertUsername(username);

    const existing = await adminRepository.countAccounts();

    if (existing > 0) {
        const error = new Error("An administrator account already exists.");
        error.code = "admin-exists";
        throw error;
    }

    const passwordHash = await hashPassword(password);

    try {
        return await adminRepository.insertAccount(username, passwordHash);
    } catch (error) {
        if (error.code === "23505") {
            const conflict = new Error("An administrator account already exists.");
            conflict.code = "admin-exists";
            throw conflict;
        }

        throw error;
    }
}

async function login({ username, password, presentedToken, clientAddress }) {
    const attemptKey = `${boundAddress(clientAddress)}\n${username}`;

    if (isLoginLimited(attemptKey)) {
        throw createHttpError(429, "Too many login attempts. Try again later.");
    }

    const account = await adminRepository.findAccountByUsername(username);
    const passwordMatches = account === null
        ? await verifyPassword(password, await getDummyHash())
        : await verifyPassword(password, account.password_hash);

    if (account === null || !passwordMatches) {
        recordLoginFailure(attemptKey);
        throw createHttpError(401, INVALID_CREDENTIALS);
    }

    clearLoginFailures(attemptKey);

    const token = createSessionToken();
    const previousTokenHash = isSessionToken(presentedToken)
        ? hashSessionToken(presentedToken)
        : null;

    await adminRepository.replaceSession(
        previousTokenHash,
        hashSessionToken(token),
        account.id
    );

    return {
        token,
        username: account.username
    };
}

async function logout(token) {
    if (!isSessionToken(token)) {
        return;
    }

    await adminRepository.deleteSession(hashSessionToken(token));
}

async function getActiveSession(token) {
    if (!isSessionToken(token)) {
        return null;
    }

    return adminRepository.findActiveSession(hashSessionToken(token));
}

async function getDummyHash() {
    if (dummyHash === null) {
        dummyHash = await hashPassword(randomBytes(32).toString("base64url"));
    }

    return dummyHash;
}

function assertUsername(username) {
    if (typeof username !== "string"
        || username.length < 1
        || username.length > 64
        || username !== username.trim()
        || /[\u0000-\u001F\u007F]/.test(username)) {
        const error = new Error(
            "ADMIN_USERNAME must be 1 to 64 characters without surrounding spaces or control characters."
        );
        error.code = "admin-username-invalid";
        throw error;
    }
}

function boundAddress(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return "unknown";
    }

    return value.trim().slice(0, 64);
}

module.exports = {
    createInitialAccount,
    login,
    logout,
    getActiveSession
};
