import type {
    WeatherAlign,
    WeatherPreset,
    WeatherWidgetSettings,
} from "../types/boardTypes.ts";

type WeatherVisual = WeatherPreset | "expanded";

type WeatherPhysicalAlign = "left" | "center" | "right";

type WeatherFrameSize = {
    width: number;
    height: number;
};

type WeatherPresetFit = {
    fits: boolean;
    message: string | null;
};

const weatherPresets: readonly WeatherPreset[] = ["classic", "minimal", "horizontal", "forecast"];

const defaultWeatherPaddingEm = 0.7;
const classicTitleGapEm = 0.4;
const minimalTitleGapEm = 0.2;
const horizontalTitleGapEm = 0.85;
const defaultTitleSizeEm = 0.82;
const minimalTitleSizeEm = 0.95;
const maximumWeatherTitleSpacing = 64;

const horizontalForecastMinWidth = 680;

const presetMinimums: Record<WeatherPreset, WeatherFrameSize> = {
    classic: { width: 320, height: 180 },
    minimal: { width: 240, height: 140 },
    horizontal: { width: 560, height: 140 },
    forecast: { width: 420, height: 280 },
};

const rtlScriptPattern = /[\u0590-\u08FF]/;

function weatherVisual(settings: WeatherWidgetSettings): WeatherVisual {
    if (settings.preset !== undefined) {
        return settings.preset;
    }

    return settings.layout === "expanded" ? "expanded" : "classic";
}

function resolveWeatherDirection(settings: WeatherWidgetSettings): "ltr" | "rtl" {
    if (settings.direction === "ltr" || settings.direction === "rtl") {
        return settings.direction;
    }

    if (settings.direction === "auto") {
        return scriptDirection(directionSample(settings));
    }

    return "ltr";
}

function resolveWeatherAlign(align: WeatherAlign | undefined): WeatherPhysicalAlign {
    if (align === "center") {
        return "center";
    }

    if (align === "right" || align === "end") {
        return "right";
    }

    return "left";
}

function resolveTitleAlign(settings: WeatherWidgetSettings): WeatherPhysicalAlign {
    if (settings.titleAlign !== undefined) {
        return resolveWeatherAlign(settings.titleAlign);
    }

    return resolveWeatherAlign(settings.align);
}

function weatherPresetFit(
    settings: WeatherWidgetSettings,
    frame: WeatherFrameSize,
): WeatherPresetFit {
    if (settings.preset === undefined) {
        return { fits: true, message: null };
    }

    const minimum = presetMinimums[settings.preset];

    if (frame.width >= minimum.width && frame.height >= minimum.height) {
        if (settings.preset === "forecast" && settings.showForecast === false) {
            return {
                fits: true,
                message: "Show forecast is off, so this design does not include the three days.",
            };
        }

        if (
            settings.preset === "horizontal"
            && settings.showForecast
            && frame.width < horizontalForecastMinWidth
        ) {
            return {
                fits: true,
                message: `The three-day forecast joins this row when the widget is at least ${horizontalForecastMinWidth} wide.`,
            };
        }

        return { fits: true, message: null };
    }

    return {
        fits: false,
        message: `${presetLabel(settings.preset)} needs at least ${minimum.width} by ${minimum.height}. Resize the widget so the content stays readable.`,
    };
}

function presetLabel(preset: WeatherPreset): string {
    if (preset === "classic") {
        return "Classic";
    }

    if (preset === "minimal") {
        return "Minimal";
    }

    if (preset === "horizontal") {
        return "Horizontal";
    }

    return "Forecast";
}

function directionSample(settings: WeatherWidgetSettings): string {
    const title = settings.title?.trim() ?? "";

    if (title !== "") {
        return title;
    }

    return `${settings.location.name} ${settings.location.label}`;
}

function scriptDirection(value: string): "ltr" | "rtl" {
    return rtlScriptPattern.test(value) ? "rtl" : "ltr";
}

function effectiveWeatherPadding(settings: WeatherWidgetSettings): number {
    if (settings.padding !== undefined) {
        return settings.padding;
    }

    return Math.round(contentFontSize(settings) * defaultWeatherPaddingEm);
}

function effectiveTitleSpacing(settings: WeatherWidgetSettings): number {
    if (settings.titleSpacing !== undefined) {
        return settings.titleSpacing;
    }

    const visual = weatherVisual(settings);
    const baseSize = contentFontSize(settings);

    if (visual === "minimal") {
        return Math.round(baseSize * minimalTitleGapEm);
    }

    if (visual === "horizontal") {
        return Math.round(baseSize * horizontalTitleGapEm);
    }

    if (visual === "forecast") {
        return 0;
    }

    return Math.round(baseSize * classicTitleGapEm);
}

function effectiveContentFontSize(settings: WeatherWidgetSettings): number {
    return contentFontSize(settings);
}

function effectiveTitleFontSize(settings: WeatherWidgetSettings): number {
    if (settings.titleFontSize !== undefined) {
        return settings.titleFontSize;
    }

    const ratio = weatherVisual(settings) === "minimal" ? minimalTitleSizeEm : defaultTitleSizeEm;

    return Math.round(contentFontSize(settings) * ratio);
}

function contentFontSize(settings: WeatherWidgetSettings): number {
    return settings.fontSize ?? (weatherVisual(settings) === "expanded" ? 32 : 26);
}

export type { WeatherFrameSize, WeatherPhysicalAlign, WeatherPresetFit, WeatherVisual };
export {
    effectiveContentFontSize,
    effectiveTitleFontSize,
    effectiveTitleSpacing,
    effectiveWeatherPadding,
    maximumWeatherTitleSpacing,
    horizontalForecastMinWidth,
    presetLabel,
    presetMinimums,
    resolveTitleAlign,
    resolveWeatherAlign,
    resolveWeatherDirection,
    weatherPresetFit,
    weatherPresets,
    weatherVisual,
};
