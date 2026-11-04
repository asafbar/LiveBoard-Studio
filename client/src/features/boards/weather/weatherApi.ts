import apiClient from "../../../api/apiClient.ts";
import type { WeatherTemperatureUnit } from "../types/boardTypes.ts";
import type { WeatherSearchLocation } from "./weatherLocation.ts";
import type { WeatherFreshness } from "./weatherLoad.ts";

type WeatherForecast = {
    status: WeatherFreshness;
    fetchedAt: string;
    units: WeatherTemperatureUnit;
    location: {
        latitude: number;
        longitude: number;
        timezone: string;
    };
    current: {
        temperature: number;
        feelsLike: number;
        weatherCode: number;
        windSpeed: number | null;
        observedAt: string;
    };
    daily: WeatherForecastDay[];
    attribution: {
        text: string;
        url: string;
    };
};

type WeatherForecastDay = {
    date: string;
    weatherCode: number;
    high: number;
    low: number;
};

class WeatherRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "WeatherRequestError";
    }
}

async function searchWeatherLocations(query: string, signal: AbortSignal): Promise<WeatherSearchLocation[]> {
    const response = await apiClient.get<unknown>("/api/weather/locations", {
        params: { q: query },
        signal,
    });
    const locations = readLocations(response.data);

    if (locations === null) {
        throw new WeatherRequestError("Location search response was invalid.");
    }

    return locations;
}

async function getWeatherForecast(
    latitude: number,
    longitude: number,
    unit: WeatherTemperatureUnit,
    signal: AbortSignal,
): Promise<WeatherForecast> {
    const response = await apiClient.get<unknown>("/api/weather", {
        params: {
            latitude: String(latitude),
            longitude: String(longitude),
            unit,
        },
        signal,
    });
    const forecast = readForecast(response.data);

    if (forecast === null) {
        throw new WeatherRequestError("Weather response was invalid.");
    }

    return forecast;
}

function readLocations(payload: unknown): WeatherSearchLocation[] | null {
    const data = readData(payload);

    if (data === null || !Array.isArray(data.locations)) {
        return null;
    }

    const locations: WeatherSearchLocation[] = [];

    for (const item of data.locations) {
        const location = readSearchLocation(item);

        if (location !== null) {
            locations.push(location);
        }
    }

    return locations;
}

function readForecast(payload: unknown): WeatherForecast | null {
    const data = readData(payload);

    if (data === null || (data.status !== "fresh" && data.status !== "stale")) {
        return null;
    }

    if (data.units !== "celsius" && data.units !== "fahrenheit") {
        return null;
    }

    const location = readRecord(data.location);
    const current = readRecord(data.current);
    const attribution = readRecord(data.attribution);

    if (location === null || current === null || attribution === null || !Array.isArray(data.daily)) {
        return null;
    }

    const latitude = readFinite(location.latitude);
    const longitude = readFinite(location.longitude);
    const timezone = readText(location.timezone);
    const temperature = readFinite(current.temperature);
    const feelsLike = readFinite(current.feelsLike);
    const weatherCode = readCode(current.weatherCode);
    const observedAt = readText(current.observedAt);
    const fetchedAt = readText(data.fetchedAt);
    const attributionText = readText(attribution.text);
    const attributionUrl = readText(attribution.url);

    if (
        latitude === null
        || longitude === null
        || timezone === null
        || temperature === null
        || feelsLike === null
        || weatherCode === null
        || observedAt === null
        || fetchedAt === null
        || attributionText === null
        || attributionUrl === null
    ) {
        return null;
    }

    const daily: WeatherForecastDay[] = [];

    for (const item of data.daily) {
        const day = readDay(item);

        if (day === null) {
            return null;
        }

        daily.push(day);
    }

    return {
        status: data.status,
        fetchedAt,
        units: data.units,
        location: { latitude, longitude, timezone },
        current: {
            temperature,
            feelsLike,
            weatherCode,
            windSpeed: current.windSpeed === null ? null : readFinite(current.windSpeed),
            observedAt,
        },
        daily,
        attribution: {
            text: attributionText,
            url: attributionUrl,
        },
    };
}

function readDay(value: unknown): WeatherForecastDay | null {
    const day = readRecord(value);

    if (day === null) {
        return null;
    }

    const date = readText(day.date);
    const weatherCode = readCode(day.weatherCode);
    const high = readFinite(day.high);
    const low = readFinite(day.low);

    if (date === null || weatherCode === null || high === null || low === null) {
        return null;
    }

    return { date, weatherCode, high, low };
}

function readSearchLocation(value: unknown): WeatherSearchLocation | null {
    const location = readRecord(value);

    if (location === null) {
        return null;
    }

    const name = readText(location.name);
    const label = readText(location.label);
    const latitude = readFinite(location.latitude);
    const longitude = readFinite(location.longitude);
    const timezone = readText(location.timezone);

    if (name === null || label === null || latitude === null || longitude === null || timezone === null) {
        return null;
    }

    return {
        name,
        label,
        latitude,
        longitude,
        timezone,
        country: readText(location.country),
        countryCode: readText(location.countryCode),
        admin1: readText(location.admin1),
    };
}

function readData(payload: unknown): Record<string, unknown> | null {
    const body = readRecord(payload);

    if (body === null || body.success !== true) {
        return null;
    }

    return readRecord(body.data);
}

function readRecord(value: unknown): Record<string, unknown> | null {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function readText(value: unknown): string | null {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    return value;
}

function readFinite(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    return value;
}

function readCode(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isInteger(value)) {
        return null;
    }

    return value;
}

export type { WeatherForecast, WeatherForecastDay };
export { WeatherRequestError, getWeatherForecast, searchWeatherLocations };
