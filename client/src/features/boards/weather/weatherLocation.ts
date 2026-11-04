import type { WeatherLocationSettings, WeatherWidgetSettings } from "../types/boardTypes.ts";

type WeatherSearchLocation = {
    name: string;
    label: string;
    latitude: number;
    longitude: number;
    timezone: string;
    country: string | null;
    countryCode: string | null;
    admin1: string | null;
};

function weatherSettingsFromLocation(
    settings: WeatherWidgetSettings,
    location: WeatherSearchLocation,
): WeatherWidgetSettings {
    const nextLocation: WeatherLocationSettings = {
        name: location.name,
        label: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
    };

    if (location.country !== null && location.country !== "") {
        nextLocation.country = location.country;
    }

    if (location.countryCode !== null && location.countryCode !== "") {
        nextLocation.countryCode = location.countryCode;
    }

    if (location.admin1 !== null && location.admin1 !== "") {
        nextLocation.admin1 = location.admin1;
    }

    return {
        ...settings,
        location: nextLocation,
    };
}

export type { WeatherSearchLocation };
export { weatherSettingsFromLocation };
