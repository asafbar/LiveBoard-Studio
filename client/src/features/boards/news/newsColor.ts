function effectiveOpacityPercent(value: number | undefined): number {
    if (!Number.isInteger(value)) {
        return 100;
    }

    return Math.min(100, Math.max(0, value ?? 100));
}

function backgroundLayerOpacity(value: number | undefined): number {
    return effectiveOpacityPercent(value) / 100;
}

export { backgroundLayerOpacity, effectiveOpacityPercent };
