const dragStartDistance = 3;

type BoardPoint = {
    x: number;
    y: number;
};

type StageBox = {
    left: number;
    top: number;
    width: number;
    height: number;
};

// The stage is a logical board scaled with CSS. Its bounding rect already
// includes that scale, the scroll position, and any canvas offset.
function boardPointFromClient(
    clientX: number,
    clientY: number,
    stage: StageBox,
    boardWidth: number,
    boardHeight: number,
): BoardPoint {
    const scaleX = stage.width === 0 ? 1 : boardWidth / stage.width;
    const scaleY = stage.height === 0 ? 1 : boardHeight / stage.height;

    return {
        x: (clientX - stage.left) * scaleX,
        y: (clientY - stage.top) * scaleY,
    };
}

function pointerIsInsideStage(clientX: number, clientY: number, stage: StageBox): boolean {
    return stage.width > 0
        && stage.height > 0
        && clientX >= stage.left
        && clientY >= stage.top
        && clientX <= stage.left + stage.width
        && clientY <= stage.top + stage.height;
}

function screenRectForLayout(
    stage: StageBox,
    boardWidth: number,
    boardHeight: number,
    layout: { x: number; y: number; width: number; height: number },
): StageBox {
    const scaleX = boardWidth === 0 ? 1 : stage.width / boardWidth;
    const scaleY = boardHeight === 0 ? 1 : stage.height / boardHeight;

    return {
        left: stage.left + (layout.x * scaleX),
        top: stage.top + (layout.y * scaleY),
        width: layout.width * scaleX,
        height: layout.height * scaleY,
    };
}

export type { BoardPoint, StageBox };
export {
    boardPointFromClient,
    dragStartDistance,
    pointerIsInsideStage,
    screenRectForLayout,
};
