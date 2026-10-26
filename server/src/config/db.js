const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: env.dbPassword,
    connectionTimeoutMillis: 5000
});

pool.on("error", () => {
    console.error("Unexpected database client error.");
});

async function verifyDatabaseConnection() {
    const client = await pool.connect();

    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
}

async function closeDatabase() {
    await pool.end();
}

module.exports = {
    pool,
    verifyDatabaseConnection,
    closeDatabase
};
