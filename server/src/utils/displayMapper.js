const { isDisplayOnline } = require("../realtime/displayPresence");

function toDisplay(row) {
    return {
        id: row.id,
        name: row.name,
        boardId: row.board_id,
        online: isDisplayOnline(row.id),
        createdAt: toIsoString(row.created_at),
        updatedAt: toIsoString(row.updated_at)
    };
}

function toDisplayList(rows) {
    return rows.map(toDisplay);
}

function toIsoString(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

module.exports = {
    toDisplay,
    toDisplayList
};
