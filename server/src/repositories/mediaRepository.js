const { pool } = require("../config/db");
const { collectMediaUsage } = require("../services/mediaUsage");

async function listMediaAssets() {
    const result = await pool.query(
        `SELECT id,
                original_filename,
                storage_key,
                mime_type,
                size_bytes,
                created_at
         FROM media_assets
         ORDER BY created_at DESC, id ASC`
    );

    return result.rows;
}

async function findMediaAssetById(id) {
    const result = await pool.query(
        `SELECT id,
                original_filename,
                storage_key,
                mime_type,
                size_bytes,
                created_at
         FROM media_assets
         WHERE id = $1::uuid`,
        [id]
    );

    return result.rows[0] || null;
}

async function insertMediaAsset(asset) {
    const result = await pool.query(
        `INSERT INTO media_assets (
             original_filename,
             storage_key,
             mime_type,
             size_bytes
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id,
                   original_filename,
                   storage_key,
                   mime_type,
                   size_bytes,
                   created_at`,
        [
            asset.originalFilename,
            asset.storageKey,
            asset.mimeType,
            asset.sizeBytes
        ]
    );

    return result.rows[0];
}

async function updateMediaFilename(id, originalFilename) {
    const result = await pool.query(
        `UPDATE media_assets
         SET original_filename = $2
         WHERE id = $1::uuid
         RETURNING id,
                   original_filename,
                   storage_key,
                   mime_type,
                   size_bytes,
                   created_at`,
        [id, originalFilename]
    );

    return result.rows[0] || null;
}

async function deleteUnreferencedMediaAsset(id) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        // Block board inserts and document updates before reading usage.
        // Share locks do not block each other, so the media row lock below
        // serializes two deletions of the same asset.
        await client.query("LOCK TABLE boards IN SHARE ROW EXCLUSIVE MODE");

        const assetResult = await client.query(
            `SELECT id,
                    original_filename,
                    storage_key,
                    mime_type,
                    size_bytes,
                    created_at
             FROM media_assets
             WHERE id = $1::uuid
             FOR UPDATE`,
            [id]
        );
        const asset = assetResult.rows[0] || null;

        if (asset === null) {
            await client.query("ROLLBACK");
            return {
                outcome: "missing"
            };
        }

        const boards = await client.query(
            `SELECT id, name, draft, published
             FROM boards
             ORDER BY name ASC, id ASC`
        );
        const usage = collectMediaUsage(asset.id, boards.rows);

        if (usage.referenced) {
            await client.query("ROLLBACK");
            return {
                outcome: "referenced",
                usage
            };
        }

        await client.query(
            `DELETE FROM media_assets
             WHERE id = $1::uuid`,
            [id]
        );
        await client.query("COMMIT");

        return {
            outcome: "deleted",
            asset
        };
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Media deletion rollback failed.");
        }

        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    listMediaAssets,
    findMediaAssetById,
    insertMediaAsset,
    updateMediaFilename,
    deleteUnreferencedMediaAsset
};
