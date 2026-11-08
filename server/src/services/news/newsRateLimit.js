const { createHttpError } = require("../../utils/httpError");

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;
const MAX_TRACKED_KEYS = 1000;

function createNewsLimiter(options = {}) {
    const now = options.now || Date.now;
    const windowMs = options.windowMs || WINDOW_MS;
    const maxRequests = options.maxRequests || MAX_REQUESTS;
    const maxTrackedKeys = options.maxKeys || MAX_TRACKED_KEYS;
    const hits = new Map();

    function consume(key) {
        const timestamp = now();
        const current = hits.get(key);
        const fresh = current !== undefined && timestamp - current.startedAt < windowMs;
        const next = fresh
            ? {
                count: current.count + 1,
                startedAt: current.startedAt
            }
            : {
                count: 1,
                startedAt: timestamp
            };

        hits.delete(key);
        hits.set(key, next);

        while (hits.size > maxTrackedKeys) {
            const oldest = hits.keys().next().value;
            hits.delete(oldest);
        }

        return next.count <= maxRequests;
    }

    return {
        consume
    };
}

const publicNewsLimiter = createNewsLimiter();

function limitPublicNews(req, res, next) {
    const address = req.socket && typeof req.socket.remoteAddress === "string"
        ? req.socket.remoteAddress
        : "unknown";

    if (publicNewsLimiter.consume(address)) {
        next();
        return;
    }

    next(createHttpError(429, "Too many news requests. Try again later."));
}

module.exports = {
    MAX_REQUESTS,
    createNewsLimiter,
    limitPublicNews
};
