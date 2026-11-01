const { pool } = require("../config/db");

async function listBoards() {
    // Count draft widgets and publication in SQL so the list does not load full documents.
    const result = await pool.query(
        `SELECT id,
                name,
                created_at,
                updated_at,
                (published IS NOT NULL) AS is_published,
                CASE
                    WHEN jsonb_typeof(draft -> 'widgets') = 'array'
                        THEN jsonb_array_length(draft -> 'widgets')
                    ELSE 0
                END AS widget_count
         FROM boards
         ORDER BY created_at ASC, id ASC`
    );

    return result.rows;
}

async function listBoardIdentities() {
    const result = await pool.query(
        `SELECT name, draft->>'id' AS draft_id
         FROM boards`
    );

    return result.rows;
}

async function findPublishedBoardById(id) {
    const result = await pool.query(
        `SELECT id, published
         FROM boards
         WHERE id = $1::uuid`,
        [id]
    );

    return result.rows[0] || null;
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

async function insertBoard(name, draft) {
    const result = await pool.query(
        `INSERT INTO boards (name, draft, published)
         VALUES ($1, $2::jsonb, NULL)
         RETURNING id, name, draft, published, created_at, updated_at`,
        [name, JSON.stringify(draft)]
    );

    return result.rows[0];
}

async function renameBoard(id, name) {
    // The administrative name is separate from the draft and published documents.
    const result = await pool.query(
        `UPDATE boards
         SET name = $2,
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING id, name, draft, published, created_at, updated_at`,
        [id, name]
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
    listBoardIdentities,
    findBoardById,
    findPublishedBoardById,
    insertBoard,
    publishDraft,
    renameBoard,
    replaceDraft
};
