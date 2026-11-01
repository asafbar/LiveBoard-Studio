const { pool } = require("../config/db");
const { SESSION_TTL_SECONDS } = require("../auth/sessionToken");

async function countAccounts() {
    const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM admin_account"
    );

    return result.rows[0].count;
}

async function findAccountByUsername(username) {
    const result = await pool.query(
        `SELECT id, username, password_hash
         FROM admin_account
         WHERE username = $1`,
        [username]
    );

    return result.rows[0] || null;
}

async function insertAccount(username, passwordHash) {
    const result = await pool.query(
        `INSERT INTO admin_account (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username`,
        [username, passwordHash]
    );

    return result.rows[0];
}

async function findActiveSession(tokenHash) {
    const result = await pool.query(
        `SELECT admin_sessions.account_id,
                admin_account.username,
                (admin_sessions.expires_at <= NOW()) AS expired
         FROM admin_sessions
         INNER JOIN admin_account
             ON admin_account.id = admin_sessions.account_id
         WHERE admin_sessions.token_hash = $1`,
        [tokenHash]
    );
    const row = result.rows[0];

    if (row === undefined) {
        return null;
    }

    if (row.expired === true) {
        await deleteSession(tokenHash);
        return null;
    }

    return {
        accountId: row.account_id,
        username: row.username
    };
}

async function replaceSession(previousTokenHash, tokenHash, accountId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query(
            "DELETE FROM admin_sessions WHERE expires_at <= NOW()"
        );

        if (previousTokenHash !== null) {
            await client.query(
                "DELETE FROM admin_sessions WHERE token_hash = $1",
                [previousTokenHash]
            );
        }

        await client.query(
            `INSERT INTO admin_sessions (token_hash, account_id, expires_at)
             VALUES ($1, $2::uuid, NOW() + ($3::int * INTERVAL '1 second'))`,
            [tokenHash, accountId, SESSION_TTL_SECONDS]
        );
        await client.query("COMMIT");
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Admin session rollback failed.");
        }

        throw error;
    } finally {
        client.release();
    }
}

async function deleteSession(tokenHash) {
    await pool.query(
        "DELETE FROM admin_sessions WHERE token_hash = $1",
        [tokenHash]
    );
}

module.exports = {
    countAccounts,
    findAccountByUsername,
    insertAccount,
    findActiveSession,
    replaceSession,
    deleteSession
};
