const assert = require("node:assert/strict");
const test = require("node:test");
const {
    collectMediaUsage,
    collectReferencedMediaIds
} = require("./mediaUsage");

const ASSET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("reports draft-only, published-only, and shared references once per board", () => {
    const usage = collectMediaUsage(ASSET_ID, [
        board("00000000-0000-4000-8000-000000000002", "Zebra", document("draft"), null),
        board("00000000-0000-4000-8000-000000000003", "Atlas", null, document("published")),
        board("00000000-0000-4000-8000-000000000001", "Middle", document("draft"), document("published"))
    ]);

    assert.equal(usage.assetId, ASSET_ID);
    assert.equal(usage.referenced, true);
    assert.deepEqual(usage.boards, [
        {
            id: "00000000-0000-4000-8000-000000000003",
            name: "Atlas",
            inDraft: false,
            inPublished: true
        },
        {
            id: "00000000-0000-4000-8000-000000000001",
            name: "Middle",
            inDraft: true,
            inPublished: true
        },
        {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Zebra",
            inDraft: true,
            inPublished: false
        }
    ]);
});

test("includes hidden, locked, absolute, and uppercase references", () => {
    const usage = collectMediaUsage(ASSET_ID.toUpperCase(), [
        board("00000000-0000-4000-8000-000000000010", "Hidden", {
            widgets: [{
                visible: false,
                locked: true,
                settings: {
                    src: `/api/media/${ASSET_ID.toUpperCase()}/file`
                }
            }]
        }, null),
        board("00000000-0000-4000-8000-000000000011", "Remote", null, {
            widgets: [{
                settings: {
                    imageSrc: `https://signs.example/api/media/${ASSET_ID}/file`
                }
            }]
        })
    ]);

    assert.equal(usage.boards.length, 2);
    assert.equal(usage.boards[0].name, "Hidden");
    assert.equal(usage.boards[0].inDraft, true);
    assert.equal(usage.boards[1].name, "Remote");
    assert.equal(usage.boards[1].inPublished, true);
});

test("lists duplicated boards separately and ignores unrelated references", () => {
    const usage = collectMediaUsage(ASSET_ID, [
        board("00000000-0000-4000-8000-000000000021", "Copy", document("copy-b"), null),
        board("00000000-0000-4000-8000-000000000020", "Copy", document("copy-a"), null),
        board("00000000-0000-4000-8000-000000000022", "Other Asset", {
            widgets: [{
                settings: {
                    src: `/api/media/${OTHER_ID}/file`
                }
            }]
        }, null),
        board("00000000-0000-4000-8000-000000000023", "Static", {
            widgets: [{
                settings: {
                    imageSrc: "/media/tech-summit/hero.png",
                    description: ASSET_ID
                }
            }]
        }, null),
        board("00000000-0000-4000-8000-000000000024", "Unused", {
            widgets: []
        }, {
            widgets: []
        })
    ]);

    assert.deepEqual(usage.boards.map((item) => item.id), [
        "00000000-0000-4000-8000-000000000020",
        "00000000-0000-4000-8000-000000000021"
    ]);
});

test("returns no boards for an unused asset", () => {
    const usage = collectMediaUsage(ASSET_ID, [
        board("00000000-0000-4000-8000-000000000030", "Empty", null, null)
    ]);

    assert.equal(usage.referenced, false);
    assert.deepEqual(usage.boards, []);
});

test("collects the same media ids that usage matching accepts", () => {
    const ids = collectReferencedMediaIds({
        widgets: [{
            hidden: true,
            locked: true,
            settings: {
                src: `https://signs.example/api/media/${ASSET_ID.toUpperCase()}/file`,
                note: `Static /media/tech-summit/hero.png and bare ${OTHER_ID}`
            }
        }]
    });

    assert.deepEqual(ids, [ASSET_ID]);
});

function board(id, name, draft, published) {
    return {
        id,
        name,
        draft,
        published
    };
}

function document(label) {
    return {
        widgets: [{
            id: label,
            settings: {
                src: `/api/media/${ASSET_ID}/file`
            }
        }]
    };
}
