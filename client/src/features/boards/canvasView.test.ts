import assert from "node:assert/strict";
import test from "node:test";
import { boardPointFromClient, type StageBox } from "./boardCoordinates.ts";
import { widgetExtendsOutsideBoard } from "./boardOrientation.ts";
import type { Board, Widget } from "./types/boardTypes.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "../editor/draftHistory.ts";
import {
    activeZoomScale,
    constrainDragPosition,
    contentBounds,
    fitBoardScale,
    fitWidgetInside,
    fitWorkspaceScale,
    initialCanvasZoomState,
    moveAllInside,
    moveWidgetInside,
    nextZoomStop,
    reduceCanvasZoom,
    resizeOutsideLayout,
    scrollKeepingBoard,
    scrollPreservingCenter,
    scrollToCenterBoard,
    stageBoxForWorkspace,
    workspaceGeometry,
} from "./canvasView.ts";

const landscape = { width: 1920, height: 1080 };
const portrait = { width: 1080, height: 1920 };

function layout(x: number, y: number, width = 480, height = 100) {
    return { x, y, width, height };
}

function textWidget(id: string, x: number, y: number, width = 480, height = 100): Widget {
    return {
        id,
        type: "text",
        layout: layout(x, y, width, height),
        settings: { text: id, tone: "default", size: "title" },
    };
}

function boardWith(width: number, height: number, widgets: Widget[]): Board {
    return {
        id: "board-1",
        name: "Canvas",
        width,
        height,
        background: { type: "solid", color: "#000000" },
        widgets,
    };
}

test("steps manual zoom between 25 and 200 percent and leaves a fitted scale below 25", () => {
    assert.equal(nextZoomStop(1, 1), 1.25);
    assert.equal(nextZoomStop(1, -1), 0.75);
    assert.equal(nextZoomStop(0.25, -1), 0.25);
    assert.equal(nextZoomStop(2, 1), 2);
    assert.equal(nextZoomStop(0.12, 1), 0.25);
    assert.equal(nextZoomStop(0.12, -1), 0.12);
    assert.equal(nextZoomStop(0.4, 1), 0.5);
    assert.equal(nextZoomStop(0.4, -1), 0.25);
});

test("keeps a manual zoom across viewport changes and refits the selected fit mode", () => {
    const manual = reduceCanvasZoom(initialCanvasZoomState, { type: "zoom-in" });
    const resized = reduceCanvasZoom(manual, {
        type: "refit",
        viewportWidth: 640,
        viewportHeight: 360,
        boardWidth: landscape.width,
        boardHeight: landscape.height,
        bounds: contentBounds(landscape.width, landscape.height, []),
    });
    const fitted = reduceCanvasZoom(initialCanvasZoomState, {
        type: "refit",
        viewportWidth: 800,
        viewportHeight: 500,
        boardWidth: landscape.width,
        boardHeight: landscape.height,
        bounds: contentBounds(landscape.width, landscape.height, []),
    });
    const portraitFit = reduceCanvasZoom({ ...fitted, mode: "fit-board" }, {
        type: "refit",
        viewportWidth: 800,
        viewportHeight: 500,
        boardWidth: portrait.width,
        boardHeight: portrait.height,
        bounds: contentBounds(portrait.width, portrait.height, []),
    });

    assert.equal(manual.mode, "manual");
    assert.equal(activeZoomScale(manual), 1.25);
    assert.equal(manual.scroll, "preserve-center");
    assert.equal(resized.manualScale, manual.manualScale);
    assert.equal(resized.mode, "manual");
    assert.equal(fitted.mode, "fit-board");
    assert.equal(fitted.fitScale, fitBoardScale(800, 500, landscape.width, landscape.height));
    assert.ok(fitted.fitScale < 1);
    assert.equal(portraitFit.fitScale, fitBoardScale(800, 500, portrait.width, portrait.height));
    assert.ok(portraitFit.fitScale < fitted.fitScale);
});

test("fits the workspace to outside widgets and matches fit board when nothing is outside", () => {
    const empty = contentBounds(landscape.width, landscape.height, []);
    const outside = contentBounds(landscape.width, landscape.height, [
        layout(1400, -80, 480, 100),
        layout(2000, 40, 300, 200),
    ]);
    const partial = contentBounds(portrait.width, portrait.height, [layout(-40, 1800, 200, 80)]);

    assert.deepEqual(empty, { left: 0, top: 0, right: 1920, bottom: 1080 });
    assert.equal(fitWorkspaceScale(900, 600, empty), fitBoardScale(900, 600, landscape.width, landscape.height));
    assert.equal(outside.left, 0);
    assert.equal(outside.top, -80);
    assert.equal(outside.right, 2300);
    assert.equal(outside.bottom, 1080);
    assert.ok(fitWorkspaceScale(900, 600, outside) < fitBoardScale(900, 600, landscape.width, landscape.height));
    assert.equal(partial.left, -40);
    assert.equal(partial.bottom, 1920);
    assert.equal(widgetExtendsOutsideBoard(layout(1400, 40, 480, 100), portrait.width, portrait.height), true);
    assert.equal(widgetExtendsOutsideBoard(layout(40, 40, 200, 80), portrait.width, portrait.height), false);
});

test("preserves the viewport center while zooming and keeps the board anchored while bounds change", () => {
    const viewport = { width: 800, height: 500 };
    const bounds = contentBounds(landscape.width, landscape.height, []);
    const before = workspaceGeometry(landscape.width, landscape.height, bounds, 0.5, viewport.width, viewport.height);
    const after = workspaceGeometry(landscape.width, landscape.height, bounds, 1, viewport.width, viewport.height);
    const centered = scrollToCenterBoard(before, viewport.width, viewport.height);
    const zoomed = scrollPreservingCenter(before, after, centered.scrollLeft, centered.scrollTop, viewport.width, viewport.height);
    const grownBounds = contentBounds(landscape.width, landscape.height, [layout(-200, 40, 100, 80)]);
    const grown = workspaceGeometry(landscape.width, landscape.height, grownBounds, 0.5, viewport.width, viewport.height);
    const anchored = scrollKeepingBoard(20, 10, before, grown);

    const beforeCenter = centered.scrollLeft + (viewport.width / 2) - before.workspaceLeft;
    const afterCenter = zoomed.scrollLeft + (viewport.width / 2) - after.workspaceLeft;
    const boardCenter = centered.scrollLeft + (viewport.width / 2);
    const boardMid = before.workspaceLeft + before.boardLeft + ((landscape.width * before.scale) / 2);

    assert.ok(Math.abs(boardCenter - boardMid) < 1);
    assert.ok(Math.abs((beforeCenter / before.workspaceWidth) - (afterCenter / after.workspaceWidth)) < 0.001);
    assert.ok(zoomed.scrollLeft > centered.scrollLeft);
    assert.equal(anchored.scrollLeft - 20, (grown.workspaceLeft + grown.boardLeft) - (before.workspaceLeft + before.boardLeft));
    assert.equal(anchored.scrollTop, 10);
});

test("converts landscape and portrait stage points at 50, 100, and 200 percent with scroll", () => {
    [landscape, portrait].forEach((size) => {
        [0.5, 1, 2].forEach((scale) => {
            const bounds = contentBounds(size.width, size.height, [layout(size.width + 20, -30, 120, 80)]);
            const geometry = workspaceGeometry(size.width, size.height, bounds, scale, 900, 700);
            const stage = stageBoxForWorkspace(geometry, 40, 25);
            const point = boardPointFromClient(stage.left + (100 * scale), stage.top + (50 * scale), stage, size.width, size.height);

            assert.equal(stage.width, size.width * scale);
            assert.equal(stage.height, size.height * scale);
            assert.equal(point.x, 100);
            assert.equal(point.y, 50);
        });
    });
});

test("keeps a completely outside widget inside the workspace and beside the board", () => {
    const outside = layout(2200, 40, 300, 120);
    const bounds = contentBounds(landscape.width, landscape.height, [outside]);
    const geometry = workspaceGeometry(landscape.width, landscape.height, bounds, 0.5, 700, 400);
    const widgetLeft = geometry.boardLeft + (outside.x * geometry.scale);
    const widgetRight = widgetLeft + (outside.width * geometry.scale);
    const boardRight = geometry.boardLeft + (landscape.width * geometry.scale);

    assert.ok(widgetLeft > boardRight);
    assert.ok(widgetRight <= geometry.workspaceWidth);
    assert.ok(widgetLeft >= 0);
});

function dragTo(
    current: { x: number; y: number; width: number; height: number },
    x: number,
    y: number,
    boardWidth = landscape.width,
    boardHeight = landscape.height,
) {
    const next = constrainDragPosition(current, x, y, boardWidth, boardHeight);

    return {
        ...current,
        x: next.x,
        y: next.y,
    };
}

test("lets an outside widget move inward and back outward during one drag", () => {
    const outside = layout(-220, 40, 180, 80);
    const inward = dragTo(outside, -80, 20);
    const outward = dragTo(inward, -340, -30);
    const inside = constrainDragPosition(layout(40, 40), -30, 2000, landscape.width, landscape.height);

    assert.deepEqual({ x: inward.x, y: inward.y }, { x: -80, y: 20 });
    assert.equal(widgetExtendsOutsideBoard(inward, landscape.width, landscape.height), true);
    assert.deepEqual({ x: outward.x, y: outward.y }, { x: -340, y: -30 });
    assert.deepEqual(inside, { x: 0, y: landscape.height - 100 });
});

test("lets a partially overlapping widget move in either direction until it is fully inside", () => {
    const partial = layout(landscape.width - 40, 80, 120, 80);
    const farther = dragTo(partial, landscape.width + 80, -40);
    const contained = dragTo(partial, landscape.width - 120, 90);
    const blocked = dragTo(contained, landscape.width - 20, 90);

    assert.equal(widgetExtendsOutsideBoard(partial, landscape.width, landscape.height), true);
    assert.deepEqual({ x: farther.x, y: farther.y }, { x: landscape.width + 80, y: -40 });
    assert.equal(widgetExtendsOutsideBoard(contained, landscape.width, landscape.height), false);
    assert.equal(blocked.x, landscape.width - 120);
    assert.equal(blocked.y, 90);
});

test("clamps a widget after it becomes fully contained in the same drag", () => {
    let current = layout(2100, -160, 200, 80);
    current = dragTo(current, 1800, -40);
    current = dragTo(current, 2300, -200);
    current = dragTo(current, 40, 60);
    const backOutside = dragTo(current, -80, 60);
    const pastEdge = dragTo(current, landscape.width, landscape.height);

    assert.equal(widgetExtendsOutsideBoard(current, landscape.width, landscape.height), false);
    assert.deepEqual({ x: current.x, y: current.y }, { x: 40, y: 60 });
    assert.equal(backOutside.x, 0);
    assert.equal(backOutside.y, 60);
    assert.equal(pastEdge.x, landscape.width - 200);
    assert.equal(pastEdge.y, landscape.height - 80);
});

test("keeps an oversized widget free to move because it cannot fit inside", () => {
    const oversized = layout(-20, 10, 2000, 80);
    const moved = dragTo(oversized, 400, -120);
    const returned = dragTo(moved, -80, 300);

    assert.deepEqual({ x: moved.x, y: moved.y }, { x: 400, y: -120 });
    assert.deepEqual({ x: returned.x, y: returned.y }, { x: -80, y: 300 });
});

test("applies the same containment rule to drags at 50, 100, and 200 percent", () => {
    [0.5, 1, 2].forEach((scale) => {
        const stage: StageBox = {
            left: 40,
            top: 20,
            width: landscape.width * scale,
            height: landscape.height * scale,
        };
        const outside = layout(-160, 30, 140, 70);
        const start = boardPointFromClient(stage.left + 80, stage.top + 40, stage, landscape.width, landscape.height);
        const farther = boardPointFromClient(stage.left + 20, stage.top + 10, stage, landscape.width, landscape.height);
        const nearer = boardPointFromClient(stage.left + 200, stage.top + 80, stage, landscape.width, landscape.height);
        const movedOut = dragTo(outside, outside.x + (farther.x - start.x), outside.y + (farther.y - start.y));
        const movedIn = dragTo(outside, outside.x + (nearer.x - start.x), outside.y + (nearer.y - start.y));

        assert.ok(movedOut.x < outside.x);
        assert.ok(movedOut.y < outside.y);
        assert.equal(widgetExtendsOutsideBoard(movedOut, landscape.width, landscape.height), true);
        assert.ok(movedIn.x > outside.x);
        assert.equal(movedIn.x, Math.round(outside.x + ((200 - 80) / scale)));
    });
});

test("moves fitting widgets inside, leaves oversized widgets, and undoes the whole change", () => {
    const edge = textWidget("edge", 1700, 40);
    const remote = textWidget("remote", 2400, -300, 200, 80);
    const huge = textWidget("huge", -40, 20, 2000, 400);
    const kept = textWidget("kept", 80, 80);
    const present = boardWith(landscape.width, landscape.height, [edge, remote, huge, kept]);
    const moved = moveAllInside(present);
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, moved);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);
    const one = moveWidgetInside(present, "remote");
    const fitted = fitWidgetInside(present, "huge");

    assert.deepEqual(moved.widgets.map((widget) => widget.id), ["edge", "remote", "huge", "kept"]);
    assert.deepEqual(moved.widgets[0]?.layout, { x: 1440, y: 40, width: 480, height: 100 });
    assert.deepEqual(moved.widgets[1]?.layout, { x: 1720, y: 0, width: 200, height: 80 });
    assert.equal(moved.widgets[2], huge);
    assert.equal(moved.widgets[3], kept);
    assert.equal(one.widgets[0], edge);
    assert.equal(one.widgets[1]?.layout.x, 1720);
    assert.equal(one.widgets[1]?.layout.y, 0);
    assert.equal(fitted.widgets[2]?.layout.width <= landscape.width, true);
    assert.equal(fitted.widgets[2]?.layout.height <= landscape.height, true);
    assert.equal(fitted.widgets[2]?.settings, huge.settings);
    assert.deepEqual(undone?.present.widgets.map((widget) => widget.layout), present.widgets.map((widget) => widget.layout));
    assert.deepEqual(redone?.present.widgets.map((widget) => widget.layout), moved.widgets.map((widget) => widget.layout));
});

test("resize of an outside widget cannot increase its overflow", () => {
    const origin = layout(1700, -40, 480, 160);
    const farther = resizeOutsideLayout(origin, "se", 80, 40, portrait.width, portrait.height);
    const inward = resizeOutsideLayout(origin, "nw", 30, 20, portrait.width, portrait.height);

    assert.equal(farther.x + farther.width <= origin.x + origin.width, true);
    assert.equal(farther.y, origin.y);
    assert.ok(inward.x > origin.x);
    assert.ok(inward.y > origin.y);
    assert.equal(inward.width < origin.width, true);
});
