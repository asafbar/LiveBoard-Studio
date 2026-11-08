const assert = require("node:assert/strict");
const test = require("node:test");
const { createNewsCache } = require("./newsCache");

test("reuses a fresh source and category entry for 15 minutes", async () => {
    let timestamp = 1_000;
    let calls = 0;
    const cache = createNewsCache({
        now: () => timestamp,
        freshTtlMs: 15 * 60 * 1000,
        staleTtlMs: 2 * 60 * 60 * 1000
    });
    const loader = async () => {
        calls += 1;
        return { items: [calls] };
    };

    const first = await cache.readThrough("walla:israel", loader);
    timestamp += (15 * 60 * 1000) - 1;
    const second = await cache.readThrough("walla:israel", loader);

    assert.equal(calls, 1);
    assert.equal(second.status, "fresh");
    assert.equal(second.headlines.items[0], 1);
    assert.equal(second.fetchedAt, first.fetchedAt);
});

test("deduplicates concurrent loads and keeps another feed independent", async () => {
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    let israelCalls = 0;
    const cache = createNewsCache();
    const israel = () => {
        israelCalls += 1;
        return gate.then(() => ({ items: ["israel"] }));
    };
    const first = cache.readThrough("walla:israel", israel);
    const second = cache.readThrough("walla:israel", israel);
    const breaking = await cache.readThrough("walla:breaking", async () => {
        return { items: ["breaking"] };
    });

    assert.equal(israelCalls, 1);
    assert.equal(breaking.headlines.items[0], "breaking");
    release();

    const results = await Promise.all([first, second]);

    assert.equal(results[0].headlines.items[0], "israel");
    assert.equal(results[1].headlines.items[0], "israel");
    assert.equal(israelCalls, 1);
});

test("serves the last good list after a failure and drops it when retention ends", async () => {
    let timestamp = 5_000;
    let calls = 0;
    const freshTtlMs = 15 * 60 * 1000;
    const staleTtlMs = 2 * 60 * 60 * 1000;
    const cache = createNewsCache({
        now: () => timestamp,
        freshTtlMs,
        staleTtlMs
    });
    const loader = async () => {
        calls += 1;

        if (calls > 1) {
            throw new Error("feed down");
        }

        return { items: ["known"] };
    };

    await cache.readThrough("ynet:israel", loader);
    timestamp += freshTtlMs + 1;
    const stale = await cache.readThrough("ynet:israel", loader);

    assert.equal(stale.status, "stale");
    assert.equal(stale.headlines.items[0], "known");

    timestamp += staleTtlMs;
    await assert.rejects(cache.readThrough("ynet:israel", async () => {
        throw new Error("still down");
    }));
    assert.equal(cache.size(), 0);
});

test("does not store a failed load when nothing was cached", async () => {
    const cache = createNewsCache();

    await assert.rejects(cache.readThrough("walla:breaking", async () => {
        throw new Error("malformed");
    }));
    assert.equal(cache.size(), 0);
});
