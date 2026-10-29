const { pool } = require("../config/db");

async function listDisplays() {
    const result = await pool.query(
        `SELECT id, name, board_id, created_at, updated_at
         FROM displays
         ORDER BY created_at ASC, id ASC`
    );

    return result.rows;
}

async function findDisplayById(id) {
    const result = await pool.query(
        `SELECT id, name, board_id, created_at, updated_at
         FROM displays
         WHERE id = $1::uuid`,
        [id]
    );

    return result.rows[0] || null;
}

async function createDisplay(name, boardId) {
    const result = await pool.query(
        `INSERT INTO displays (name, board_id)
         VALUES ($1, $2::uuid)
         RETURNING id, name, board_id, created_at, updated_at`,
        [name, boardId]
    );

    return result.rows[0];
}

async function updateDisplay(id, name, boardId) {
    const result = await pool.query(
        `UPDATE displays
         SET name = $2,
             board_id = $3::uuid,
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, name, board_id, created_at, updated_at`,
        [id, name, boardId]
    );

    return result.rows[0] || null;
}

module.exports = {
    listDisplays,
    findDisplayById,
    createDisplay,
    updateDisplay
};
