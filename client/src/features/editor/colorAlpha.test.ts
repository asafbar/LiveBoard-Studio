import assert from "node:assert/strict";
import test from "node:test";
import {
    alphaPercentFromHex,
    effectiveOpacityPercent,
    opacityVariable,
    paintColor,
} from "./colorAlpha.ts";

test("keeps a full color unchanged at 100 percent and when opacity is omitted", () => {
    assert.equal(paintColor("#112233", undefined), "#112233");
    assert.equal(paintColor("#112233", 100), "#112233");
    assert.equal(paintColor("var(--foreground)", 100), "var(--foreground)");
    assert.equal(paintColor("color-mix(in srgb, var(--canvas-board) 86%, var(--foreground))", undefined), "color-mix(in srgb, var(--canvas-board) 86%, var(--foreground))");
    assert.equal(opacityVariable(undefined), undefined);
    assert.equal(opacityVariable(100), undefined);
    assert.equal(effectiveOpacityPercent(undefined), 100);
});

test("paints 0, 25, 50, and 75 percent without changing the stored color", () => {
    assert.equal(paintColor("#112233", 0), "color-mix(in srgb, #112233 0%, transparent)");
    assert.equal(paintColor("#112233", 25), "color-mix(in srgb, #112233 25%, transparent)");
    assert.equal(paintColor("var(--cyan)", 50), "color-mix(in srgb, var(--cyan) 50%, transparent)");
    assert.equal(paintColor("#ffffff", 75), "color-mix(in srgb, #ffffff 75%, transparent)");
    assert.equal(opacityVariable(0), "0");
    assert.equal(opacityVariable(25), "0.25");
    assert.equal(opacityVariable(50), "0.5");
    assert.equal(opacityVariable(75), "0.75");
});

test("reads an eight-digit hex as a separate opacity percent", () => {
    assert.deepEqual(alphaPercentFromHex("#11223380"), {
        color: "#112233",
        opacity: 50,
    });
    assert.deepEqual(alphaPercentFromHex("#aabbcc00"), {
        color: "#aabbcc",
        opacity: 0,
    });
    assert.deepEqual(alphaPercentFromHex("#aabbccff"), {
        color: "#aabbcc",
        opacity: 100,
    });
    assert.equal(alphaPercentFromHex("#112233"), null);
    assert.equal(alphaPercentFromHex("var(--foreground)"), null);
});
