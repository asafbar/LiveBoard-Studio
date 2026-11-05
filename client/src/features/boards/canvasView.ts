import type { Board, Widget, WidgetLayout } from "./types/boardTypes.ts";
import { widgetExtendsOutsideBoard } from "./boardOrientation.ts";
import type { StageBox } from "./boardCoordinates.ts";

type ZoomMode = "manual" | "fit-board" | "fit-workspace";

type ScrollIntent = "none" | "preserve-center" | "center-board" | "center-content";

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type ContentBounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

type WorkspaceGeometry = {
    scale: number;
    workspaceLeft: number;
    workspaceTop: number;
    workspaceWidth: number;
    workspaceHeight: number;
    sizerWidth: number;
    sizerHeight: number;
    boardLeft: number;
    boardTop: number;
    boardWidth: number;
    boardHeight: number;
};

type CanvasZoomState = {
    mode: ZoomMode;
    manualScale: number;
    fitScale: number;
    scroll: ScrollIntent;
    token: number;
};

type CanvasZoomAction =
    | {
        type: "refit";
        viewportWidth: number;
        viewportHeight: number;
        boardWidth: number;
        boardHeight: number;
        bounds: ContentBounds;
    }
    | { type: "zoom-in" }
    | { type: "zoom-out" }
    | { type: "reset" }
    | {
        type: "fit-board";
        viewportWidth: number;
        viewportHeight: number;
        boardWidth: number;
        boardHeight: number;
    }
    | {
        type: "fit-workspace";
        viewportWidth: number;
        viewportHeight: number;
        bounds: ContentBounds;
    }
    | { type: "scroll-applied" };

type ScrollPosition = {
    scrollLeft: number;
    scrollTop: number;
};

const minimumManualZoom = 0.25;
const maximumManualZoom = 2;
const zoomStops = [0.25, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];
const fitMargin = 32;
const workspacePadding = 48;
const minimumWidgetWidth = 100;
const minimumWidgetHeight = 60;

const initialCanvasZoomState: CanvasZoomState = {
    mode: "fit-board",
    manualScale: 1,
    fitScale: 1,
    scroll: "center-board",
    token: 0,
};

function activeZoomScale(state: CanvasZoomState): number {
    return state.mode === "manual" ? state.manualScale : state.fitScale;
}

function contentBounds(
    boardWidth: number,
    boardHeight: number,
    layouts: readonly WidgetLayout[],
): ContentBounds {
    let left = 0;
    let top = 0;
    let right = boardWidth;
    let bottom = boardHeight;

    layouts.forEach((layout) => {
        left = Math.min(left, layout.x);
        top = Math.min(top, layout.y);
        right = Math.max(right, layout.x + layout.width);
        bottom = Math.max(bottom, layout.y + layout.height);
    });

    return { left, top, right, bottom };
}

function visibleLayouts(widgets: readonly Widget[]): WidgetLayout[] {
    return widgets
        .filter((widget) => widget.visible !== false)
        .map((widget) => widget.layout);
}

function fitScaleFor(
    viewportWidth: number,
    viewportHeight: number,
    contentWidth: number,
    contentHeight: number,
): number {
    if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
        return 1;
    }

    const availableWidth = Math.max(1, viewportWidth - (fitMargin * 2));
    const availableHeight = Math.max(1, viewportHeight - (fitMargin * 2));

    return Math.min(availableWidth / contentWidth, availableHeight / contentHeight, maximumManualZoom);
}

function fitBoardScale(
    viewportWidth: number,
    viewportHeight: number,
    boardWidth: number,
    boardHeight: number,
): number {
    return fitScaleFor(viewportWidth, viewportHeight, boardWidth, boardHeight);
}

function fitWorkspaceScale(
    viewportWidth: number,
    viewportHeight: number,
    bounds: ContentBounds,
): number {
    return fitScaleFor(
        viewportWidth,
        viewportHeight,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
    );
}

function nextZoomStop(scale: number, direction: 1 | -1): number {
    if (direction > 0) {
        return zoomStops.find((stop) => stop > scale + 0.001) ?? maximumManualZoom;
    }

    const next = [...zoomStops].reverse().find((stop) => stop < scale - 0.001);

    if (next !== undefined) {
        return next;
    }

    return scale < minimumManualZoom ? scale : minimumManualZoom;
}

function workspaceGeometry(
    boardWidth: number,
    boardHeight: number,
    bounds: ContentBounds,
    scale: number,
    viewportWidth: number,
    viewportHeight: number,
): WorkspaceGeometry {
    const safeScale = scale > 0 ? scale : 1;
    const workspaceWidth = ((bounds.right - bounds.left) + (workspacePadding * 2)) * safeScale;
    const workspaceHeight = ((bounds.bottom - bounds.top) + (workspacePadding * 2)) * safeScale;
    // Half a viewport of spare space on every side lets Fit scroll the board
    // or the workspace to the middle, even when outside widgets make one side longer.
    const workspaceLeft = viewportWidth / 2;
    const workspaceTop = viewportHeight / 2;

    return {
        scale: safeScale,
        workspaceLeft,
        workspaceTop,
        workspaceWidth,
        workspaceHeight,
        sizerWidth: workspaceWidth + viewportWidth,
        sizerHeight: workspaceHeight + viewportHeight,
        boardLeft: (workspacePadding - bounds.left) * safeScale,
        boardTop: (workspacePadding - bounds.top) * safeScale,
        boardWidth,
        boardHeight,
    };
}

function boardScreenOrigin(geometry: WorkspaceGeometry): { x: number; y: number } {
    return {
        x: geometry.workspaceLeft + geometry.boardLeft,
        y: geometry.workspaceTop + geometry.boardTop,
    };
}

function scrollToCenterTarget(
    targetLeft: number,
    targetTop: number,
    targetWidth: number,
    targetHeight: number,
    viewportWidth: number,
    viewportHeight: number,
): ScrollPosition {
    return {
        scrollLeft: targetLeft + (targetWidth / 2) - (viewportWidth / 2),
        scrollTop: targetTop + (targetHeight / 2) - (viewportHeight / 2),
    };
}

function scrollToCenterBoard(geometry: WorkspaceGeometry, viewportWidth: number, viewportHeight: number): ScrollPosition {
    const origin = boardScreenOrigin(geometry);

    return scrollToCenterTarget(
        origin.x,
        origin.y,
        geometry.boardWidth * geometry.scale,
        geometry.boardHeight * geometry.scale,
        viewportWidth,
        viewportHeight,
    );
}

function scrollToCenterWorkspace(geometry: WorkspaceGeometry, viewportWidth: number, viewportHeight: number): ScrollPosition {
    return scrollToCenterTarget(
        geometry.workspaceLeft,
        geometry.workspaceTop,
        geometry.workspaceWidth,
        geometry.workspaceHeight,
        viewportWidth,
        viewportHeight,
    );
}

function scrollPreservingCenter(
    previous: WorkspaceGeometry,
    next: WorkspaceGeometry,
    scrollLeft: number,
    scrollTop: number,
    viewportWidth: number,
    viewportHeight: number,
): ScrollPosition {
    const pointX = scrollLeft + (viewportWidth / 2) - previous.workspaceLeft;
    const pointY = scrollTop + (viewportHeight / 2) - previous.workspaceTop;
    const fractionX = previous.workspaceWidth === 0 ? 0.5 : pointX / previous.workspaceWidth;
    const fractionY = previous.workspaceHeight === 0 ? 0.5 : pointY / previous.workspaceHeight;

    return {
        scrollLeft: (fractionX * next.workspaceWidth) - (viewportWidth / 2) + next.workspaceLeft,
        scrollTop: (fractionY * next.workspaceHeight) - (viewportHeight / 2) + next.workspaceTop,
    };
}

function scrollKeepingBoard(
    scrollLeft: number,
    scrollTop: number,
    previous: WorkspaceGeometry,
    next: WorkspaceGeometry,
): ScrollPosition {
    const previousOrigin = boardScreenOrigin(previous);
    const nextOrigin = boardScreenOrigin(next);

    return {
        scrollLeft: scrollLeft + (nextOrigin.x - previousOrigin.x),
        scrollTop: scrollTop + (nextOrigin.y - previousOrigin.y),
    };
}

function stageBoxForWorkspace(
    geometry: WorkspaceGeometry,
    scrollLeft: number,
    scrollTop: number,
): StageBox {
    const origin = boardScreenOrigin(geometry);

    return {
        left: origin.x - scrollLeft,
        top: origin.y - scrollTop,
        width: geometry.boardWidth * geometry.scale,
        height: geometry.boardHeight * geometry.scale,
    };
}

function reduceCanvasZoom(state: CanvasZoomState, action: CanvasZoomAction): CanvasZoomState {
    switch (action.type) {
        case "refit": {
            if (state.mode === "manual") {
                if (state.token > 0) {
                    return state;
                }

                return {
                    ...state,
                    token: 1,
                    scroll: "center-board",
                };
            }

            const fitScale = state.mode === "fit-board"
                ? fitBoardScale(action.viewportWidth, action.viewportHeight, action.boardWidth, action.boardHeight)
                : fitWorkspaceScale(action.viewportWidth, action.viewportHeight, action.bounds);

            return {
                ...state,
                fitScale,
                scroll: state.mode === "fit-board" ? "center-board" : "center-content",
                token: state.token + 1,
            };
        }
        case "zoom-in":
        case "zoom-out":
        case "reset": {
            const current = activeZoomScale(state);
            const manualScale = action.type === "reset"
                ? 1
                : nextZoomStop(current, action.type === "zoom-in" ? 1 : -1);

            return {
                ...state,
                mode: "manual",
                manualScale,
                scroll: "preserve-center",
                token: state.token + 1,
            };
        }
        case "fit-board":
            return {
                ...state,
                mode: "fit-board",
                fitScale: fitBoardScale(
                    action.viewportWidth,
                    action.viewportHeight,
                    action.boardWidth,
                    action.boardHeight,
                ),
                scroll: "center-board",
                token: state.token + 1,
            };
        case "fit-workspace":
            return {
                ...state,
                mode: "fit-workspace",
                fitScale: fitWorkspaceScale(action.viewportWidth, action.viewportHeight, action.bounds),
                scroll: "center-content",
                token: state.token + 1,
            };
        case "scroll-applied":
            if (state.scroll === "none") {
                return state;
            }

            return {
                ...state,
                scroll: "none",
            };
        default:
            return state;
    }
}

function containedDragPosition(
    layout: WidgetLayout,
    boardWidth: number,
    boardHeight: number,
): { x: number; y: number } {
    const maximumX = Math.max(0, boardWidth - layout.width);
    const maximumY = Math.max(0, boardHeight - layout.height);

    return {
        x: Math.min(maximumX, Math.max(0, layout.x)),
        y: Math.min(maximumY, Math.max(0, layout.y)),
    };
}

// Outside widgets follow the pointer in every direction. Clamping starts only
// after the current rectangle is fully on the board, including mid-drag.
function constrainDragPosition(
    current: WidgetLayout,
    nextX: number,
    nextY: number,
    boardWidth: number,
    boardHeight: number,
): { x: number; y: number } {
    const proposed = {
        ...current,
        x: Math.round(nextX),
        y: Math.round(nextY),
    };

    if (
        widgetExceedsBoard(current, boardWidth, boardHeight)
        || widgetExtendsOutsideBoard(current, boardWidth, boardHeight)
    ) {
        return {
            x: proposed.x,
            y: proposed.y,
        };
    }

    return containedDragPosition(proposed, boardWidth, boardHeight);
}

function layoutWithinOriginOverflow(
    origin: WidgetLayout,
    proposed: WidgetLayout,
    boardWidth: number,
    boardHeight: number,
): WidgetLayout {
    let x = Math.round(proposed.x);
    let y = Math.round(proposed.y);
    let width = Math.max(minimumWidgetWidth, Math.round(proposed.width));
    let height = Math.max(minimumWidgetHeight, Math.round(proposed.height));
    const maxLeft = Math.max(0, -origin.x);
    const maxTop = Math.max(0, -origin.y);
    const maxRight = Math.max(0, origin.x + origin.width - boardWidth);
    const maxBottom = Math.max(0, origin.y + origin.height - boardHeight);

    if (-x > maxLeft) {
        x = -maxLeft;
    }

    if (-y > maxTop) {
        y = -maxTop;
    }

    if (x + width > boardWidth + maxRight) {
        width = boardWidth + maxRight - x;
    }

    if (y + height > boardHeight + maxBottom) {
        height = boardHeight + maxBottom - y;
    }

    if (width < minimumWidgetWidth || height < minimumWidgetHeight) {
        return { ...origin };
    }

    return { x, y, width, height };
}

function resizeOutsideLayout(
    origin: WidgetLayout,
    corner: ResizeCorner,
    deltaX: number,
    deltaY: number,
    boardWidth: number,
    boardHeight: number,
): WidgetLayout {
    const movesLeft = corner === "nw" || corner === "sw";
    const movesTop = corner === "nw" || corner === "ne";
    let left = origin.x + (movesLeft ? deltaX : 0);
    let top = origin.y + (movesTop ? deltaY : 0);
    let right = origin.x + origin.width + (movesLeft ? 0 : deltaX);
    let bottom = origin.y + origin.height + (movesTop ? 0 : deltaY);

    if (right - left < minimumWidgetWidth) {
        if (movesLeft) {
            left = right - minimumWidgetWidth;
        } else {
            right = left + minimumWidgetWidth;
        }
    }

    if (bottom - top < minimumWidgetHeight) {
        if (movesTop) {
            top = bottom - minimumWidgetHeight;
        } else {
            bottom = top + minimumWidgetHeight;
        }
    }

    return layoutWithinOriginOverflow(origin, {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    }, boardWidth, boardHeight);
}

function movedInsideLayout(
    layout: WidgetLayout,
    boardWidth: number,
    boardHeight: number,
): { x: number; y: number } | null {
    if (layout.width > boardWidth || layout.height > boardHeight) {
        return null;
    }

    const x = Math.min(Math.max(Math.round(layout.x), 0), boardWidth - layout.width);
    const y = Math.min(Math.max(Math.round(layout.y), 0), boardHeight - layout.height);

    if (x === layout.x && y === layout.y) {
        return null;
    }

    return { x, y };
}

function fittedInsideLayout(
    layout: WidgetLayout,
    boardWidth: number,
    boardHeight: number,
): WidgetLayout | null {
    if (layout.width <= boardWidth && layout.height <= boardHeight) {
        return null;
    }

    const scale = Math.min(boardWidth / layout.width, boardHeight / layout.height);
    let width = Math.min(boardWidth, Math.max(minimumWidgetWidth, Math.round(layout.width * scale)));
    let height = Math.min(boardHeight, Math.max(minimumWidgetHeight, Math.round(layout.height * scale)));
    width = Math.min(width, boardWidth);
    height = Math.min(height, boardHeight);

    return {
        x: Math.round((boardWidth - width) / 2),
        y: Math.round((boardHeight - height) / 2),
        width,
        height,
    };
}

function moveWidgetInside(board: Board, widgetId: string): Board {
    const widgets = board.widgets.map((widget) => {
        if (widget.id !== widgetId) {
            return widget;
        }

        const moved = movedInsideLayout(widget.layout, board.width, board.height);

        if (moved === null) {
            return widget;
        }

        return {
            ...widget,
            layout: {
                ...widget.layout,
                ...moved,
            },
        };
    });

    if (widgets.every((widget, index) => widget === board.widgets[index])) {
        return board;
    }

    return {
        ...board,
        widgets,
    };
}

function fitWidgetInside(board: Board, widgetId: string): Board {
    const widgets = board.widgets.map((widget) => {
        if (widget.id !== widgetId) {
            return widget;
        }

        const fitted = fittedInsideLayout(widget.layout, board.width, board.height);

        if (fitted === null) {
            return widget;
        }

        return {
            ...widget,
            layout: fitted,
        };
    });

    if (widgets.every((widget, index) => widget === board.widgets[index])) {
        return board;
    }

    return {
        ...board,
        widgets,
    };
}

function moveAllInside(board: Board): Board {
    const widgets = board.widgets.map((widget) => {
        const moved = movedInsideLayout(widget.layout, board.width, board.height);

        if (moved === null) {
            return widget;
        }

        return {
            ...widget,
            layout: {
                ...widget.layout,
                ...moved,
            },
        };
    });

    if (widgets.every((widget, index) => widget === board.widgets[index])) {
        return board;
    }

    return {
        ...board,
        widgets,
    };
}

function widgetCanMoveInside(layout: WidgetLayout, boardWidth: number, boardHeight: number): boolean {
    return widgetExtendsOutsideBoard(layout, boardWidth, boardHeight)
        && layout.width <= boardWidth
        && layout.height <= boardHeight;
}

function widgetExceedsBoard(layout: WidgetLayout, boardWidth: number, boardHeight: number): boolean {
    return layout.width > boardWidth || layout.height > boardHeight;
}

export type { CanvasZoomState, ContentBounds, ScrollIntent, WorkspaceGeometry, ZoomMode };
export {
    activeZoomScale,
    constrainDragPosition,
    contentBounds,
    fitBoardScale,
    fitMargin,
    fitWidgetInside,
    fitWorkspaceScale,
    fittedInsideLayout,
    initialCanvasZoomState,
    layoutWithinOriginOverflow,
    maximumManualZoom,
    minimumManualZoom,
    moveAllInside,
    moveWidgetInside,
    movedInsideLayout,
    nextZoomStop,
    reduceCanvasZoom,
    resizeOutsideLayout,
    scrollKeepingBoard,
    scrollPreservingCenter,
    scrollToCenterBoard,
    scrollToCenterWorkspace,
    stageBoxForWorkspace,
    visibleLayouts,
    widgetCanMoveInside,
    widgetExceedsBoard,
    workspaceGeometry,
    workspacePadding,
};
