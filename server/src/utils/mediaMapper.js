function toMediaAsset(row) {
    return {
        id: row.id,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        sizeBytes: toSizeBytes(row.size_bytes),
        createdAt: toIsoString(row.created_at),
        fileUrl: `/api/media/${row.id}/file`
    };
}

function toMediaAssetList(rows) {
    return rows.map(toMediaAsset);
}

function toSizeBytes(value) {
    const size = typeof value === "number" ? value : Number(value);

    if (!Number.isSafeInteger(size) || size < 0) {
        return 0;
    }

    return size;
}

function toIsoString(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

module.exports = {
    toMediaAsset,
    toMediaAssetList
};
