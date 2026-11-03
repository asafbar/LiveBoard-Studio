const MEDIA_FILE_PATTERN = /\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/file/gi;

function collectMediaUsage(assetId, rows) {
    const normalizedId = assetId.toLowerCase();
    const boards = [];

    rows.forEach((row) => {
        const inDraft = documentReferencesAsset(row.draft, normalizedId);
        const inPublished = documentReferencesAsset(row.published, normalizedId);

        if (!inDraft && !inPublished) {
            return;
        }

        boards.push({
            id: row.id,
            name: row.name,
            inDraft,
            inPublished
        });
    });

    boards.sort(compareUsageBoards);

    return {
        assetId: normalizedId,
        referenced: boards.length > 0,
        boards
    };
}

function documentReferencesAsset(document, assetId) {
    if (document === null || document === undefined) {
        return false;
    }

    return valueReferencesAsset(document, assetId);
}

function valueReferencesAsset(value, assetId) {
    if (typeof value === "string") {
        return stringReferencesAsset(value, assetId);
    }

    if (Array.isArray(value)) {
        return value.some((item) => valueReferencesAsset(item, assetId));
    }

    if (value !== null && typeof value === "object") {
        return Object.values(value).some((item) => valueReferencesAsset(item, assetId));
    }

    return false;
}

function stringReferencesAsset(value, assetId) {
    MEDIA_FILE_PATTERN.lastIndex = 0;
    let match = MEDIA_FILE_PATTERN.exec(value);

    while (match !== null) {
        if (match[1].toLowerCase() === assetId) {
            return true;
        }

        match = MEDIA_FILE_PATTERN.exec(value);
    }

    return false;
}

function compareUsageBoards(left, right) {
    if (left.name < right.name) {
        return -1;
    }

    if (left.name > right.name) {
        return 1;
    }

    if (left.id < right.id) {
        return -1;
    }

    if (left.id > right.id) {
        return 1;
    }

    return 0;
}

module.exports = {
    collectMediaUsage
};
