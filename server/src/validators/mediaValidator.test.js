const assert = require("node:assert/strict");
const test = require("node:test");
const { validateMediaRename } = require("./mediaValidator");

test("accepts a trimmed Hebrew display name", () => {
    const request = {
        body: {
            originalFilename: "  לובי.jpg  "
        }
    };

    validateMediaRename(request, {}, (error) => {
        if (error) {
            assert.fail(error.message);
        }
    });

    assert.equal(request.mediaFilename, "לובי.jpg");

    const longName = `${"א".repeat(251)}.jpg`;
    const longRequest = {
        body: {
            originalFilename: longName
        }
    };

    validateMediaRename(longRequest, {}, (error) => {
        if (error) {
            assert.fail(error.message);
        }
    });

    assert.equal(longRequest.mediaFilename, longName);
});

test("rejects an empty, slashed, or oversized display name", () => {
    assert.equal(rejectName("   "), "Display name is required.");
    assert.equal(rejectName("folder/name.jpg"), "Display name cannot include slashes.");
    assert.equal(rejectName("folder\\name.jpg"), "Display name cannot include slashes.");
    assert.equal(rejectName("name\n.jpg"), "Display name cannot include control characters.");
    assert.equal(rejectName("א".repeat(256)), "Display name must be at most 255 characters.");
    assert.equal(rejectName(12), "Display name must be a string.");
});

test("rejects a body that tries to change another field", () => {
    const error = runValidator({
        originalFilename: "Lobby.jpg",
        storageKey: "replaced.jpg"
    });

    assert.equal(error.statusCode, 400);
    assert.equal(error.errors[0].path, "storageKey");
});

function rejectName(originalFilename) {
    const error = runValidator({
        originalFilename
    });

    assert.equal(error.statusCode, 400);
    return error.errors[0].message;
}

function runValidator(body) {
    let failure = null;

    validateMediaRename({ body }, {}, (error) => {
        failure = error ?? null;
    });

    assert.ok(failure);
    return failure;
}
