import type {
    QrAlign,
    QrDirection,
    QrFontFamily,
    QrFontWeight,
    QrPreset,
    QrWidgetSettings,
} from "../types/boardTypes.ts";

const qrPresets: readonly QrPreset[] = ["classic", "split"];
const defaultQrPadding = 24;
const defaultQrTitleSpacing = 12;
const defaultQrFontSize = 22;
const defaultQrTitleFontSize = 32;
const defaultQrFontWeight: QrFontWeight = 500;
const defaultQrTitleFontWeight: QrFontWeight = 600;

function qrPresetLabel(preset: QrPreset): string {
    if (preset === "split") {
        return "Split";
    }

    return "Classic";
}

function resolveQrDirection(settings: QrWidgetSettings): QrDirection {
    if (settings.direction === "ltr" || settings.direction === "rtl" || settings.direction === "auto") {
        return settings.direction;
    }

    return "auto";
}

function resolveQrAlign(settings: QrWidgetSettings): QrAlign {
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

function resolveQrPadding(settings: QrWidgetSettings): number {
    return settings.padding ?? defaultQrPadding;
}

function resolveQrTitleSpacing(settings: QrWidgetSettings): number {
    return settings.titleSpacing ?? defaultQrTitleSpacing;
}

function resolveQrFontSize(settings: QrWidgetSettings): number {
    return settings.fontSize ?? defaultQrFontSize;
}

function resolveQrTitleFontSize(settings: QrWidgetSettings): number {
    return settings.titleFontSize ?? defaultQrTitleFontSize;
}

function resolveQrFontFamily(settings: QrWidgetSettings): QrFontFamily {
    return settings.fontFamily ?? "sans";
}

function resolveQrTitleFontFamily(settings: QrWidgetSettings): QrFontFamily {
    return settings.titleFontFamily ?? resolveQrFontFamily(settings);
}

function resolveQrFontWeight(settings: QrWidgetSettings): QrFontWeight {
    return settings.fontWeight ?? defaultQrFontWeight;
}

function resolveQrTitleFontWeight(settings: QrWidgetSettings): QrFontWeight {
    return settings.titleFontWeight ?? defaultQrTitleFontWeight;
}

export {
    defaultQrFontSize,
    defaultQrPadding,
    defaultQrTitleFontSize,
    defaultQrTitleSpacing,
    qrPresetLabel,
    qrPresets,
    resolveQrAlign,
    resolveQrDirection,
    resolveQrFontFamily,
    resolveQrFontSize,
    resolveQrFontWeight,
    resolveQrPadding,
    resolveQrTitleFontFamily,
    resolveQrTitleFontSize,
    resolveQrTitleFontWeight,
    resolveQrTitleSpacing,
};
