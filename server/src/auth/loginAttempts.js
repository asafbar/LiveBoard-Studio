const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const MAX_TRACKED_KEYS = 1000;

const attempts = new Map();

function isLoginLimited(key) {
    const entry = readFreshEntry(key);

    return entry !== null && entry.count >= MAX_FAILURES;
}

function recordLoginFailure(key) {
    const entry = readFreshEntry(key);
    const next = entry === null
        ? { count: 1, startedAt: Date.now() }
        : { count: entry.count + 1, startedAt: entry.startedAt };

    attempts.delete(key);
    attempts.set(key, next);
    trimAttempts();
}

function clearLoginFailures(key) {
    attempts.delete(key);
}

function readFreshEntry(key) {
    const entry = attempts.get(key);

    if (entry === undefined) {
        return null;
    }

    if (Date.now() - entry.startedAt >= WINDOW_MS) {
        attempts.delete(key);
        return null;
    }

    return entry;
}

function trimAttempts() {
    while (attempts.size > MAX_TRACKED_KEYS) {
        const oldest = attempts.keys().next().value;
        attempts.delete(oldest);
    }
}

module.exports = {
    MAX_FAILURES,
    isLoginLimited,
    recordLoginFailure,
    clearLoginFailures
};
