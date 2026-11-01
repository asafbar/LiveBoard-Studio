const { randomBytes, scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(scrypt);

// RFC 7914 interactive parameters: N=2^14, r=8, p=1.
// Node maps those to cost, blockSize, and parallelization.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_SALT_BYTES = 16;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const HASH_PATTERN = /^scrypt\$16384\$8\$1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{43})$/;

function assertPasswordAllowed(password) {
    if (typeof password !== "string"
        || password.length < MIN_PASSWORD_LENGTH
        || password.length > MAX_PASSWORD_LENGTH
        || password.includes("\0")) {
        const error = new Error(
            "ADMIN_PASSWORD must be 12 to 128 characters and must not contain a null character."
        );
        error.code = "admin-password-invalid";
        throw error;
    }
}

async function hashPassword(password) {
    assertPasswordAllowed(password);

    const salt = randomBytes(SCRYPT_SALT_BYTES);
    const derived = await deriveKey(password, salt);

    return [
        "scrypt",
        String(SCRYPT_N),
        String(SCRYPT_R),
        String(SCRYPT_P),
        salt.toString("base64url"),
        derived.toString("base64url")
    ].join("$");
}

async function verifyPassword(password, storedHash) {
    if (typeof password !== "string"
        || password.length < MIN_PASSWORD_LENGTH
        || password.length > MAX_PASSWORD_LENGTH
        || password.includes("\0")) {
        return false;
    }

    const parsed = parseStoredHash(storedHash);

    if (parsed === null) {
        return false;
    }

    const actual = await deriveKey(password, parsed.salt);
    const expected = Buffer.from(parsed.hash, "base64url");

    if (actual.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(actual, expected);
}

function parseStoredHash(storedHash) {
    if (typeof storedHash !== "string") {
        return null;
    }

    const match = HASH_PATTERN.exec(storedHash);

    if (match === null) {
        return null;
    }

    const salt = Buffer.from(match[1], "base64url");
    const hash = Buffer.from(match[2], "base64url");

    if (salt.length !== SCRYPT_SALT_BYTES || hash.length !== SCRYPT_KEY_LENGTH) {
        return null;
    }

    return {
        salt,
        hash: match[2]
    };
}

function deriveKey(password, salt) {
    return scryptAsync(password, salt, SCRYPT_KEY_LENGTH, {
        cost: SCRYPT_N,
        blockSize: SCRYPT_R,
        parallelization: SCRYPT_P
    });
}

module.exports = {
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
    assertPasswordAllowed,
    hashPassword,
    verifyPassword
};
