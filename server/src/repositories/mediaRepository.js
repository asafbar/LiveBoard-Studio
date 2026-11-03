const { pool } = require("../config/db");

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

module.exports = {
    listMediaAssets,
    findMediaAssetById,
    insertMediaAsset,
    updateMediaFilename
};
