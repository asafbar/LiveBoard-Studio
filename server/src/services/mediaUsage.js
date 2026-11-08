const MEDIA_FILE_PATTERN = /\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/file/gi;

function collectReferencedMediaIds(document) {
    const ids = new Set();

    collectIdsFromValue(document, ids);

    return [...ids];
}

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
    const ids = new Set();

    collectIdsFromString(value, ids);

    return ids.has(assetId);
}

function collectIdsFromValue(value, ids) {
    if (typeof value === "string") {
        collectIdsFromString(value, ids);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => {
            collectIdsFromValue(item, ids);
        });
        return;
    }

    if (value !== null && typeof value === "object") {
        Object.values(value).forEach((item) => {
            collectIdsFromValue(item, ids);
        });
    }
}

function collectIdsFromString(value, ids) {
    MEDIA_FILE_PATTERN.lastIndex = 0;
    let match = MEDIA_FILE_PATTERN.exec(value);

    while (match !== null) {
        ids.add(match[1].toLowerCase());
        match = MEDIA_FILE_PATTERN.exec(value);
    }
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
    collectMediaUsage,
    collectReferencedMediaIds
};
