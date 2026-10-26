function toBoardSummary(row) {
    return {
        id: row.id,
        name: row.name,
        createdAt: toIsoString(row.created_at),
        updatedAt: toIsoString(row.updated_at)
    };
}

function toBoardDetail(row) {
    return {
        ...toBoardSummary(row),
        draft: row.draft,
        published: row.published
    };
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
    toBoardSummaryList
};
