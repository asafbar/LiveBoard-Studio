import type {
    Board,
    WeatherAlign,
    WeatherDirection,
    WeatherFontFamily,
    WeatherFontWeight,
    WeatherLayoutName,
    WeatherPreset,
    WeatherRefreshMinutes,
    WeatherTemperatureUnit,
    WeatherWidgetSettings,
} from "../boards/types/boardTypes.ts";
import { normalizeCssColor } from "./cssColor.ts";
import { radiusIsInRange } from "./imageSettings.ts";

type WeatherSettingsPatch = Omit<
    Partial<WeatherWidgetSettings>,
    "preset" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity" | "padding" | "titleSpacing" | "titleColor" | "titleAlign" | "direction" | "align" | "fontFamily" | "fontSize" | "fontWeight" | "titleFontFamily" | "titleFontSize" | "titleFontWeight"
> & {
    preset?: WeatherPreset | null;
    backgroundOpacity?: number | null;
    textOpacity?: number | null;
    titleOpacity?: number | null;
    accentOpacity?: number | null;
    padding?: number | null;
    titleSpacing?: number | null;
    titleColor?: string | null;
    titleAlign?: WeatherAlign | null;
    direction?: WeatherDirection | null;
    align?: WeatherAlign | null;
    fontFamily?: WeatherFontFamily | null;
    fontSize?: number | null;
    fontWeight?: WeatherFontWeight | null;
    titleFontFamily?: WeatherFontFamily | null;
    titleFontSize?: number | null;
    titleFontWeight?: WeatherFontWeight | null;
};

const weatherUnits: WeatherTemperatureUnit[] = ["celsius", "fahrenheit"];
const weatherLayouts: WeatherLayoutName[] = ["compact", "expanded"];
const weatherFontFamilies: WeatherFontFamily[] = ["sans", "serif", "mono"];
const weatherFontWeights: WeatherFontWeight[] = [400, 500, 600, 700];
const weatherDirections: WeatherDirection[] = ["auto", "ltr", "rtl"];
const weatherAlignments: WeatherAlign[] = ["left", "center", "right", "start", "end"];
const maximumWeatherTitleLength = 80;
const minimumWeatherFontSize = 12;
const maximumWeatherFontSize = 96;
const minimumWeatherTitleFontSize = 12;
const maximumWeatherTitleFontSize = 72;
const maximumWeatherOpacity = 100;
const maximumWeatherPadding = 48;
const maximumWeatherTitleSpacing = 64;
const weatherRefreshChoices: readonly WeatherRefreshMinutes[] = [10, 30, 60, 1440];

function applyWeatherSettings(
    settings: WeatherWidgetSettings,
    patch: WeatherSettingsPatch,
): WeatherWidgetSettings {
    const nextSettings: WeatherWidgetSettings = {
        ...settings,
        location: { ...settings.location },
    };

    if (patch.location !== undefined && isWeatherLocation(patch.location)) {
        nextSettings.location = { ...patch.location };
    }

    if (patch.unit !== undefined && weatherUnits.includes(patch.unit)) {
        nextSettings.unit = patch.unit;
    }

    if (patch.layout !== undefined && weatherLayouts.includes(patch.layout)) {
        nextSettings.layout = patch.layout;
    }

    if (typeof patch.showFeelsLike === "boolean") {
        nextSettings.showFeelsLike = patch.showFeelsLike;
    }

    if (typeof patch.showForecast === "boolean") {
        nextSettings.showForecast = patch.showForecast;
    }

    if (typeof patch.title === "string") {
        const title = patch.title.trim();

        if (title === "") {
            delete nextSettings.title;
        } else if (title.length <= maximumWeatherTitleLength) {
            nextSettings.title = title;
        }
    }

    assignChoice(nextSettings, "preset", patch.preset, ["classic", "minimal", "horizontal", "forecast"]);
    assignChoice(nextSettings, "direction", patch.direction, weatherDirections);
    assignChoice(nextSettings, "align", patch.align, weatherAlignments);
    assignChoice(nextSettings, "titleAlign", patch.titleAlign, weatherAlignments);
    assignChoice(nextSettings, "fontFamily", patch.fontFamily, weatherFontFamilies);
    assignChoice(nextSettings, "titleFontFamily", patch.titleFontFamily, weatherFontFamilies);
    assignChoice(nextSettings, "fontWeight", patch.fontWeight, weatherFontWeights);
    assignChoice(nextSettings, "titleFontWeight", patch.titleFontWeight, weatherFontWeights);
    assignChoice(nextSettings, "refreshIntervalMinutes", patch.refreshIntervalMinutes, weatherRefreshChoices);
    assignInteger(nextSettings, "fontSize", patch.fontSize, minimumWeatherFontSize, maximumWeatherFontSize);
    assignInteger(nextSettings, "titleSpacing", patch.titleSpacing, 0, maximumWeatherTitleSpacing);
    assignInteger(nextSettings, "titleFontSize", patch.titleFontSize, minimumWeatherTitleFontSize, maximumWeatherTitleFontSize);
    assignInteger(nextSettings, "backgroundOpacity", patch.backgroundOpacity, 0, maximumWeatherOpacity);
    assignInteger(nextSettings, "textOpacity", patch.textOpacity, 0, maximumWeatherOpacity);
    assignInteger(nextSettings, "titleOpacity", patch.titleOpacity, 0, maximumWeatherOpacity);
    assignInteger(nextSettings, "accentOpacity", patch.accentOpacity, 0, maximumWeatherOpacity);
    assignInteger(nextSettings, "padding", patch.padding, 0, maximumWeatherPadding);
    assignColor(nextSettings, "backgroundColor", patch.backgroundColor);
    assignColor(nextSettings, "textColor", patch.textColor);
    assignColor(nextSettings, "accentColor", patch.accentColor);
    assignOptionalColor(nextSettings, "titleColor", patch.titleColor);

    if (typeof patch.borderRadius === "number" && radiusIsInRange(patch.borderRadius)) {
        nextSettings.borderRadius = patch.borderRadius;
    }

    return nextSettings;
}

function updateWeatherSettings(
    board: Board,
    widgetId: string,
    patch: WeatherSettingsPatch,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "weather") {
                return widget;
            }

            return {
                ...widget,
                settings: applyWeatherSettings(widget.settings, patch),
            };
        }),
    };
}

function isWeatherLocation(location: WeatherWidgetSettings["location"]): boolean {
    if (location.id !== undefined && !/^[0-9]{1,12}$/.test(location.id)) {
        return false;
    }

    return location.name.trim() !== ""
        && location.label.trim() !== ""
        && Number.isFinite(location.latitude)
        && location.latitude >= -90
        && location.latitude <= 90
        && Number.isFinite(location.longitude)
        && location.longitude >= -180
        && location.longitude <= 180
        && isWeatherTimeZone(location.timezone);
}

function isWeatherTimeZone(timeZone: string): boolean {
    return /^(?:UTC|GMT|[A-Za-z][A-Za-z0-9+-]*(?:\/[A-Za-z0-9+_-]+){1,2})$/.test(timeZone)
        && timeZone.length <= 80;
}

function assignChoice<Key extends "preset" | "direction" | "align" | "titleAlign" | "fontFamily" | "titleFontFamily" | "fontWeight" | "titleFontWeight" | "refreshIntervalMinutes">(
    settings: WeatherWidgetSettings,
    key: Key,
    value: WeatherWidgetSettings[Key] | null | undefined,
    allowed: readonly NonNullable<WeatherWidgetSettings[Key]>[],
): void {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (allowed.includes(value)) {
        settings[key] = value;
    }
}

function assignInteger(
    settings: WeatherWidgetSettings,
    key: "fontSize" | "titleFontSize" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity" | "padding" | "titleSpacing",
    value: number | null | undefined,
    minimum: number,
    maximum: number,
): void {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (Number.isInteger(value) && value >= minimum && value <= maximum) {
        settings[key] = value;
    }
}

function assignColor(
    settings: WeatherWidgetSettings,
    key: "backgroundColor" | "textColor" | "accentColor",
    value: string | undefined,
): void {
    if (typeof value !== "string") {
        return;
    }

    const color = normalizeCssColor(value);

    if (color !== null) {
        settings[key] = color;
    }
}

function assignOptionalColor(
    settings: WeatherWidgetSettings,
    key: "titleColor",
    value: string | null | undefined,
): void {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    const color = normalizeCssColor(value);

    if (color !== null) {
        settings[key] = color;
    }
}

export type { WeatherSettingsPatch };
export {
    applyWeatherSettings,
    maximumWeatherFontSize,
    maximumWeatherOpacity,
    maximumWeatherPadding,
    maximumWeatherTitleFontSize,
    maximumWeatherTitleLength,
    minimumWeatherFontSize,
    minimumWeatherTitleFontSize,
    updateWeatherSettings,
    weatherAlignments,
    weatherDirections,
    weatherFontFamilies,
    weatherFontWeights,
    weatherLayouts,
    weatherUnits,
};
