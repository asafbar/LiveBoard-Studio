import type {
    Board,
    CountdownAlign,
    CountdownDirection,
    CountdownFontFamily,
    CountdownFontWeight,
    CountdownPreset,
    CountdownWidgetSettings,
} from "../boards/types/boardTypes.ts";
import { countdownTimeZones, readWallTime } from "../boards/countdown/countdownTime.ts";
import { normalizeCssColor } from "./cssColor.ts";
import { readEditableText } from "./editableText.ts";
import { radiusIsInRange } from "./imageSettings.ts";

type CountdownSettingsPatch = Omit<
    Partial<CountdownWidgetSettings>,
    "preset" | "direction" | "align" | "titleAlign" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity" | "padding" | "titleSpacing" | "titleColor" | "fontFamily" | "fontSize" | "fontWeight" | "titleFontFamily" | "titleFontSize" | "titleFontWeight" | "completionMessage" | "title"
> & {
    preset?: CountdownPreset | null;
    direction?: CountdownDirection | null;
    align?: CountdownAlign | null;
    titleAlign?: CountdownAlign | null;
    backgroundOpacity?: number | null;
    textOpacity?: number | null;
    titleOpacity?: number | null;
    accentOpacity?: number | null;
    padding?: number | null;
    titleSpacing?: number | null;
    titleColor?: string | null;
    fontFamily?: CountdownFontFamily | null;
    fontSize?: number | null;
    fontWeight?: CountdownFontWeight | null;
    titleFontFamily?: CountdownFontFamily | null;
    titleFontSize?: number | null;
    titleFontWeight?: CountdownFontWeight | null;
    completionMessage?: string | null;
    title?: string | null;
};

const countdownDirections: readonly CountdownDirection[] = ["auto", "ltr", "rtl"];
const countdownAlignments: readonly CountdownAlign[] = ["start", "center", "end", "left", "right"];
const countdownFontFamilies: readonly CountdownFontFamily[] = ["sans", "serif", "mono"];
const countdownFontWeights: readonly CountdownFontWeight[] = [400, 500, 600, 700];
const minimumCountdownFontSize = 12;
const maximumCountdownFontSize = 96;
const minimumCountdownTitleFontSize = 12;
const maximumCountdownTitleFontSize = 72;
const maximumCountdownPadding = 48;
const maximumCountdownTitleSpacing = 64;
const maximumCountdownTitleLength = 80;
const maximumCountdownMessageLength = 120;

function updateCountdownSettings(board: Board, widgetId: string, patch: CountdownSettingsPatch): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "countdown") {
                return widget;
            }

            return {
                ...widget,
                settings: applyCountdownSettings(widget.settings, patch),
            };
        }),
    };
}

function applyCountdownSettings(
    settings: CountdownWidgetSettings,
    patch: CountdownSettingsPatch,
): CountdownWidgetSettings {
    const next: CountdownWidgetSettings = { ...settings };

    assignText(next, "title", patch.title, maximumCountdownTitleLength);
    assignText(next, "completionMessage", patch.completionMessage, maximumCountdownMessageLength);
    assignTarget(next, patch);
    assignChoice(next, "preset", patch.preset, ["digital", "minimal"]);
    assignChoice(next, "direction", patch.direction, countdownDirections);
    assignChoice(next, "align", patch.align, countdownAlignments);
    assignChoice(next, "titleAlign", patch.titleAlign, countdownAlignments);
    assignChoice(next, "fontFamily", patch.fontFamily, countdownFontFamilies);
    assignChoice(next, "titleFontFamily", patch.titleFontFamily, countdownFontFamilies);
    assignChoice(next, "fontWeight", patch.fontWeight, countdownFontWeights);
    assignChoice(next, "titleFontWeight", patch.titleFontWeight, countdownFontWeights);
    assignInteger(next, "fontSize", patch.fontSize, minimumCountdownFontSize, maximumCountdownFontSize);
    assignInteger(next, "titleFontSize", patch.titleFontSize, minimumCountdownTitleFontSize, maximumCountdownTitleFontSize);
    assignInteger(next, "padding", patch.padding, 0, maximumCountdownPadding);
    assignInteger(next, "titleSpacing", patch.titleSpacing, 0, maximumCountdownTitleSpacing);
    assignInteger(next, "backgroundOpacity", patch.backgroundOpacity, 0, 100);
    assignInteger(next, "textOpacity", patch.textOpacity, 0, 100);
    assignInteger(next, "titleOpacity", patch.titleOpacity, 0, 100);
    assignInteger(next, "accentOpacity", patch.accentOpacity, 0, 100);
    assignColor(next, "backgroundColor", patch.backgroundColor);
    assignColor(next, "textColor", patch.textColor);
    assignColor(next, "accentColor", patch.accentColor);
    assignColor(next, "titleColor", patch.titleColor);
    assignUnits(next, patch);
    assignRadius(next, patch.borderRadius);

    return next;
}

function assignTarget(settings: CountdownWidgetSettings, patch: CountdownSettingsPatch) {
    const targetDate = patch.targetDate ?? settings.targetDate;
    const targetTime = patch.targetTime ?? settings.targetTime;
    const timeZone = patch.timeZone ?? settings.timeZone;

    if (readWallTime(targetDate, targetTime) === null) {
        return;
    }

    if (!countdownTimeZones.some((zone) => zone === timeZone)) {
        return;
    }

    if (patch.targetDate !== undefined) {
        settings.targetDate = targetDate;
    }

    if (patch.targetTime !== undefined) {
        settings.targetTime = targetTime.length === 5 ? `${targetTime}:00` : targetTime;
    }

    if (patch.timeZone !== undefined) {
        settings.timeZone = timeZone;
    }
}

function assignUnits(settings: CountdownWidgetSettings, patch: CountdownSettingsPatch) {
    const showDays = patch.showDays ?? settings.showDays;
    const showHours = patch.showHours ?? settings.showHours;
    const showMinutes = patch.showMinutes ?? settings.showMinutes;
    const showSeconds = patch.showSeconds ?? settings.showSeconds;

    if (!showDays && !showHours && !showMinutes && !showSeconds) {
        return;
    }

    if (patch.showDays !== undefined) {
        settings.showDays = patch.showDays;
    }

    if (patch.showHours !== undefined) {
        settings.showHours = patch.showHours;
    }

    if (patch.showMinutes !== undefined) {
        settings.showMinutes = patch.showMinutes;
    }

    if (patch.showSeconds !== undefined) {
        settings.showSeconds = patch.showSeconds;
    }
}

function assignText(
    settings: CountdownWidgetSettings,
    key: "title" | "completionMessage",
    value: string | null | undefined,
    maximum: number,
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    const update = readEditableText(value, maximum);

    if (update.action === "keep") {
        return;
    }

    if (update.action === "clear") {
        delete settings[key];
        return;
    }

    settings[key] = update.text;
}

function assignChoice<Key extends "preset" | "direction" | "align" | "titleAlign" | "fontFamily" | "fontSize" | "fontWeight" | "titleFontFamily" | "titleFontSize" | "titleFontWeight">(
    settings: CountdownWidgetSettings,
    key: Key,
    value: CountdownWidgetSettings[Key] | null | undefined,
    allowed: readonly NonNullable<CountdownWidgetSettings[Key]>[],
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (!allowed.some((item) => item === value)) {
        return;
    }

    settings[key] = value;
}

function assignInteger(
    settings: CountdownWidgetSettings,
    key: "fontSize" | "titleFontSize" | "padding" | "titleSpacing" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity",
    value: number | null | undefined,
    minimum: number,
    maximum: number,
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        return;
    }

    settings[key] = value;
}

function assignColor(
    settings: CountdownWidgetSettings,
    key: "backgroundColor" | "textColor" | "accentColor" | "titleColor",
    value: string | null | undefined,
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        if (key === "titleColor") {
            delete settings.titleColor;
        }

        return;
    }

    const color = normalizeCssColor(value);

    if (color === null) {
        return;
    }

    settings[key] = color;
}

function assignRadius(settings: CountdownWidgetSettings, value: number | undefined) {
    if (value === undefined || !radiusIsInRange(value)) {
        return;
    }

    settings.borderRadius = value;
}

export type { CountdownSettingsPatch };
export {
    applyCountdownSettings,
    maximumCountdownFontSize,
    maximumCountdownMessageLength,
    maximumCountdownPadding,
    maximumCountdownTitleFontSize,
    maximumCountdownTitleLength,
    maximumCountdownTitleSpacing,
    minimumCountdownFontSize,
    minimumCountdownTitleFontSize,
    updateCountdownSettings,
};
