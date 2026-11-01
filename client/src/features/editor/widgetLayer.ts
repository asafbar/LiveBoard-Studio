import type { Board, Widget } from "../boards/types/boardTypes.ts";

const maxLayerNameLength = 80;

type WidgetLayerChange = {
    layerName?: string | null;
    visible?: boolean;
    locked?: boolean;
};

function isWidgetVisible(widget: Widget): boolean {
    return widget.visible !== false;
}

function isWidgetLocked(widget: Widget): boolean {
    return widget.locked === true;
}

function normalizedLayerName(value: string): string | null {
    if (hasControlCharacter(value)) {
        return null;
    }

    const trimmed = value.trim();

    if (trimmed.length > maxLayerNameLength) {
        return null;
    }

    return trimmed === "" ? null : trimmed;
}

function layerNameIsValid(value: string): boolean {
    if (hasControlCharacter(value)) {
        return false;
    }

    return value.trim().length <= maxLayerNameLength;
}

function applyWidgetLayerChange(board: Board, widgetId: string, change: WidgetLayerChange): Board {
    let changed = false;
    const widgets = board.widgets.map((widget) => {
        if (widget.id !== widgetId) {
            return widget;
        }

        const nextWidget: Widget = { ...widget };
        let widgetChanged = false;

        if (change.layerName !== undefined) {
            const currentName = widget.layerName ?? null;

            if (change.layerName !== currentName) {
                widgetChanged = true;

                if (change.layerName === null) {
                    delete nextWidget.layerName;
                } else {
                    nextWidget.layerName = change.layerName;
                }
            }
        }

        if (change.visible !== undefined && isWidgetVisible(widget) !== change.visible) {
            widgetChanged = true;
            nextWidget.visible = change.visible;
        }

        if (change.locked !== undefined && isWidgetLocked(widget) !== change.locked) {
            widgetChanged = true;
            nextWidget.locked = change.locked;
        }

        if (!widgetChanged) {
            return widget;
        }

        changed = true;
        return nextWidget;
    });

    if (!changed) {
        return board;
    }

    return {
        ...board,
        widgets,
    };
}

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

export type { WidgetLayerChange };
export {
    applyWidgetLayerChange,
    isWidgetLocked,
    isWidgetVisible,
    layerNameIsValid,
    maxLayerNameLength,
    normalizedLayerName,
};
