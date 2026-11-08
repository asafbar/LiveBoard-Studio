const assert = require("node:assert/strict");
const test = require("node:test");
const { createWeatherService } = require("./weatherService");
const { createWeatherCache } = require("./weather/weatherCache");

test("keeps temperature units in separate cache entries", async () => {
    const calls = [];
    const service = createWeatherService({
        provider: {
            getForecast(location, units) {
                calls.push({ location, units });
                return Promise.resolve(sampleForecast(units));
            }
        }
    });

    const celsius = await service.getForecast(32.084, 34.786, "celsius");
    const again = await service.getForecast(32.08, 34.79, "celsius");
    const fahrenheit = await service.getForecast(32.08, 34.79, "fahrenheit");

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].location, { latitude: 32.08, longitude: 34.79 });
    assert.equal(calls[1].units, "fahrenheit");
    assert.equal(celsius.status, "fresh");
    assert.equal(again.status, "fresh");
    assert.equal(again.fetchedAt, celsius.fetchedAt);
    assert.equal(fahrenheit.units, "fahrenheit");
    assert.equal(celsius.attribution.text, "Weather data by Open-Meteo.com");
});

test("deduplicates concurrent forecast requests for one location", async () => {
    let calls = 0;
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const service = createWeatherService({
        provider: {
            getForecast() {
                calls += 1;
                return gate.then(() => sampleForecast("celsius"));
            }
        }
    });
    const first = service.getForecast(31.999, 35.001, "celsius");
    const second = service.getForecast(32.004, 34.996, "celsius");

    assert.equal(calls, 1);
    release();

    const results = await Promise.all([first, second]);

    assert.equal(results[0].status, "fresh");
    assert.equal(results[1].current.temperature, 22.4);
    assert.equal(calls, 1);
});

test("returns stale data after a provider failure and then reports unavailable", async () => {
    let timestamp = 0;
    let calls = 0;
    const freshTtlMs = 10 * 60 * 1000;
    const staleTtlMs = 6 * 60 * 60 * 1000;
    const service = createWeatherService({
        cache: createWeatherCache({
            now: () => timestamp,
            freshTtlMs,
            staleTtlMs
        }),
        provider: {
            getForecast() {
                calls += 1;

                if (calls > 1) {
                    const error = new Error("down");
                    error.code = "timeout";
                    throw error;
                }

                return Promise.resolve(sampleForecast("celsius"));
            }
        }
    });
    const fresh = await service.getForecast(32.08, 34.78, "celsius");

    timestamp = freshTtlMs + 1;
    const stale = await service.getForecast(32.08, 34.78, "celsius");

    assert.equal(stale.status, "stale");
    assert.equal(stale.fetchedAt, fresh.fetchedAt);
    assert.equal(stale.current.weatherCode, 2);

    timestamp = freshTtlMs + 1 + staleTtlMs;
    await assert.rejects(
        () => service.getForecast(32.08, 34.78, "celsius"),
        (error) => {
            assert.equal(error.statusCode, 503);
            assert.equal(error.expose, true);
            assert.equal(error.message, "Weather is temporarily unavailable.");
            return true;
        }
    );
});

test("does not cache a provider error as a successful forecast", async () => {
    let calls = 0;
    const service = createWeatherService({
        provider: {
            searchLocations() {
                calls += 1;
                const error = new Error("down");
                error.code = "http";
                return Promise.reject(error);
            }
        }
    });

    await assert.rejects(
        () => service.searchLocations("Tel Aviv"),
        (error) => error.statusCode === 503
    );
    await assert.rejects(() => service.searchLocations("Tel Aviv"));
    assert.equal(calls, 2);
});

function sampleForecast(units) {
    return {
        units,
        location: {
            latitude: 32.08,
            longitude: 34.78,
            timezone: "Asia/Jerusalem"
        },
        current: {
            temperature: 22.4,
            feelsLike: 21.1,
            weatherCode: 2,
            windSpeed: 12.5,
            windSpeedUnit: "kmh",
            observedAt: "2026-11-04T08:00"
        },
        daily: [
            { date: "2026-11-04", weatherCode: 2, high: 24.2, low: 16.4 },
            { date: "2026-11-05", weatherCode: 3, high: 23.1, low: 15.2 },
            { date: "2026-11-06", weatherCode: 61, high: 21, low: 14.8 }
        ],
        attribution: {
            provider: "Open-Meteo",
            text: "Weather data by Open-Meteo.com",
            url: "https://open-meteo.com/",
            license: "CC BY 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
        }
    };
}
