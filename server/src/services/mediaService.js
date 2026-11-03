const mediaRepository = require("../repositories/mediaRepository");
const { sanitizeDisplayFilename } = require("./mediaFilename");
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

        const displayName = sanitizeDisplayFilename(
            upload.originalFilename,
            processed.mimeType
        );

        try {
            return await insertMediaRecord(storageKey, displayName, processed);
        } catch (insertError) {
            if (!isFilenameConstraintError(insertError)) {
                await removeStoredMedia(storageKey);
                throw insertError;
            }

            console.error("Media filename did not satisfy the filename constraint. A generic display name was stored.");

            try {
                return await insertMediaRecord(
                    storageKey,
                    sanitizeDisplayFilename("", processed.mimeType),
                    processed
                );
            } catch (retryError) {
                await removeStoredMedia(storageKey);
                throw retryError;
            }
        }
    } finally {
        await removeTempUpload(upload.tempPath).catch(() => {
            console.error("Temporary upload cleanup failed.");
        });
    }
}

function insertMediaRecord(storageKey, originalFilename, processed) {
    return mediaRepository.insertMediaAsset({
        originalFilename,
        storageKey,
        mimeType: processed.mimeType,
        sizeBytes: processed.buffer.length
    });
}

function isFilenameConstraintError(error) {
    return error !== null
        && typeof error === "object"
        && error.code === "23514"
        && error.constraint === "media_assets_original_filename_safe";
}

async function removeStoredMedia(storageKey) {
    await removeStoredFile(storageKey).catch(() => {
        console.error("Stored media cleanup failed.");
    });
}

async function listMediaAssets() {
    return mediaRepository.listMediaAssets();
}

async function renameMediaAsset(id, originalFilename) {
    const asset = await mediaRepository.updateMediaFilename(id, originalFilename);

    if (asset === null) {
        throw createHttpError(404, "Media asset not found.");
    }

    return asset;
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
    openMediaFile,
    renameMediaAsset
};
