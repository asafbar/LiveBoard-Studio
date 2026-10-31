const mediaRepository = require("../repositories/mediaRepository");
const {
    MIME_EXTENSIONS,
    openFile
} = require("../storage/mediaStorage");
const { createHttpError } = require("../utils/httpError");

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
    listMediaAssets,
    getMediaAsset,
    openMediaFile
};
