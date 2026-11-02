const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const shortHexColorPattern = /^#([0-9a-fA-F]{3})$/;
const rgbColorPattern = /^rgba?\(\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)$/;
const srgbColorPattern = /^color\(srgb\s+([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+%?)(?:\s*\/\s*([0-9.]+%?))?\)$/;
const colorPickerFallback = "#000000";

export function normalizeCssColor(value: string): string | null {
    const color = value.trim();

    if (color.length === 0 || !isSupportedCssColor(color)) {
        return null;
    }

    return color;
}

export function hexColorInputValue(color: string): string {
    return colorInputHex(color);
}

export function colorInputHex(color: string): string {
    const normalized = color.trim();
    const expanded = expandHexColor(normalized);

    if (expanded !== null) {
        return expanded;
    }

    return resolveComputedHex(normalized) ?? colorPickerFallback;
}

function expandHexColor(color: string): string | null {
    if (hexColorPattern.test(color)) {
        return color.toLowerCase();
    }

    const shortHex = shortHexColorPattern.exec(color);

    if (shortHex === null) {
        return null;
    }

    const digits = shortHex[1] ?? "";

    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`.toLowerCase();
}

function resolveComputedHex(color: string): string | null {
    if (typeof document === "undefined" || !isSupportedCssColor(color)) {
        return null;
    }

    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.color = color;
    document.body.appendChild(probe);
    const computed = window.getComputedStyle(probe).color;
    probe.remove();

    return hexFromComputedColor(computed);
}

function hexFromComputedColor(color: string): string | null {
    const value = color.trim();
    const rgbMatch = rgbColorPattern.exec(value);
    const srgbMatch = srgbColorPattern.exec(value);
    const match = rgbMatch ?? srgbMatch;

    if (match === null) {
        return null;
    }

    const readChannel = srgbMatch === null ? colorChannel : srgbChannel;
    const red = readChannel(match[1]);
    const green = readChannel(match[2]);
    const blue = readChannel(match[3]);
    const alpha = match[4] === undefined ? 1 : alphaChannel(match[4]);

    if (red === null || green === null || blue === null || alpha === null || alpha <= 0) {
        return null;
    }

    return rgbToHex(
        Math.round(red * alpha + 255 * (1 - alpha)),
        Math.round(green * alpha + 255 * (1 - alpha)),
        Math.round(blue * alpha + 255 * (1 - alpha)),
    );
}

function srgbChannel(value: string | undefined): number | null {
    if (value === undefined) {
        return null;
    }

    if (value.endsWith("%")) {
        return colorChannel(value);
    }

    const channel = Number(value);

    if (!Number.isFinite(channel)) {
        return null;
    }

    return Math.max(0, Math.min(255, Math.round(channel * 255)));
}

function colorChannel(value: string | undefined): number | null {
    if (value === undefined) {
        return null;
    }

    if (value.endsWith("%")) {
        const percent = Number(value.slice(0, -1));

        if (!Number.isFinite(percent)) {
            return null;
        }

        return Math.max(0, Math.min(255, Math.round((percent / 100) * 255)));
    }

    const channel = Number(value);

    if (!Number.isFinite(channel)) {
        return null;
    }

    return Math.max(0, Math.min(255, Math.round(channel)));
}

function alphaChannel(value: string): number | null {
    if (value.endsWith("%")) {
        const percent = Number(value.slice(0, -1));

        if (!Number.isFinite(percent)) {
            return null;
        }

        return Math.max(0, Math.min(1, percent / 100));
    }

    const alpha = Number(value);

    if (!Number.isFinite(alpha)) {
        return null;
    }

    return Math.max(0, Math.min(1, alpha));
}

function rgbToHex(red: number, green: number, blue: number): string {
    return `#${byteToHex(red)}${byteToHex(green)}${byteToHex(blue)}`;
}

function byteToHex(value: number): string {
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function isSupportedCssColor(color: string): boolean {
    return typeof CSS !== "undefined" && CSS.supports("color", color);
}
