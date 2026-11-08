const assert = require("node:assert/strict");
const test = require("node:test");
const { createWeatherCache } = require("./weatherCache");

test("returns a fresh cache hit until the fresh TTL expires", async () => {
    let timestamp = 1_000;
    let calls = 0;
    const cache = createWeatherCache({
        now: () => timestamp,
        freshTtlMs: 10 * 60 * 1000,
        staleTtlMs: 6 * 60 * 60 * 1000
    });
    const loader = async () => {
        calls += 1;
        return { value: calls };
    };

    const first = await cache.readThrough("32.08:34.78:celsius", loader);
    timestamp += (10 * 60 * 1000) - 1;
    const second = await cache.readThrough("32.08:34.78:celsius", loader);

    assert.equal(calls, 1);
    assert.equal(first.status, "fresh");
    assert.equal(second.status, "fresh");
    assert.equal(second.forecast.value, 1);
    assert.equal(second.fetchedAt, first.fetchedAt);

    timestamp += 2;
    const third = await cache.readThrough("32.08:34.78:celsius", loader);

    assert.equal(calls, 2);
    assert.equal(third.status, "fresh");
    assert.equal(third.forecast.value, 2);
});

test("deduplicates concurrent loads for the same cache key", async () => {
    let calls = 0;
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const cache = createWeatherCache();
    const loader = () => {
        calls += 1;
        return gate.then(() => ({ value: "shared" }));
    };
    const first = cache.readThrough("key", loader);
    const second = cache.readThrough("key", loader);

    assert.equal(calls, 1);
    release();

    const results = await Promise.all([first, second]);

    assert.equal(results[0].status, "fresh");
    assert.equal(results[1].forecast.value, "shared");
    assert.equal(calls, 1);
});

test("serves last-known-good data after a failed refresh and drops it after six hours", async () => {
    let timestamp = 5_000;
    let calls = 0;
    const freshTtlMs = 10 * 60 * 1000;
    const staleTtlMs = 6 * 60 * 60 * 1000;
    const cache = createWeatherCache({
        now: () => timestamp,
        freshTtlMs,
        staleTtlMs
    });
    const loader = async () => {
        calls += 1;

        if (calls > 1) {
            throw new Error("provider down");
        }

        return { value: "known" };
    };

    const fresh = await cache.readThrough("city", loader);
    timestamp += freshTtlMs + 1;
    const stale = await cache.readThrough("city", loader);

    assert.equal(stale.status, "stale");
    assert.equal(stale.forecast.value, "known");
    assert.equal(stale.fetchedAt, fresh.fetchedAt);
    assert.equal(calls, 2);
    assert.equal(cache.size(), 1);

    timestamp += staleTtlMs;
    await assert.rejects(
        () => cache.readThrough("city", loader),
        (error) => error.message === "provider down"
    );
    assert.equal(cache.size(), 0);
    assert.equal(calls, 3);
});

test("does not store a failed load when no earlier forecast exists", async () => {
    let calls = 0;
    const cache = createWeatherCache();
    const loader = async () => {
        calls += 1;
        throw new Error("provider down");
    };

    await assert.rejects(() => cache.readThrough("missing", loader));
    await assert.rejects(() => cache.readThrough("missing", loader));

    assert.equal(calls, 2);
    assert.equal(cache.size(), 0);
});

test("evicts the oldest forecast when the cache reaches its limit", async () => {
    const cache = createWeatherCache({
        maxEntries: 2
    });

    await cache.readThrough("a", async () => ({ value: "a" }));
    await cache.readThrough("b", async () => ({ value: "b" }));
    await cache.readThrough("c", async () => ({ value: "c" }));

    assert.equal(cache.size(), 2);

    let calls = 0;
    await cache.readThrough("a", async () => {
        calls += 1;
        return { value: "a2" };
    });

    assert.equal(calls, 1);
    assert.equal(cache.size(), 2);
});
