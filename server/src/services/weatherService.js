const { createOpenMeteoProvider } = require("./weather/openMeteoProvider");
const { createWeatherCache } = require("./weather/weatherCache");
const { createHttpError } = require("../utils/httpError");

const COORDINATE_DECIMALS = 2;

function createWeatherService(options = {}) {
    const provider = options.provider || createOpenMeteoProvider();
    const cache = options.cache || createWeatherCache();

    async function searchLocations(query) {
        try {
            return await provider.searchLocations(query);
        } catch (error) {
            throw unavailable(error);
        }
    }

    async function getForecast(latitude, longitude, units) {
        const location = {
            latitude: roundCoordinate(latitude),
            longitude: roundCoordinate(longitude)
        };
        const key = `${location.latitude.toFixed(COORDINATE_DECIMALS)}:${location.longitude.toFixed(COORDINATE_DECIMALS)}:${units}`;

        try {
            const result = await cache.readThrough(key, () => {
                return provider.getForecast(location, units);
            });

            return {
                status: result.status,
                fetchedAt: result.fetchedAt,
                ...result.forecast
            };
        } catch (error) {
            throw unavailable(error);
        }
    }

    return {
        searchLocations,
        getForecast
    };
}

function roundCoordinate(value) {
    const factor = 10 ** COORDINATE_DECIMALS;

    return Math.round(value * factor) / factor;
}

function unavailable(error) {
    const code = error !== null && typeof error === "object" && typeof error.code === "string"
        ? error.code
        : "unknown";

    console.error(`Weather provider request failed (${code}).`);

    const httpError = createHttpError(503, "Weather is temporarily unavailable.");
    httpError.expose = true;
    return httpError;
}

const weatherService = createWeatherService();

module.exports = {
    createWeatherService,
    searchLocations: weatherService.searchLocations,
    getForecast: weatherService.getForecast
};
