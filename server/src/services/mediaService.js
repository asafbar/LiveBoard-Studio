const mediaRepository = require("../repositories/mediaRepository");
const { processUploadedImage } = require("./mediaImageProcessor");
const {
    MIME_EXTENSIONS,
    createStorageKey,
    openFile,
    removeStoredFile,
    removeTempUpload,
    writeNewFile
} = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

async function createMediaAsset(upload) {
    let storageKey = null;

    try {
        const processed = await processUploadedImage(upload.tempPath);

        // The processed file is written before the metadata insert. PostgreSQL
        // cannot roll back that filesystem write. A crash between the two can
        // leave a file with no row. A failed insert deletes the file just written.
        storageKey = createStorageKey(processed.mimeType);
        await writeNewFile(storageKey, processed.buffer);

        try {
            return await mediaRepository.insertMediaAsset({
                originalFilename: sanitizeDisplayFilename(
                    upload.originalFilename,
                    processed.mimeType
                ),
                storageKey,
                mimeType: processed.mimeType,
                sizeBytes: processed.buffer.length
            });
        } catch (insertError) {
            await removeStoredFile(storageKey).catch(() => {
                console.error("Stored media cleanup failed.");
            });
            throw insertError;
        }
    } finally {
        await removeTempUpload(upload.tempPath).catch(() => {
            console.error("Temporary upload cleanup failed.");
        });
    }
}

function sanitizeDisplayFilename(rawName, mimeType) {
    const extension = MIME_EXTENSIONS[mimeType];
    const fallback = `image.${extension}`;

    if (typeof rawName !== "string" || rawName.length === 0 || rawName.length > 1024) {
        return fallback;
    }

    const baseName = rawName.replaceAll("\\", "/").split("/").pop();
    const withoutControls = baseName.replace(/[\u0000-\u001F\u007F]/g, "").trim();

    if (withoutControls === "" || withoutControls === "." || withoutControls === "..") {
        return fallback;
    }

    if (withoutControls.length <= 255) {
        return withoutControls;
    }

    const shortened = withoutControls.slice(0, 255).trim();

    if (shortened === "") {
        return fallback;
    }

    return shortened;
}

async function listMediaAssets() {
    return mediaRepository.listMediaAssets();
}

async function getMediaAsset(id) {
    const asset = await mediaRepository.findMediaAssetById(id);

    if (asset === null) {
        throw createHttpError(404, "Media asset not found.");
    }

    return asset;
}

async function openMediaFile(id) {
    const asset = await getMediaAsset(id);

    if (!storageKeyMatchesMime(asset.storage_key, asset.mime_type)) {
        throw createHttpError(404, "Media file not found.");
    }

    let opened;

    try {
        opened = await openFile(asset.storage_key);
    } catch (error) {
        if (error.code === "not-found" || error.code === "invalid-key") {
            throw createHttpError(404, "Media file not found.");
        }

        throw error;
    }

    if (opened.sizeBytes !== toSizeBytes(asset.size_bytes)) {
        opened.stream.destroy();
        throw createHttpError(404, "Media file not found.");
    }

    return {
        mimeType: asset.mime_type,
        sizeBytes: opened.sizeBytes,
        stream: opened.stream
    };
}

function storageKeyMatchesMime(storageKey, mimeType) {
    const extension = MIME_EXTENSIONS[mimeType];

    return typeof extension === "string" && storageKey.endsWith(`.${extension}`);
}

function toSizeBytes(value) {
    const size = typeof value === "number" ? value : Number(value);

    if (!Number.isSafeInteger(size) || size < 1) {
        return -1;
    }

    return size;
}

module.exports = {
    createMediaAsset,
    listMediaAssets,
    getMediaAsset,
    openMediaFile
};
