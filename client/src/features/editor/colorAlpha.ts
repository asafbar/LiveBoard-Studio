import { backgroundLayerOpacity, effectiveOpacityPercent } from "../boards/news/newsColor.ts";

function paintColor(color: string, opacity: number | undefined): string {
    if (opacity === undefined || effectiveOpacityPercent(opacity) === 100) {
        return color;
    }

    return `color-mix(in srgb, ${color} ${effectiveOpacityPercent(opacity)}%, transparent)`;
}

function opacityVariable(opacity: number | undefined): string | undefined {
    if (opacity === undefined || effectiveOpacityPercent(opacity) === 100) {
        return undefined;
    }

    return String(effectiveOpacityPercent(opacity) / 100);
}

function alphaPercentFromHex(value: string): { color: string; opacity: number } | null {
    const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/.exec(value.trim());

    if (match === null) {
        return null;
    }

    const alpha = Number.parseInt(match[2] ?? "", 16);

    if (!Number.isFinite(alpha)) {
        return null;
    }

    return {
        color: `#${(match[1] ?? "").toLowerCase()}`,
        opacity: Math.round((alpha / 255) * 100),
    };
}

export {
    alphaPercentFromHex,
    backgroundLayerOpacity,
    effectiveOpacityPercent,
    opacityVariable,
    paintColor,
};

type ColorOpacityPatch = {
    backgroundOpacity?: number | null;
    textOpacity?: number | null;
    titleOpacity?: number | null;
    accentOpacity?: number | null;
};

type SettingsWithColorOpacity<T> = Omit<Partial<T>, keyof ColorOpacityPatch> & ColorOpacityPatch;

export type { ColorOpacityPatch, SettingsWithColorOpacity };
