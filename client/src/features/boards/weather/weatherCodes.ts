type WeatherIconName =
    | "clear"
    | "mainly-clear"
    | "partly-cloudy"
    | "cloudy"
    | "fog"
    | "drizzle"
    | "rain"
    | "freezing-rain"
    | "snow"
    | "showers"
    | "snow-showers"
    | "thunder"
    | "unknown";

type WeatherCondition = {
    icon: WeatherIconName;
    label: string;
};

const conditions: Record<number, WeatherCondition> = {
    0: { icon: "clear", label: "Clear" },
    1: { icon: "mainly-clear", label: "Mainly clear" },
    2: { icon: "partly-cloudy", label: "Partly cloudy" },
    3: { icon: "cloudy", label: "Overcast" },
    45: { icon: "fog", label: "Fog" },
    48: { icon: "fog", label: "Rime fog" },
    51: { icon: "drizzle", label: "Light drizzle" },
    53: { icon: "drizzle", label: "Drizzle" },
    55: { icon: "drizzle", label: "Dense drizzle" },
    56: { icon: "freezing-rain", label: "Freezing drizzle" },
    57: { icon: "freezing-rain", label: "Dense freezing drizzle" },
    61: { icon: "rain", label: "Light rain" },
    63: { icon: "rain", label: "Rain" },
    65: { icon: "rain", label: "Heavy rain" },
    66: { icon: "freezing-rain", label: "Freezing rain" },
    67: { icon: "freezing-rain", label: "Heavy freezing rain" },
    71: { icon: "snow", label: "Light snow" },
    73: { icon: "snow", label: "Snow" },
    75: { icon: "snow", label: "Heavy snow" },
    77: { icon: "snow", label: "Snow grains" },
    80: { icon: "showers", label: "Light showers" },
    81: { icon: "showers", label: "Showers" },
    82: { icon: "showers", label: "Heavy showers" },
    85: { icon: "snow-showers", label: "Snow showers" },
    86: { icon: "snow-showers", label: "Heavy snow showers" },
    95: { icon: "thunder", label: "Thunderstorm" },
    96: { icon: "thunder", label: "Thunderstorm with hail" },
    99: { icon: "thunder", label: "Thunderstorm with heavy hail" },
};

const unknownCondition: WeatherCondition = {
    icon: "unknown",
    label: "Conditions unavailable",
};

function weatherCondition(code: number): WeatherCondition {
    return conditions[code] ?? unknownCondition;
}

export type { WeatherCondition, WeatherIconName };
export { weatherCondition };
