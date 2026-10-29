const { pool } = require("../config/db");

async function listBoards() {
    const result = await pool.query(
        `SELECT id, name, created_at, updated_at
         FROM boards
         ORDER BY created_at ASC, id ASC`
    );

    return result.rows;
}

async function findBoardById(id) {
    const result = await pool.query(
        `SELECT id, name, draft, published, created_at, updated_at
         FROM boards
         WHERE id = $1::uuid`,
        [id]
    );

    return result.rows[0] || null;
}

async function replaceDraft(id, draft) {
    const result = await pool.query(
        `UPDATE boards
         SET draft = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, name, draft, published, created_at, updated_at`,
        [id, JSON.stringify(draft)]
    );

    return result.rows[0] || null;
}

async function publishDraft(id) {
    // Copy the stored draft value. A later draft update does not change this snapshot.
    const result = await pool.query(
        `UPDATE boards
         SET published = draft,
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, name, draft, published, created_at, updated_at`,
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    listBoards,
    findBoardById,
    publishDraft,
    replaceDraft
};
