const weatherAttributionText = "Weather data by Open-Meteo.com";
const weatherAttributionUrl = "https://open-meteo.com/";
const weatherRefreshMs = 10 * 60 * 1000;

function formatTemperature(value: number): string {
    if (!Number.isFinite(value)) {
        return "--";
    }

    const rounded = Math.round(value * 10) / 10;

    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function temperatureSuffix(unit: "celsius" | "fahrenheit"): string {
    return unit === "fahrenheit" ? "°F" : "°C";
}

function weekdayLabel(date: string): string {
    const parts = date.split("-").map((part) => Number(part));
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    if (year === undefined || month === undefined || day === undefined || parts.some((part) => !Number.isInteger(part))) {
        return date;
    }

    return new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export {
    formatTemperature,
    temperatureSuffix,
    weatherAttributionText,
    weatherAttributionUrl,
    weatherRefreshMs,
    weekdayLabel,
};
