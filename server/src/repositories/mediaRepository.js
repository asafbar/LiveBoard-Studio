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

module.exports = {
    listMediaAssets,
    findMediaAssetById
};
