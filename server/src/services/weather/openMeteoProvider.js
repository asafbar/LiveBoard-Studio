const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_RESPONSE_CHARS = 200000;
const DEFAULT_TIMEOUT_MS = 5000;
const LOCATION_RESULT_LIMIT = 5;
const FORECAST_DAYS = 3;

const FORECAST_ATTRIBUTION = {
    provider: "Open-Meteo",
    text: "Weather data by Open-Meteo.com",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
};

const LOCATION_ATTRIBUTION = {
    provider: "Open-Meteo",
    text: "Location data by GeoNames via Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
};

function createOpenMeteoProvider(options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    return {
        searchLocations(query) {
            const url = new URL(GEOCODING_URL);

            url.searchParams.set("name", query);
            url.searchParams.set("count", String(LOCATION_RESULT_LIMIT));
            url.searchParams.set("language", "en");
            url.searchParams.set("format", "json");
            assertTrustedUrl(url, "geocoding-api.open-meteo.com");

            return requestJson(fetchImpl, url, timeoutMs).then(normalizeLocations);
        },

        getForecast(location, units) {
            const url = new URL(FORECAST_URL);

            url.searchParams.set("latitude", String(location.latitude));
            url.searchParams.set("longitude", String(location.longitude));
            url.searchParams.set(
                "current",
                "temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
            );
            url.searchParams.set(
                "daily",
                "weather_code,temperature_2m_max,temperature_2m_min"
            );
            url.searchParams.set("forecast_days", String(FORECAST_DAYS));
            url.searchParams.set("timezone", "auto");
            url.searchParams.set("temperature_unit", units);
            url.searchParams.set("wind_speed_unit", "kmh");
            assertTrustedUrl(url, "api.open-meteo.com");

            return requestJson(fetchImpl, url, timeoutMs).then((payload) => {
                return normalizeForecast(payload, units);
            });
        }
    };
}

function assertTrustedUrl(url, hostname) {
    if (url.protocol !== "https:" || url.hostname !== hostname || url.username !== "" || url.password !== "") {
        throw providerError("invalid-url", "Weather provider URL is not allowed.");
    }
}

async function requestJson(fetchImpl, url, timeoutMs) {
    let response;

    try {
        response = await fetchImpl(url, {
            method: "GET",
            redirect: "error",
            headers: {
                Accept: "application/json"
            },
            signal: AbortSignal.timeout(timeoutMs)
        });
    } catch (error) {
        if (isTimeout(error)) {
            throw providerError("timeout", "Weather provider timed out.");
        }

        throw providerError("unavailable", "Weather provider is unavailable.");
    }

    if (!response.ok) {
        throw providerError("http", "Weather provider returned an error.");
    }

    let text;

    try {
        text = await response.text();
    } catch (error) {
        throw providerError("invalid", "Weather provider response could not be read.");
    }

    if (text.length > MAX_RESPONSE_CHARS) {
        throw providerError("invalid", "Weather provider response is too large.");
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw providerError("invalid", "Weather provider response was not valid JSON.");
    }
}

function normalizeLocations(payload) {
    if (!isPlainObject(payload) || payload.error === true) {
        throw providerError("invalid", "Weather provider location response was invalid.");
    }

    const results = payload.results === undefined ? [] : payload.results;

    if (!Array.isArray(results)) {
        throw providerError("invalid", "Weather provider location response was invalid.");
    }

    return {
        locations: results.slice(0, LOCATION_RESULT_LIMIT).map(normalizeLocation).filter((location) => {
            return location !== null;
        }),
        attribution: LOCATION_ATTRIBUTION
    };
}

function normalizeLocation(result) {
    if (!isPlainObject(result)) {
        return null;
    }

    const latitude = readFiniteNumber(result.latitude);
    const longitude = readFiniteNumber(result.longitude);
    const name = readShortText(result.name);
    const timezone = readShortText(result.timezone);
    const id = readLocationId(result.id);

    if (latitude === null || longitude === null || name === null || timezone === null || id === null) {
        return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return null;
    }

    const country = readShortText(result.country);
    const countryCode = readCountryCode(result.country_code);
    const admin1 = readShortText(result.admin1);

    return {
        id,
        name,
        label: locationLabel(name, admin1, country),
        latitude,
        longitude,
        timezone,
        country,
        countryCode,
        admin1
    };
}

function normalizeForecast(payload, units) {
    if (!isPlainObject(payload) || payload.error === true || !isPlainObject(payload.current)) {
        throw providerError("invalid", "Weather provider forecast response was invalid.");
    }

    const latitude = readFiniteNumber(payload.latitude);
    const longitude = readFiniteNumber(payload.longitude);
    const timezone = readShortText(payload.timezone);
    const temperature = readFiniteNumber(payload.current.temperature_2m);
    const feelsLike = readFiniteNumber(payload.current.apparent_temperature);
    const weatherCode = readWeatherCode(payload.current.weather_code);
    const observedAt = readShortText(payload.current.time);
    const windSpeed = readOptionalNumber(payload.current.wind_speed_10m);

    if (latitude === null
        || longitude === null
        || timezone === null
        || temperature === null
        || feelsLike === null
        || weatherCode === null
        || observedAt === null) {
        throw providerError("invalid", "Weather provider forecast response was incomplete.");
    }

    return {
        units,
        location: {
            latitude,
            longitude,
            timezone
        },
        current: {
            temperature,
            feelsLike,
            weatherCode,
            windSpeed,
            windSpeedUnit: "kmh",
            observedAt
        },
        daily: normalizeDaily(payload.daily),
        attribution: FORECAST_ATTRIBUTION
    };
}

function normalizeDaily(daily) {
    if (!isPlainObject(daily)) {
        throw providerError("invalid", "Weather provider forecast response was incomplete.");
    }

    const dates = daily.time;
    const codes = daily.weather_code;
    const highs = daily.temperature_2m_max;
    const lows = daily.temperature_2m_min;

    if (!Array.isArray(dates) || !Array.isArray(codes) || !Array.isArray(highs) || !Array.isArray(lows)) {
        throw providerError("invalid", "Weather provider forecast response was incomplete.");
    }

    if (dates.length < FORECAST_DAYS || codes.length < FORECAST_DAYS || highs.length < FORECAST_DAYS || lows.length < FORECAST_DAYS) {
        throw providerError("invalid", "Weather provider forecast response was incomplete.");
    }

    const days = [];

    for (let index = 0; index < FORECAST_DAYS; index += 1) {
        const date = readShortText(dates[index]);
        const weatherCode = readWeatherCode(codes[index]);
        const high = readFiniteNumber(highs[index]);
        const low = readFiniteNumber(lows[index]);

        if (date === null || weatherCode === null || high === null || low === null) {
            throw providerError("invalid", "Weather provider forecast response was incomplete.");
        }

        days.push({
            date,
            weatherCode,
            high,
            low
        });
    }

    return days;
}

function locationLabel(name, admin1, country) {
    const parts = [];

    parts.push(name);

    if (admin1 !== null && admin1 !== name) {
        parts.push(admin1);
    }

    if (country !== null && country !== name && country !== admin1) {
        parts.push(country);
    }

    return parts.join(", ");
}

function readLocationId(value) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return String(value);
    }

    return null;
}

function readCountryCode(value) {
    if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value)) {
        return null;
    }

    return value.toUpperCase();
}

function readShortText(value) {
    if (typeof value !== "string") {
        return null;
    }

    const text = value.trim();

    if (text === "" || text.length > 120 || /[\u0000-\u001F\u007F]/.test(text)) {
        return null;
    }

    return text;
}

function readFiniteNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    return value;
}

function readOptionalNumber(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return readFiniteNumber(value);
}

function readWeatherCode(value) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
        return null;
    }

    return value;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTimeout(error) {
    return Boolean(error)
        && (error.name === "AbortError" || error.name === "TimeoutError");
}

function providerError(code, message) {
    const error = new Error(message);
    error.name = "WeatherProviderError";
    error.code = code;
    return error;
}

module.exports = {
    FORECAST_ATTRIBUTION,
    LOCATION_ATTRIBUTION,
    createOpenMeteoProvider
};
