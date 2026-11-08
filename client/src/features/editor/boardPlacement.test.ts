import assert from "node:assert/strict";
import test from "node:test";
import type { Board } from "../boards/types/boardTypes.ts";
import {
    boardPointFromClient,
    pointerIsInsideStage,
    screenRectForLayout,
} from "../boards/boardCoordinates.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "./draftHistory.ts";
import { componentDropLayout } from "./boardPlacement.ts";
import { createWidget } from "./createWidget.ts";

const board: Board = {
    id: "board-1",
    name: "Placement fixture",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

const halfScaleStage = { left: 120, top: 40, width: 960, height: 540 };
const fullScaleStage = { left: 120, top: 40, width: 1920, height: 1080 };
const doubleScaleStage = { left: 80, top: 20, width: 3840, height: 2160 };

test("converts pointer position at half, full, and double zoom", () => {
    assert.deepEqual(
        boardPointFromClient(120 + 100, 40 + 50, halfScaleStage, 1920, 1080),
        { x: 200, y: 100 },
    );
    assert.deepEqual(
        boardPointFromClient(120 + 100, 40 + 50, fullScaleStage, 1920, 1080),
        { x: 100, y: 50 },
    );
    assert.deepEqual(
        boardPointFromClient(80 + 100, 20 + 50, doubleScaleStage, 1920, 1080),
        { x: 50, y: 25 },
    );
});

test("keeps the board point stable when the scaled stage is scrolled", () => {
    const scrolled = { left: -200, top: -80, width: 960, height: 540 };
    const centerX = scrolled.left + (scrolled.width / 2);
    const centerY = scrolled.top + (scrolled.height / 2);

    assert.deepEqual(
        boardPointFromClient(centerX, centerY, scrolled, 1920, 1080),
        { x: 960, y: 540 },
    );
});

test("creates a centered widget for a valid drop and rejects a drop outside the canvas", () => {
    const inside = componentDropLayout("text", board.width, board.height, 120 + 480, 40 + 270, halfScaleStage);
    const outside = componentDropLayout("text", board.width, board.height, 10, 10, halfScaleStage);
    const missingStage = componentDropLayout("qr", board.width, board.height, 600, 300, null);

    assert.equal(pointerIsInsideStage(10, 10, halfScaleStage), false);
    assert.equal(outside, null);
    assert.equal(missingStage, null);
    assert.deepEqual(inside?.point, { x: 960, y: 540 });
    assert.deepEqual(inside?.layout, { x: 720, y: 490, width: 480, height: 100 });
});

test("centers the drop and clamps it to the board without moving existing widgets", () => {
    const existing = createWidget("clock", board);
    const populated = { ...board, widgets: [existing] };
    const edge = componentDropLayout("text", board.width, board.height, halfScaleStage.left, halfScaleStage.top, halfScaleStage);
    const dropped = createWidget("qr", populated, { x: 100, y: 80 });
    const clicked = createWidget("qr", populated);

    assert.deepEqual(edge?.layout, { x: 0, y: 0, width: 480, height: 100 });
    assert.equal(dropped.type, "qr");
    assert.equal(dropped.layout.x, 0);
    assert.equal(dropped.layout.y, 0);
    assert.equal(dropped.layout.width, 440);
    assert.equal(dropped.layout.height, 560);
    assert.equal(dropped.type === "qr" ? dropped.settings.content : "", "https://example.com");
    assert.equal("svg" in (dropped.type === "qr" ? dropped.settings : {}), false);
    assert.deepEqual(populated.widgets[0]?.layout, existing.layout);
    assert.equal(clicked.layout.width, 440);
    assert.equal(clicked.layout.height, 560);
    assert.equal(clicked.layout.x >= 0 && clicked.layout.x + clicked.layout.width <= board.width, true);
    assert.notEqual(clicked.layout.x, dropped.layout.x);
});

test("click-to-add keeps automatic placement and a drop records one undo step", () => {
    const clicked = createWidget("text", board);
    const dropped = createWidget("text", board, { x: 960, y: 540 });
    const present = { ...board, widgets: [clicked] };
    const withDrop = { ...present, widgets: [...present.widgets, dropped] };
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, withDrop);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);

    assert.deepEqual(clicked.layout, { x: 720, y: 490, width: 480, height: 100 });
    assert.deepEqual(dropped.layout, { x: 720, y: 490, width: 480, height: 100 });
    assert.equal(undone?.present.widgets.length, 1);
    assert.equal(undone?.present.widgets[0]?.id, clicked.id);
    assert.equal(redone?.present.widgets.length, 2);
    assert.equal(redone?.present.widgets[1]?.id, dropped.id);
});

test("maps the drop indicator back to screen pixels at the current zoom", () => {
    const layout = { x: 720, y: 490, width: 480, height: 100 };

    assert.deepEqual(
        screenRectForLayout(halfScaleStage, 1920, 1080, layout),
        { left: 120 + 360, top: 40 + 245, width: 240, height: 50 },
    );
});
