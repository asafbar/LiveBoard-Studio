import assert from "node:assert/strict";
import test from "node:test";
import {
    scrollTopForRevealedRow,
    sidebarSectionsAfterEditorAction,
    toggleSidebarSection,
} from "./sidebarSections.ts";

const bothOpen = { componentsOpen: true, layersOpen: true };
const componentsOnly = { componentsOpen: true, layersOpen: false };
const layersOnly = { componentsOpen: false, layersOpen: true };

test("editor actions keep the sidebar sections the user opened", () => {
    for (const sections of [bothOpen, componentsOnly, layersOnly]) {
        assert.deepEqual(sidebarSectionsAfterEditorAction(sections), sections);
    }
});

test("a section header toggles only that section", () => {
    assert.deepEqual(toggleSidebarSection(bothOpen, "components"), {
        componentsOpen: false,
        layersOpen: true,
    });
    assert.deepEqual(toggleSidebarSection(bothOpen, "layers"), {
        componentsOpen: true,
        layersOpen: false,
    });
    assert.deepEqual(toggleSidebarSection(componentsOnly, "layers"), bothOpen);
});

test("a revealed layer scrolls inside its list and leaves a visible row alone", () => {
    assert.equal(scrollTopForRevealedRow(40, 100, 300, 120, 160), 40);
    assert.equal(scrollTopForRevealedRow(40, 100, 300, 80, 120), 20);
    assert.equal(scrollTopForRevealedRow(40, 100, 300, 280, 340), 80);
});
