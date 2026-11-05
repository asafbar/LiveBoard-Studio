import type {
    Board,
    QrAlign,
    QrDirection,
    QrFontFamily,
    QrFontWeight,
    QrPreset,
    QrWidgetSettings,
} from "../boards/types/boardTypes.ts";
import {
    maximumQrContentDraftLength,
    opaqueQrHex,
    qrColorsAreReadable,
    qrContentHasIllegalControl,
} from "../boards/qr/qrContent.ts";
import { normalizeCssColor } from "./cssColor.ts";
import { readEditableText } from "./editableText.ts";
import { radiusIsInRange } from "./imageSettings.ts";

type QrSettingsPatch = Omit<
    Partial<QrWidgetSettings>,
    "preset" | "direction" | "align" | "titleAlign" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "padding" | "titleSpacing" | "titleColor" | "fontFamily" | "fontSize" | "fontWeight" | "titleFontFamily" | "titleFontSize" | "titleFontWeight" | "title" | "subtitle"
> & {
    preset?: QrPreset | null;
    direction?: QrDirection | null;
    align?: QrAlign | null;
    titleAlign?: QrAlign | null;
    backgroundOpacity?: number | null;
    textOpacity?: number | null;
    titleOpacity?: number | null;
    padding?: number | null;
    titleSpacing?: number | null;
    titleColor?: string | null;
    fontFamily?: QrFontFamily | null;
    fontSize?: number | null;
    fontWeight?: QrFontWeight | null;
    titleFontFamily?: QrFontFamily | null;
    titleFontSize?: number | null;
    titleFontWeight?: QrFontWeight | null;
    title?: string | null;
    subtitle?: string | null;
};

const qrDirections: readonly QrDirection[] = ["auto", "ltr", "rtl"];
const qrAlignments: readonly QrAlign[] = ["start", "center", "end", "left", "right"];
const qrFontFamilies: readonly QrFontFamily[] = ["sans", "serif", "mono"];
const qrFontWeights: readonly QrFontWeight[] = [400, 500, 600, 700];
const minimumQrFontSize = 12;
const maximumQrFontSize = 72;
const minimumQrTitleFontSize = 12;
const maximumQrTitleFontSize = 72;
const maximumQrPadding = 48;
const maximumQrTitleSpacing = 64;
const maximumQrTitleLength = 80;
const maximumQrSubtitleLength = 120;

function updateQrSettings(board: Board, widgetId: string, patch: QrSettingsPatch): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "qr") {
                return widget;
            }

            return {
                ...widget,
                settings: applyQrSettings(widget.settings, patch),
            };
        }),
    };
}

function applyQrSettings(settings: QrWidgetSettings, patch: QrSettingsPatch): QrWidgetSettings {
    const next: QrWidgetSettings = { ...settings };

    assignContent(next, patch.content);
    assignText(next, "title", patch.title, maximumQrTitleLength);
    assignText(next, "subtitle", patch.subtitle, maximumQrSubtitleLength);
    assignChoice(next, "preset", patch.preset, ["classic", "split"]);
    assignChoice(next, "direction", patch.direction, qrDirections);
    assignChoice(next, "align", patch.align, qrAlignments);
    assignChoice(next, "titleAlign", patch.titleAlign, qrAlignments);
    assignChoice(next, "fontFamily", patch.fontFamily, qrFontFamilies);
    assignChoice(next, "titleFontFamily", patch.titleFontFamily, qrFontFamilies);
    assignChoice(next, "fontWeight", patch.fontWeight, qrFontWeights);
    assignChoice(next, "titleFontWeight", patch.titleFontWeight, qrFontWeights);
    assignInteger(next, "fontSize", patch.fontSize, minimumQrFontSize, maximumQrFontSize);
    assignInteger(next, "titleFontSize", patch.titleFontSize, minimumQrTitleFontSize, maximumQrTitleFontSize);
    assignInteger(next, "padding", patch.padding, 0, maximumQrPadding);
    assignInteger(next, "titleSpacing", patch.titleSpacing, 0, maximumQrTitleSpacing);
    assignInteger(next, "backgroundOpacity", patch.backgroundOpacity, 0, 100);
    assignInteger(next, "textOpacity", patch.textOpacity, 0, 100);
    assignInteger(next, "titleOpacity", patch.titleOpacity, 0, 100);
    assignQrColor(next, "foregroundColor", patch.foregroundColor);
    assignQrColor(next, "codeBackgroundColor", patch.codeBackgroundColor);
    assignColor(next, "backgroundColor", patch.backgroundColor);
    assignColor(next, "textColor", patch.textColor);
    assignColor(next, "titleColor", patch.titleColor);
    assignRadius(next, patch.borderRadius);

    return next;
}

function assignContent(settings: QrWidgetSettings, value: string | undefined) {
    if (value === undefined || qrContentHasIllegalControl(value) || value.length > maximumQrContentDraftLength) {
        return;
    }

    settings.content = value;
}

function assignText(
    settings: QrWidgetSettings,
    key: "title" | "subtitle",
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

function assignChoice<Key extends "preset" | "direction" | "align" | "titleAlign" | "fontFamily" | "fontWeight" | "titleFontFamily" | "titleFontWeight">(
    settings: QrWidgetSettings,
    key: Key,
    value: QrWidgetSettings[Key] | null | undefined,
    allowed: readonly NonNullable<QrWidgetSettings[Key]>[],
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
    settings: QrWidgetSettings,
    key: "fontSize" | "titleFontSize" | "padding" | "titleSpacing" | "backgroundOpacity" | "textOpacity" | "titleOpacity",
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

function assignQrColor(
    settings: QrWidgetSettings,
    key: "foregroundColor" | "codeBackgroundColor",
    value: string | undefined,
) {
    if (value === undefined) {
        return;
    }

    const color = opaqueQrHex(value);

    if (color === null) {
        return;
    }

    const foreground = key === "foregroundColor" ? color : settings.foregroundColor;
    const background = key === "codeBackgroundColor" ? color : settings.codeBackgroundColor;

    if (!qrColorsAreReadable(foreground, background)) {
        return;
    }

    settings[key] = color;
}

function assignColor(
    settings: QrWidgetSettings,
    key: "backgroundColor" | "textColor" | "titleColor",
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

function assignRadius(settings: QrWidgetSettings, value: number | undefined) {
    if (value === undefined || !radiusIsInRange(value)) {
        return;
    }

    settings.borderRadius = value;
}

export type { QrSettingsPatch };
export {
    applyQrSettings,
    maximumQrFontSize,
    maximumQrPadding,
    maximumQrSubtitleLength,
    maximumQrTitleFontSize,
    maximumQrTitleLength,
    maximumQrTitleSpacing,
    minimumQrFontSize,
    minimumQrTitleFontSize,
    updateQrSettings,
};
