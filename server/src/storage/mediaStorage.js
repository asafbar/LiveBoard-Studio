const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const env = require("../config/env");

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
};

// Local filesystem adapter. A later object-storage adapter can replace this
// module without changing /api/media. Bytes are not verified here: a future
// upload service must check file contents before calling writeNewFile.
const mediaRoot = assertConfiguredRoot(env.mediaDir);

function MediaStorageError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.name = "MediaStorageError";
    return error;
}

function createStorageKey(mimeType) {
    const extension = MIME_EXTENSIONS[mimeType];

    if (extension === undefined) {
        throw MediaStorageError("invalid-type", "Unsupported media type.");
    }

    return `${randomUUID()}.${extension}`;
}

function assertSafeStorageKey(storageKey) {
    if (typeof storageKey !== "string"
        || storageKey.length > 64
        || !STORAGE_KEY_PATTERN.test(storageKey)
        || path.basename(storageKey) !== storageKey
        || storageKey.includes("..")
        || storageKey.includes("/")
        || storageKey.includes("\\")
        || storageKey.includes("\0")) {
        throw MediaStorageError("invalid-key", "Unsafe storage key.");
    }
}

async function writeNewFile(storageKey, contents) {
    assertSafeStorageKey(storageKey);

    if (!Buffer.isBuffer(contents) || contents.length === 0 || contents.length > MAX_MEDIA_BYTES) {
        throw MediaStorageError("invalid-content", "Media content is empty or too large.");
    }

    const root = await ensureRoot();
    const filePath = resolveInsideRoot(root, storageKey);
    const flags = fs.constants.O_WRONLY
        | fs.constants.O_CREAT
        | fs.constants.O_EXCL
        | (fs.constants.O_NOFOLLOW || 0);
    let handle;

    try {
        handle = await fs.promises.open(filePath, flags, 0o640);
    } catch (error) {
        if (error.code === "EEXIST") {
            throw MediaStorageError("conflict", "Media file already exists.");
        }

        throw error;
    }

    try {
        await handle.writeFile(contents);
    } catch (error) {
        await handle.close();
        await fs.promises.unlink(filePath).catch(() => {});
        throw error;
    }

    await handle.close();

    return {
        sizeBytes: contents.length
    };
}

async function openFile(storageKey) {
    assertSafeStorageKey(storageKey);

    let root;

    try {
        root = await fs.promises.realpath(mediaRoot);
    } catch (error) {
        if (error.code === "ENOENT") {
            throw MediaStorageError("not-found", "Media file not found.");
        }

        throw error;
    }

    const filePath = resolveInsideRoot(root, storageKey);
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
    let handle;

    try {
        handle = await fs.promises.open(filePath, flags);
        const stat = await handle.stat();
        const realFile = await fs.promises.realpath(filePath);

        if (!stat.isFile() || !isDirectFileInside(root, realFile)) {
            throw MediaStorageError("not-found", "Media file not found.");
        }

        const stream = handle.createReadStream();
        handle = null;

        return {
            stream,
            sizeBytes: stat.size
        };
    } catch (error) {
        if (handle !== null && handle !== undefined) {
            await handle.close();
        }

        if (error.code === "ENOENT" || error.code === "ELOOP" || error.code === "ENOTDIR") {
            throw MediaStorageError("not-found", "Media file not found.");
        }

        throw error;
    }
}

async function ensureRoot() {
    await fs.promises.mkdir(mediaRoot, {
        recursive: true,
        mode: 0o750
    });

    return fs.promises.realpath(mediaRoot);
}

function resolveInsideRoot(root, storageKey) {
    const candidate = path.resolve(root, storageKey);

    if (!isDirectFileInside(root, candidate)) {
        throw MediaStorageError("invalid-key", "Unsafe storage key.");
    }

    return candidate;
}

function isDirectFileInside(root, candidate) {
    const relative = path.relative(root, candidate);

    return relative !== ""
        && relative !== ".."
        && !relative.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relative)
        && !relative.includes(path.sep)
        && !relative.includes("/")
        && !relative.includes("\\");
}

function isSameOrInside(parent, candidate) {
    const resolvedParent = path.resolve(parent);
    const resolvedCandidate = path.resolve(candidate);

    if (resolvedParent === resolvedCandidate) {
        return true;
    }

    const relative = path.relative(resolvedParent, resolvedCandidate);

    return relative !== ""
        && relative !== ".."
        && !relative.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relative);
}

function assertConfiguredRoot(root) {
    const resolved = path.resolve(root);
    const filesystemRoot = path.parse(resolved).root;

    if (resolved === filesystemRoot) {
        throw new Error("MEDIA_DIR must not be the filesystem root.");
    }

    const publicDir = path.resolve(__dirname, "../../../client/public");

    if (isSameOrInside(publicDir, resolved)) {
        throw new Error("MEDIA_DIR must stay outside the frontend public directory.");
    }

    return resolved;
}

module.exports = {
    MAX_MEDIA_BYTES,
    MIME_EXTENSIONS,
    createStorageKey,
    writeNewFile,
    openFile,
    assertSafeStorageKey
};
