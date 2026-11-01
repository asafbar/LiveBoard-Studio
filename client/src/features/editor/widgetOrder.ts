import type { Board, Widget } from "../boards/types/boardTypes.ts";

type LayerMove = "forward" | "backward" | "front" | "back";

type LayerDropPlacement = "before" | "after";

function moveWidgetLayer(board: Board, widgetId: string, move: LayerMove): Board {
    const index = board.widgets.findIndex((widget) => widget.id === widgetId);

    if (index < 0) {
        return board;
    }

    const nextIndex = layerDestination(index, board.widgets.length, move);

    if (nextIndex === index) {
        return board;
    }

    const widgets = board.widgets.slice();
    const [widget] = widgets.splice(index, 1);

    if (widget === undefined) {
        return board;
    }

    widgets.splice(nextIndex, 0, widget);

    return {
        ...board,
        widgets,
    };
}

function layerDestination(index: number, length: number, move: LayerMove): number {
    const front = length - 1;

    switch (move) {
        case "forward":
            return Math.min(front, index + 1);
        case "backward":
            return Math.max(0, index - 1);
        case "front":
            return front;
        case "back":
            return 0;
    }
}

function reorderWidgetLayer(
    board: Board,
    widgetId: string,
    targetId: string,
    placement: LayerDropPlacement,
): Board {
    const from = board.widgets.findIndex((widget) => widget.id === widgetId);
    const target = board.widgets.findIndex((widget) => widget.id === targetId);

    if (from < 0 || target < 0) {
        return board;
    }

    let destination = placement === "before" ? target + 1 : target;

    if (from < destination) {
        destination -= 1;
    }

    if (destination === from) {
        return board;
    }

    const widgets = board.widgets.slice();
    const [widget] = widgets.splice(from, 1);

    if (widget === undefined) {
        return board;
    }

    widgets.splice(destination, 0, widget);

    return {
        ...board,
        widgets,
    };
}

function widgetLayerIndex(widgets: readonly Widget[], widgetId: string | null): number {
    if (widgetId === null) {
        return -1;
    }

    return widgets.findIndex((widget) => widget.id === widgetId);
}

export type { LayerDropPlacement, LayerMove };
export { moveWidgetLayer, reorderWidgetLayer, widgetLayerIndex };
