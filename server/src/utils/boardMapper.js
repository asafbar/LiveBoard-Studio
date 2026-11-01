function toBoardIdentity(row) {
    return {
        id: row.id,
        name: row.name,
        createdAt: toIsoString(row.created_at),
        updatedAt: toIsoString(row.updated_at)
    };
}

function toBoardSummary(row) {
    return {
        ...toBoardIdentity(row),
        isPublished: row.is_published === true,
        widgetCount: readWidgetCount(row.widget_count)
    };
}

function toBoardDetail(row) {
    return {
        ...toBoardIdentity(row),
        draft: row.draft,
        published: row.published
    };
}

function toPublicPublishedBoard(row) {
    return {
        id: row.id,
        published: row.published
    };
}

function readWidgetCount(value) {
    const count = typeof value === "number" ? value : Number(value);

    if (!Number.isInteger(count) || count < 0) {
        return 0;
    }

    return count;
}

function toBoardSummaryList(rows) {
    return rows.map(toBoardSummary);
}

function toIsoString(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

module.exports = {
    toBoardSummary,
    toBoardDetail,
    toBoardSummaryList,
    toPublicPublishedBoard
};
