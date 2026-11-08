const assert = require("node:assert/strict");
const test = require("node:test");
const { createOpenMeteoProvider } = require("./openMeteoProvider");

const FORECAST_FIXTURE = {
    latitude: 32.08,
    longitude: 34.78,
    generationtime_ms: 0.1,
    utc_offset_seconds: 7200,
    timezone: "Asia/Jerusalem",
    timezone_abbreviation: "IST",
    elevation: 40,
    current_units: {
        temperature_2m: "°C"
    },
    current: {
        time: "2026-11-04T08:00",
        interval: 900,
        temperature_2m: 22.4,
        apparent_temperature: 21.1,
        weather_code: 2,
        wind_speed_10m: 12.5
    },
    daily_units: {
        temperature_2m_max: "°C"
    },
    daily: {
        time: ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"],
        weather_code: [2, 3, 61, 0],
        temperature_2m_max: [24.2, 23.1, 21, 19],
        temperature_2m_min: [16.4, 15.2, 14.8, 13]
    }
};

const LOCATION_FIXTURE = {
    results: [
        {
            id: 293397,
            name: "Tel Aviv",
            latitude: 32.08088,
            longitude: 34.78057,
            elevation: 5,
            feature_code: "PPLA",
            country_code: "IL",
            country: "Israel",
            admin1: "Tel Aviv",
            timezone: "Asia/Jerusalem",
            population: 432892
        },
        {
            id: 1,
            name: "Incomplete"
        }
    ],
    generationtime_ms: 0.2
};

test("normalizes an Open-Meteo forecast and ignores raw provider fields", async () => {
    const calls = [];
    const provider = createOpenMeteoProvider({
        fetchImpl(url, options) {
            calls.push({ url, options });
            return jsonResponse(FORECAST_FIXTURE);
        }
    });
    const forecast = await provider.getForecast({
        latitude: 32.08,
        longitude: 34.78
    }, "celsius");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.protocol, "https:");
    assert.equal(calls[0].url.hostname, "api.open-meteo.com");
    assert.equal(calls[0].url.pathname, "/v1/forecast");
    assert.equal(calls[0].url.searchParams.get("latitude"), "32.08");
    assert.equal(calls[0].url.searchParams.get("longitude"), "34.78");
    assert.equal(calls[0].url.searchParams.get("temperature_unit"), "celsius");
    assert.equal(calls[0].url.searchParams.get("forecast_days"), "3");
    assert.equal(calls[0].url.searchParams.get("apikey"), null);
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(forecast.units, "celsius");
    assert.equal(forecast.location.timezone, "Asia/Jerusalem");
    assert.equal(forecast.current.temperature, 22.4);
    assert.equal(forecast.current.feelsLike, 21.1);
    assert.equal(forecast.current.weatherCode, 2);
    assert.equal(forecast.current.windSpeed, 12.5);
    assert.equal(forecast.current.windSpeedUnit, "kmh");
    assert.equal(forecast.current.observedAt, "2026-11-04T08:00");
    assert.equal(forecast.daily.length, 3);
    assert.deepEqual(forecast.daily[2], {
        date: "2026-11-06",
        weatherCode: 61,
        high: 21,
        low: 14.8
    });
    assert.equal(forecast.attribution.text, "Weather data by Open-Meteo.com");
    assert.equal(forecast.attribution.url, "https://open-meteo.com/");
    assert.equal(forecast.elevation, undefined);
    assert.equal(forecast.current_units, undefined);
    assert.equal(forecast.generationtime_ms, undefined);
});

test("keeps a forecast when current wind speed is absent", async () => {
    const fixture = structuredClone(FORECAST_FIXTURE);
    delete fixture.current.wind_speed_10m;
    const provider = createOpenMeteoProvider({
        fetchImpl() {
            return jsonResponse(fixture);
        }
    });
    const forecast = await provider.getForecast({
        latitude: 32.08,
        longitude: 34.78
    }, "fahrenheit");

    assert.equal(forecast.units, "fahrenheit");
    assert.equal(forecast.current.windSpeed, null);
});

test("rejects an incomplete forecast without a second request", async () => {
    let calls = 0;
    const provider = createOpenMeteoProvider({
        fetchImpl() {
            calls += 1;
            return jsonResponse({
                error: true,
                reason: "Invalid parameter"
            });
        }
    });

    await assert.rejects(
        () => provider.getForecast({ latitude: 1, longitude: 2 }, "celsius"),
        (error) => error.code === "invalid"
    );
    assert.equal(calls, 1);
});

test("searches only the trusted geocoding host and drops incomplete results", async () => {
    const calls = [];
    const provider = createOpenMeteoProvider({
        fetchImpl(url) {
            calls.push(url);
            return jsonResponse(LOCATION_FIXTURE);
        }
    });
    const result = await provider.searchLocations("http://169.254.169.254/latest");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].hostname, "geocoding-api.open-meteo.com");
    assert.equal(calls[0].pathname, "/v1/search");
    assert.equal(calls[0].searchParams.get("name"), "http://169.254.169.254/latest");
    assert.equal(calls[0].searchParams.get("count"), "5");
    assert.equal(result.locations.length, 1);
    assert.deepEqual(result.locations[0], {
        id: "293397",
        name: "Tel Aviv",
        label: "Tel Aviv, Israel",
        latitude: 32.08088,
        longitude: 34.78057,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Tel Aviv"
    });
    assert.equal(result.locations[0].population, undefined);
    assert.equal(result.attribution.text, "Location data by GeoNames via Open-Meteo");
});

test("returns no locations when the provider has an empty result set", async () => {
    const provider = createOpenMeteoProvider({
        fetchImpl() {
            return jsonResponse({});
        }
    });
    const result = await provider.searchLocations("zz");

    assert.deepEqual(result.locations, []);
});

test("maps a provider timeout to one failed attempt", async () => {
    let calls = 0;
    const provider = createOpenMeteoProvider({
        timeoutMs: 20,
        fetchImpl(url, options) {
            calls += 1;
            return new Promise((resolve, reject) => {
                options.signal.addEventListener("abort", () => {
                    const error = new Error("timed out");
                    error.name = "TimeoutError";
                    reject(error);
                });
            });
        }
    });

    await assert.rejects(
        () => provider.getForecast({ latitude: 1, longitude: 2 }, "celsius"),
        (error) => error.code === "timeout"
    );
    assert.equal(calls, 1);
});

test("maps provider HTTP and network failures without retrying", async () => {
    let httpCalls = 0;
    const httpProvider = createOpenMeteoProvider({
        fetchImpl() {
            httpCalls += 1;
            return {
                ok: false,
                text() {
                    return Promise.resolve("secret provider body");
                }
            };
        }
    });

    await assert.rejects(
        () => httpProvider.searchLocations("Tel Aviv"),
        (error) => error.code === "http"
    );
    assert.equal(httpCalls, 1);

    let networkCalls = 0;
    const networkProvider = createOpenMeteoProvider({
        fetchImpl() {
            networkCalls += 1;
            return Promise.reject(new Error("ECONNREFUSED"));
        }
    });

    await assert.rejects(
        () => networkProvider.getForecast({ latitude: 1, longitude: 2 }, "celsius"),
        (error) => error.code === "unavailable"
    );
    assert.equal(networkCalls, 1);
});

test("rejects malformed and oversized provider bodies", async () => {
    const malformed = createOpenMeteoProvider({
        fetchImpl() {
            return {
                ok: true,
                text() {
                    return Promise.resolve("{");
                }
            };
        }
    });

    await assert.rejects(
        () => malformed.searchLocations("Tel Aviv"),
        (error) => error.code === "invalid"
    );

    const oversized = createOpenMeteoProvider({
        fetchImpl() {
            return {
                ok: true,
                text() {
                    return Promise.resolve("x".repeat(200001));
                }
            };
        }
    });

    await assert.rejects(
        () => oversized.getForecast({ latitude: 1, longitude: 2 }, "celsius"),
        (error) => error.code === "invalid"
    );
});

function jsonResponse(body) {
    return {
        ok: true,
        text() {
            return Promise.resolve(JSON.stringify(body));
        }
    };
}
