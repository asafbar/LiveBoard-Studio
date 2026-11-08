import type { WidgetType } from "../boards/types/boardTypes.ts";
import {
    boardPointFromClient,
    pointerIsInsideStage,
    type BoardPoint,
    type StageBox,
} from "../boards/boardCoordinates.ts";
import { defaultWidgetSize, placeWidgetAtPoint } from "./createWidget.ts";

type ComponentDrop = {
    point: BoardPoint;
    layout: ReturnType<typeof placeWidgetAtPoint>;
};

function componentDropLayout(
    type: WidgetType,
    boardWidth: number,
    boardHeight: number,
    clientX: number,
    clientY: number,
    stage: StageBox | null,
): ComponentDrop | null {
    if (stage === null || !pointerIsInsideStage(clientX, clientY, stage)) {
        return null;
    }

    const point = boardPointFromClient(clientX, clientY, stage, boardWidth, boardHeight);

    return {
        point,
        layout: placeWidgetAtPoint(boardWidth, boardHeight, defaultWidgetSize(type), point),
    };
}

function editorStageBox(): StageBox | null {
    const stage = document.querySelector("[data-board-stage='editor']");

    if (!(stage instanceof HTMLElement)) {
        return null;
    }

    const rect = stage.getBoundingClientRect();

    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
    };
}

export type { ComponentDrop };
export { componentDropLayout, editorStageBox };
