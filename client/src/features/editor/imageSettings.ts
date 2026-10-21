import type { ImageWidgetSettings } from "../boards/types/boardTypes.ts";

export const imageObjectFitOptions: ImageWidgetSettings["objectFit"][] = ["cover", "contain"];

export const minimumImageBorderRadius = 0;
export const maximumImageBorderRadius = 240;

const imageSourceSchemes = ["http", "https", "javascript", "data", "blob", "file", "vbscript"];

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function isIncompleteImageScheme(value: string): boolean {
    const lower = value.toLowerCase();

    return imageSourceSchemes.some((scheme) => scheme.startsWith(lower));
}

export function normalizeImageSource(value: string): string | null {
    const source = value.trim();

    if (source.length === 0) {
        return "";
    }

    if (hasControlCharacter(source) || source.startsWith("//") || source.includes("\\")) {
        return null;
    }

    const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(source);

    if (schemeMatch !== null) {
        const scheme = schemeMatch[1].toLowerCase();

        if (scheme !== "http" && scheme !== "https") {
            return null;
        }

        try {
            const url = new URL(source);

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return null;
            }
        } catch {
            return null;
        }

        return source;
    }

    if (isIncompleteImageScheme(source)) {
        return null;
    }

    return source;
}

export function parseImageBorderRadius(value: string): number | null {
    const trimmed = value.trim();

    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
        return null;
    }

    const radius = Number(trimmed);

    if (!Number.isFinite(radius) || !radiusIsInRange(radius)) {
        return null;
    }

    return radius;
}

export function radiusIsInRange(radius: number): boolean {
    return Number.isFinite(radius)
        && radius >= minimumImageBorderRadius
        && radius <= maximumImageBorderRadius;
}
