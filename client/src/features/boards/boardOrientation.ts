import type { Widget } from "./types/boardTypes.ts";

type BoardOrientation = "landscape" | "portrait";

type BoardSize = {
    width: number;
    height: number;
};

const landscapeBoardSize: BoardSize = {
    width: 1920,
    height: 1080,
};

const portraitBoardSize: BoardSize = {
    width: 1080,
    height: 1920,
};

function boardSizeForOrientation(orientation: BoardOrientation): BoardSize {
    if (orientation === "portrait") {
        return portraitBoardSize;
    }

    return landscapeBoardSize;
}

function boardOrientation(width: number, height: number): BoardOrientation {
    if (height > width) {
        return "portrait";
    }

    return "landscape";
}

function widgetExtendsOutsideBoard(
    layout: { x: number; y: number; width: number; height: number },
    width: number,
    height: number,
): boolean {
    return layout.x < 0
        || layout.y < 0
        || layout.x + layout.width > width
        || layout.y + layout.height > height;
}

function widgetsOutsideBoard(widgets: readonly Widget[], width: number, height: number): Widget[] {
    return widgets.filter((widget) => widgetExtendsOutsideBoard(widget.layout, width, height));
}

// The frame uses the same fit as the board CSS: the largest uniform scale
// that stays inside the viewport.
function fittedBoardSize(
    viewportWidth: number,
    viewportHeight: number,
    boardWidth: number,
    boardHeight: number,
): { width: number; height: number; scale: number } {
    const scale = boardWidth === 0 || boardHeight === 0
        ? 1
        : Math.min(viewportWidth / boardWidth, viewportHeight / boardHeight);

    return {
        width: boardWidth * scale,
        height: boardHeight * scale,
        scale,
    };
}

export type { BoardOrientation, BoardSize };
export {
    boardOrientation,
    boardSizeForOrientation,
    fittedBoardSize,
    landscapeBoardSize,
    portraitBoardSize,
    widgetExtendsOutsideBoard,
    widgetsOutsideBoard,
};
