import type { WeatherLocationSettings } from "../types/boardTypes.ts";

type WeatherCity = WeatherLocationSettings & {
    id: string;
    country: string;
    countryCode: string;
};

// Ids, coordinates, and time zones are the Open-Meteo city records.
// Beer Sheva uses the Beersheba city record and the requested display name.
const weatherCities: readonly WeatherCity[] = [
    {
        id: "294117",
        name: "Nahariya",
        label: "Nahariya, Israel",
        latitude: 33.00892,
        longitude: 35.09814,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Northern District",
    },
    {
        id: "294801",
        name: "Haifa",
        label: "Haifa, Israel",
        latitude: 32.81303,
        longitude: 34.99928,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Haifa District",
    },
    {
        id: "295721",
        name: "Acre",
        label: "Acre, Israel",
        latitude: 32.92814,
        longitude: 35.07647,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Northern District",
    },
    {
        id: "293397",
        name: "Tel Aviv",
        label: "Tel Aviv, Israel",
        latitude: 32.08088,
        longitude: 34.78057,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Tel Aviv",
    },
    {
        id: "281184",
        name: "Jerusalem",
        label: "Jerusalem, Israel",
        latitude: 31.76904,
        longitude: 35.21633,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Jerusalem",
    },
    {
        id: "295530",
        name: "Beer Sheva",
        label: "Beer Sheva, Israel",
        latitude: 31.25181,
        longitude: 34.7913,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Southern District",
    },
    {
        id: "295277",
        name: "Eilat",
        label: "Eilat, Israel",
        latitude: 29.55805,
        longitude: 34.94821,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Southern District",
    },
    {
        id: "2643743",
        name: "London",
        label: "London, United Kingdom",
        latitude: 51.50853,
        longitude: -0.12574,
        timezone: "Europe/London",
        country: "United Kingdom",
        countryCode: "GB",
        admin1: "England",
    },
    {
        id: "5128581",
        name: "New York",
        label: "New York, United States",
        latitude: 40.71427,
        longitude: -74.00597,
        timezone: "America/New_York",
        country: "United States",
        countryCode: "US",
        admin1: "New York",
    },
    {
        id: "2988507",
        name: "Paris",
        label: "Paris, France",
        latitude: 48.85341,
        longitude: 2.3488,
        timezone: "Europe/Paris",
        country: "France",
        countryCode: "FR",
        admin1: "Île-de-France Region",
    },
    {
        id: "1850147",
        name: "Tokyo",
        label: "Tokyo, Japan",
        latitude: 35.6895,
        longitude: 139.69171,
        timezone: "Asia/Tokyo",
        country: "Japan",
        countryCode: "JP",
        admin1: "Tokyo",
    },
];

function weatherCityById(id: string): WeatherCity | null {
    return weatherCities.find((city) => city.id === id) ?? null;
}

function matchingWeatherCity(location: WeatherLocationSettings): WeatherCity | null {
    if (location.id !== undefined) {
        return weatherCityById(location.id);
    }

    return weatherCities.find((city) => {
        return city.timezone === location.timezone
            && Math.abs(city.latitude - location.latitude) < 0.02
            && Math.abs(city.longitude - location.longitude) < 0.02;
    }) ?? null;
}

function weatherLocationFromCity(city: WeatherCity): WeatherLocationSettings {
    return {
        id: city.id,
        name: city.name,
        label: city.label,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
        country: city.country,
        countryCode: city.countryCode,
        admin1: city.admin1,
    };
}

export type { WeatherCity };
export {
    matchingWeatherCity,
    weatherCities,
    weatherCityById,
    weatherLocationFromCity,
};
