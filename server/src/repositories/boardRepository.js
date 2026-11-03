const { pool } = require("../config/db");
const { collectReferencedMediaIds } = require("../services/mediaUsage");

const MEDIA_REFERENCE_MISSING = "MEDIA_REFERENCE_MISSING";

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

async function listBoardDocuments() {
    const result = await pool.query(
        `SELECT id, name, draft, published
         FROM boards
         ORDER BY name ASC, id ASC`
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
    return withBoardDocumentWrite(async (client) => {
        await assertMediaReferencesAvailable(client, draft);

        const result = await client.query(
            `INSERT INTO boards (name, draft, published)
             VALUES ($1, $2::jsonb, NULL)
             RETURNING id, name, draft, published, created_at, updated_at`,
            [name, JSON.stringify(draft)]
        );

        return result.rows[0];
    });
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
    return withBoardDocumentWrite(async (client) => {
        await assertMediaReferencesAvailable(client, draft);

        const result = await client.query(
            `UPDATE boards
             SET draft = $2::jsonb,
                 updated_at = NOW()
             WHERE id = $1::uuid
             RETURNING id, name, draft, published, created_at, updated_at`,
            [id, JSON.stringify(draft)]
        );

        return result.rows[0] || null;
    });
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

async function withBoardDocumentWrite(write) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        // Take the table lock before media row locks. Deletion uses the same
        // order, so a save cannot store a media URL while that asset is being removed.
        await client.query("LOCK TABLE boards IN ROW EXCLUSIVE MODE");
        const result = await write(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Board write rollback failed.");
        }

        throw error;
    } finally {
        client.release();
    }
}

async function assertMediaReferencesAvailable(client, document) {
    const mediaIds = collectReferencedMediaIds(document);

    if (mediaIds.length === 0) {
        return;
    }

    const result = await client.query(
        `SELECT id
         FROM media_assets
         WHERE id = ANY($1::uuid[])
         FOR SHARE`,
        [mediaIds]
    );

    if (result.rows.length !== mediaIds.length) {
        const error = new Error("Referenced media is no longer available.");
        error.code = MEDIA_REFERENCE_MISSING;
        throw error;
    }
}

module.exports = {
    MEDIA_REFERENCE_MISSING,
    listBoards,
    listBoardDocuments,
    listBoardIdentities,
    findBoardById,
    findPublishedBoardById,
    insertBoard,
    publishDraft,
    renameBoard,
    replaceDraft
};
