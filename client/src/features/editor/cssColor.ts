const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const colorPickerFallback = "#000000";

export function normalizeCssColor(value: string): string | null {
    const color = value.trim();

    if (color.length === 0 || !isSupportedCssColor(color)) {
        return null;
    }

    return color;
}

export function hexColorInputValue(color: string): string {
    if (hexColorPattern.test(color)) {
        return color.toLowerCase();
    }

    return colorPickerFallback;
}

function isSupportedCssColor(color: string): boolean {
    return typeof CSS !== "undefined" && CSS.supports("color", color);
}
