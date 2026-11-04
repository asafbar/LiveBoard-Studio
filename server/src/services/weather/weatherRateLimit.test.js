const assert = require("node:assert/strict");
const test = require("node:test");
const { createWeatherLimiter } = require("./weatherRateLimit");

test("limits repeated public weather requests and resets the window", () => {
    let timestamp = 10_000;
    const limiter = createWeatherLimiter({
        now: () => timestamp,
        windowMs: 60 * 1000,
        maxRequests: 2,
        maxKeys: 10
    });

    assert.equal(limiter.consume("127.0.0.1"), true);
    assert.equal(limiter.consume("127.0.0.1"), true);
    assert.equal(limiter.consume("127.0.0.1"), false);
    assert.equal(limiter.consume("10.0.0.8"), true);

    timestamp += 60 * 1000;
    assert.equal(limiter.consume("127.0.0.1"), true);
});

test("forgets the oldest addresses when the limiter is full", () => {
    const limiter = createWeatherLimiter({
        maxRequests: 1,
        maxKeys: 2
    });

    assert.equal(limiter.consume("a"), true);
    assert.equal(limiter.consume("b"), true);
    assert.equal(limiter.consume("c"), true);
    assert.equal(limiter.consume("a"), true);
});
