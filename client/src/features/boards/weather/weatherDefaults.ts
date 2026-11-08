import type { WeatherWidgetSettings } from "../types/boardTypes.ts";
import { weatherCityById, weatherLocationFromCity } from "./weatherCities.ts";

const nahariya = weatherCityById("294117");

if (nahariya === null) {
    throw new Error("Nahariya is missing from the weather city list.");
}

const nahariyaWeatherLocation = weatherLocationFromCity(nahariya);

const defaultWeatherSettings: WeatherWidgetSettings = {
    location: { ...nahariyaWeatherLocation },
    unit: "celsius",
    layout: "compact",
    showFeelsLike: true,
    showForecast: false,
    backgroundColor: "color-mix(in srgb, var(--canvas-board) 86%, var(--foreground))",
    textColor: "var(--foreground)",
    accentColor: "var(--cyan)",
    borderRadius: 24,
};

export { defaultWeatherSettings, nahariyaWeatherLocation };
