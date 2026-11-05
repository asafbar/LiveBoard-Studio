import type {
    CountdownAlign,
    CountdownDirection,
    CountdownFontFamily,
    CountdownFontWeight,
    CountdownPreset,
    CountdownWidgetSettings,
} from "../types/boardTypes.ts";
import type { CountdownRemaining } from "./countdownTime.ts";

const countdownPresets: readonly CountdownPreset[] = ["digital", "minimal"];
const defaultCountdownPadding = 24;
const defaultCountdownTitleSpacing = 12;
const defaultCountdownFontSize = 72;
const defaultCountdownTitleFontSize = 28;
const defaultCountdownFontWeight: CountdownFontWeight = 600;
const defaultCountdownTitleFontWeight: CountdownFontWeight = 600;

function countdownPresetLabel(preset: CountdownPreset): string {
    if (preset === "minimal") {
        return "Minimal";
    }

    return "Digital";
}

function resolveCountdownDirection(settings: CountdownWidgetSettings): CountdownDirection {
    if (settings.direction === "ltr" || settings.direction === "rtl" || settings.direction === "auto") {
        return settings.direction;
    }

    return "auto";
}

function resolveCountdownAlign(settings: CountdownWidgetSettings): CountdownAlign {
    if (
        settings.align === "start"
        || settings.align === "center"
        || settings.align === "end"
        || settings.align === "left"
        || settings.align === "right"
    ) {
        return settings.align;
    }

    return "center";
}

function resolveCountdownPadding(settings: CountdownWidgetSettings): number {
    return settings.padding ?? defaultCountdownPadding;
}

function resolveCountdownTitleSpacing(settings: CountdownWidgetSettings): number {
    return settings.titleSpacing ?? defaultCountdownTitleSpacing;
}

function resolveCountdownFontSize(settings: CountdownWidgetSettings): number {
    return settings.fontSize ?? defaultCountdownFontSize;
}

function resolveCountdownTitleFontSize(settings: CountdownWidgetSettings): number {
    return settings.titleFontSize ?? defaultCountdownTitleFontSize;
}

function resolveCountdownFontFamily(settings: CountdownWidgetSettings): CountdownFontFamily {
    return settings.fontFamily ?? "sans";
}

function resolveCountdownTitleFontFamily(settings: CountdownWidgetSettings): CountdownFontFamily {
    return settings.titleFontFamily ?? resolveCountdownFontFamily(settings);
}

function resolveCountdownFontWeight(settings: CountdownWidgetSettings): CountdownFontWeight {
    return settings.fontWeight ?? defaultCountdownFontWeight;
}

function resolveCountdownTitleFontWeight(settings: CountdownWidgetSettings): CountdownFontWeight {
    return settings.titleFontWeight ?? defaultCountdownTitleFontWeight;
}

function countdownUnitLabel(unit: "days" | "hours" | "minutes" | "seconds", direction: CountdownDirection): string {
    const hebrew = direction === "rtl";

    if (unit === "days") {
        return hebrew ? "ימים" : "Days";
    }

    if (unit === "hours") {
        return hebrew ? "שעות" : "Hours";
    }

    if (unit === "minutes") {
        return hebrew ? "דקות" : "Minutes";
    }

    return hebrew ? "שניות" : "Seconds";
}

function countdownCompletionText(settings: CountdownWidgetSettings): string {
    const message = settings.completionMessage?.trim() ?? "";

    if (message.length > 0) {
        return message;
    }

    return resolveCountdownDirection(settings) === "rtl" ? "הסתיים" : "Complete";
}

function formatCountdownValue(value: number): string {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

    if (safe < 100) {
        return String(safe).padStart(2, "0");
    }

    return String(safe);
}

function countdownSummary(settings: CountdownWidgetSettings, remaining: CountdownRemaining): string {
    if (remaining.completed) {
        return countdownCompletionText(settings);
    }

    const direction = resolveCountdownDirection(settings);
    const parts: string[] = [];

    if (settings.showDays) {
        parts.push(`${remaining.days} ${countdownUnitLabel("days", direction)}`);
    }

    if (settings.showHours) {
        parts.push(`${remaining.hours} ${countdownUnitLabel("hours", direction)}`);
    }

    if (settings.showMinutes) {
        parts.push(`${remaining.minutes} ${countdownUnitLabel("minutes", direction)}`);
    }

    if (settings.showSeconds) {
        parts.push(`${remaining.seconds} ${countdownUnitLabel("seconds", direction)}`);
    }

    return parts.join(" ");
}

export {
    countdownCompletionText,
    countdownPresetLabel,
    countdownPresets,
    countdownSummary,
    countdownUnitLabel,
    defaultCountdownFontSize,
    defaultCountdownPadding,
    defaultCountdownTitleFontSize,
    defaultCountdownTitleSpacing,
    formatCountdownValue,
    resolveCountdownAlign,
    resolveCountdownDirection,
    resolveCountdownFontFamily,
    resolveCountdownFontSize,
    resolveCountdownFontWeight,
    resolveCountdownPadding,
    resolveCountdownTitleFontFamily,
    resolveCountdownTitleFontSize,
    resolveCountdownTitleFontWeight,
    resolveCountdownTitleSpacing,
};
