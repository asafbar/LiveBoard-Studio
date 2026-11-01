const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const env = require("../config/env");

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const TEMP_UPLOAD_MAX_AGE_MS = 60 * 1000;
const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const TEMP_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.part$/;

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

async function ensureTempDirectory() {
    const root = await ensureRoot();
    const tempDir = path.join(root, "tmp");

    await fs.promises.mkdir(tempDir, {
        recursive: true,
        mode: 0o700
    });

    const realTemp = await fs.promises.realpath(tempDir);

    if (!isStrictlyInside(root, realTemp)) {
        throw MediaStorageError("invalid-temp", "Temporary upload directory is unsafe.");
    }

    await fs.promises.chmod(realTemp, 0o700);
    await removeStaleTempFiles(realTemp, Date.now());

    return realTemp;
}

async function removeTempUpload(filePath) {
    if (typeof filePath !== "string" || filePath.length === 0) {
        return;
    }

    const baseName = path.basename(filePath);

    if (!TEMP_FILE_PATTERN.test(baseName)) {
        return;
    }

    const tempDir = await ensureTempDirectory();
    const candidate = path.join(tempDir, baseName);

    try {
        const stat = await fs.promises.lstat(candidate);

        if (!stat.isFile()) {
            return;
        }

        await fs.promises.unlink(candidate);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
}

async function removeStoredFile(storageKey) {
    assertSafeStorageKey(storageKey);

    const root = await fs.promises.realpath(mediaRoot);
    const filePath = resolveInsideRoot(root, storageKey);

    try {
        const stat = await fs.promises.lstat(filePath);

        if (!stat.isFile()) {
            throw MediaStorageError("not-found", "Media file not found.");
        }

        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code === "ENOENT") {
            return;
        }

        if (error.code === "ELOOP" || error.code === "ENOTDIR") {
            throw MediaStorageError("not-found", "Media file not found.");
        }

        throw error;
    }
}

async function sweepStaleTempUploads() {
    await ensureTempDirectory();
}

async function removeStaleTempFiles(directory, now) {
    const names = await fs.promises.readdir(directory);

    await Promise.all(names.map(async (name) => {
        if (!TEMP_FILE_PATTERN.test(name)) {
            return;
        }

        const candidate = path.join(directory, name);

        try {
            const stat = await fs.promises.lstat(candidate);

            if (!stat.isFile() || now - stat.mtimeMs < TEMP_UPLOAD_MAX_AGE_MS) {
                return;
            }

            await fs.promises.unlink(candidate);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Temporary upload cleanup failed.");
            }
        }
    }));
}

function isStrictlyInside(parent, candidate) {
    const relative = path.relative(parent, candidate);

    return relative !== ""
        && relative !== ".."
        && !relative.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relative);
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
    assertSafeStorageKey,
    ensureTempDirectory,
    removeTempUpload,
    removeStoredFile,
    sweepStaleTempUploads
};
