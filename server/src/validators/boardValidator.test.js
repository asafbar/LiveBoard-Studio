const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { sanitizeDraft } = require("./boardValidator");

function layout(x, y) {
    return { x, y, width: 440, height: 720 };
}

function verticalWidget(id, descriptions) {
    return {
        id,
        type: "vertical-announcements",
        layout: layout(0, 0),
        settings: {
            speed: 40,
            backgroundColor: "#112233",
            textColor: "#ffffff",
            accentColor: "#00ccff",
            borderRadius: 0,
            items: descriptions.map((description, index) => ({
                id: `item-${index}`,
                title: `Title ${index}`,
                description,
                label: ""
            }))
        }
    };
}

function boardWith(widgets) {
    return {
        id: "board-1",
        name: "Validation fixture",
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets
    };
}

function descriptionsFrom(draft) {
    return draft.widgets[0].settings.items.map((item) => item.description);
}

test("accepts Hebrew descriptions with newlines unchanged", () => {
    const description = "שורה ראשונה\nשורה שנייה עם English";
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", [description])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(descriptionsFrom(draft)[0], description);
});

test("accepts multiple newlines inside a description", () => {
    const description = "פתיח\n\nאמצע\n\nסיום";
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", [description])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(descriptionsFrom(draft)[0], description);
});

test("accepts a blank description without calling it missing text", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", ["\n\n", "   \n  "])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.deepEqual(descriptionsFrom(draft), ["", ""]);
});

test("rejects a tab in a description as an unsupported character", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", ["שורה\tשורה"])
    ]), errors);

    assert.equal(draft, null);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].path, "widgets.0.settings.items.0.description");
    assert.equal(errors[0].message, "Text contains unsupported characters.");
});

test("still rejects a newline in a single-line ticker message", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([{
        id: "ticker-1",
        type: "ticker",
        layout: { x: 0, y: 0, width: 1440, height: 88 },
        settings: {
            messages: [{ id: "message-1", text: "Hello\nשלום" }],
            direction: "rtl",
            speed: 80,
            backgroundColor: "#112233",
            textColor: "#ffffff",
            accentColor: "#00ccff",
            borderRadius: 16
        }
    }]), errors);

    assert.equal(draft, null);
    assert.equal(errors[0].path, "widgets.0.settings.messages.0.text");
    assert.equal(errors[0].message, "Text contains unsupported characters.");
});

test("accepts the backed-up multiline descriptions unchanged", () => {
    const backupPath = process.env.DRAFT_BACKUP;

    if (backupPath === undefined || backupPath === "") {
        return;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    const original = backup.widgets[9].settings.items.map((item) => item.description);
    const errors = [];
    const draft = sanitizeDraft(backup, errors);
    const saved = draft.widgets[9].settings.items.map((item) => item.description);

    assert.deepEqual(errors, []);
    assert.deepEqual(saved, original);
});
