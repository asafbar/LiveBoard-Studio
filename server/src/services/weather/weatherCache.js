const DEFAULT_FRESH_TTL_MS = 10 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 100;

function createWeatherCache(options = {}) {
    const now = options.now || Date.now;
    const freshTtlMs = options.freshTtlMs || DEFAULT_FRESH_TTL_MS;
    const staleTtlMs = options.staleTtlMs || DEFAULT_STALE_TTL_MS;
    const maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
    const entries = new Map();
    const pending = new Map();

    async function readThrough(key, loader) {
        const current = readUsable(key);
        const timestamp = now();

        if (current !== null && timestamp < current.freshUntil) {
            return present("fresh", current);
        }

        const existing = pending.get(key);

        if (existing !== undefined) {
            return existing;
        }

        const request = load(key, loader).finally(() => {
            pending.delete(key);
        });

        pending.set(key, request);
        return request;
    }

    async function load(key, loader) {
        try {
            const value = await loader();
            const timestamp = now();
            const record = {
                value,
                fetchedAt: new Date(timestamp).toISOString(),
                freshUntil: timestamp + freshTtlMs,
                staleUntil: timestamp + staleTtlMs
            };

            remember(key, record);
            return present("fresh", record);
        } catch (error) {
            const current = readUsable(key);

            if (current !== null && now() < current.staleUntil) {
                return present("stale", current);
            }

            throw error;
        }
    }

    function readUsable(key) {
        const record = entries.get(key);

        if (record === undefined) {
            return null;
        }

        if (now() >= record.staleUntil) {
            entries.delete(key);
            return null;
        }

        return record;
    }

    function remember(key, record) {
        entries.delete(key);
        entries.set(key, record);

        while (entries.size > maxEntries) {
            const oldest = entries.keys().next().value;
            entries.delete(oldest);
        }
    }

    function present(status, record) {
        return {
            status,
            fetchedAt: record.fetchedAt,
            forecast: record.value
        };
    }

    function size() {
        return entries.size;
    }

    return {
        readThrough,
        size
    };
}

module.exports = {
    DEFAULT_FRESH_TTL_MS,
    DEFAULT_MAX_ENTRIES,
    DEFAULT_STALE_TTL_MS,
    createWeatherCache
};
