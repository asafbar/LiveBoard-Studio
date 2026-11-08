import assert from "node:assert/strict";
import test from "node:test";
import type { Board, Widget } from "./types/boardTypes.ts";
import { boardPointFromClient } from "./boardCoordinates.ts";
import { componentDropLayout } from "../editor/boardPlacement.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "../editor/draftHistory.ts";
import {
    boardOrientation,
    boardSizeForOrientation,
    fittedBoardSize,
    landscapeBoardSize,
    portraitBoardSize,
    widgetsOutsideBoard,
} from "./boardOrientation.ts";

const landscapeBoard: Board = {
    id: "board-1",
    name: "Existing board",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

function textWidget(id: string, x: number, y: number, width = 480, height = 100): Widget {
    return {
        id,
        type: "text",
        layout: { x, y, width, height },
        settings: { text: "Hello", tone: "default", size: "title" },
    };
}

test("keeps existing 1920 by 1080 boards landscape and uses 1080 by 1920 for portrait", () => {
    assert.equal(boardOrientation(landscapeBoard.width, landscapeBoard.height), "landscape");
    assert.deepEqual(boardSizeForOrientation("landscape"), landscapeBoardSize);
    assert.deepEqual(boardSizeForOrientation("portrait"), portraitBoardSize);
    assert.equal(boardOrientation(1080, 1920), "portrait");
});

test("warns only for widgets that leave the new board and leaves the others in place", () => {
    const inside = textWidget("inside", 40, 40);
    const outside = textWidget("outside", 1400, 40, 480, 100);
    const portrait = boardSizeForOrientation("portrait");
    const outsideWidgets = widgetsOutsideBoard([inside, outside], portrait.width, portrait.height);

    assert.deepEqual(outsideWidgets.map((widget) => widget.id), ["outside"]);
    assert.deepEqual(outside.layout, { x: 1400, y: 40, width: 480, height: 100 });
    assert.deepEqual(
        widgetsOutsideBoard([inside, outside], landscapeBoardSize.width, landscapeBoardSize.height),
        [],
    );
});

test("undo restores the previous orientation without moving widgets", () => {
    const widget = textWidget("text-1", 1400, 40);
    const present = { ...landscapeBoard, widgets: [widget] };
    const portrait = boardSizeForOrientation("portrait");
    const changed = {
        ...present,
        width: portrait.width,
        height: portrait.height,
    };
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, changed);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);

    assert.equal(undone?.present.width, 1920);
    assert.equal(undone?.present.height, 1080);
    assert.deepEqual(undone?.present.widgets[0]?.layout, widget.layout);
    assert.equal(redone?.present.width, 1080);
    assert.equal(redone?.present.height, 1920);
    assert.deepEqual(redone?.present.widgets[0]?.layout, widget.layout);
});

test("scales each orientation uniformly and converts portrait pointer coordinates", () => {
    const landscapeFit = fittedBoardSize(1280, 720, 1920, 1080);
    const portraitFit = fittedBoardSize(1920, 1080, 1080, 1920);
    const portraitStage = { left: 40, top: 20, width: 540, height: 960 };

    assert.equal(landscapeFit.scale, 720 / 1080);
    assert.equal(landscapeFit.width / landscapeFit.height, 16 / 9);
    assert.equal(portraitFit.scale, 1080 / 1920);
    assert.equal(portraitFit.height / portraitFit.width, 16 / 9);
    assert.deepEqual(
        boardPointFromClient(40 + 100, 20 + 50, portraitStage, 1080, 1920),
        { x: 200, y: 100 },
    );

    const drop = componentDropLayout(
        "qr",
        portraitBoardSize.width,
        portraitBoardSize.height,
        portraitStage.left + portraitStage.width / 2,
        portraitStage.top + portraitStage.height / 2,
        portraitStage,
    );

    assert.equal(drop?.layout.width, 440);
    assert.equal(drop?.layout.height, 560);
    assert.equal(drop?.layout.x, Math.round((1080 - 440) / 2));
    assert.equal(drop?.layout.y, Math.round((1920 - 560) / 2));
});
