const fs = require("fs");
const path = require("path");
const { pool, closeDatabase } = require("../config/db");

const migrationsDirectory = path.join(__dirname, "../../db/migrations");

async function runMigrations() {
    const client = await pool.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const filenames = fs.readdirSync(migrationsDirectory)
            .filter((filename) => filename.endsWith(".sql"))
            .sort((left, right) => left.localeCompare(right, "en"));

        const applied = await client.query(
            "SELECT filename FROM schema_migrations"
        );
        const appliedFilenames = new Set(
            applied.rows.map((row) => row.filename)
        );

        for (const filename of filenames) {
            if (appliedFilenames.has(filename)) {
                console.log(`Already applied: ${filename}`);
                continue;
            }

            const sql = fs.readFileSync(
                path.join(migrationsDirectory, filename),
                "utf8"
            );

            await applyMigration(client, filename, sql);
            console.log(`Applied: ${filename}`);
        }
    } finally {
        client.release();
    }
}

async function applyMigration(client, filename, sql) {
    try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
            "INSERT INTO schema_migrations (filename) VALUES ($1)",
            [filename]
        );
        await client.query("COMMIT");
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Migration rollback failed.");
        }

        error.migrationFilename = filename;
        throw error;
    }
}

function logDatabaseError(prefix, error) {
    console.error(prefix);

    if (!error || typeof error.code !== "string" || error.code === "") {
        return;
    }

    console.error(`Database error code: ${error.code}`);

    if (/^[0-9A-Z]{5}$/.test(error.code) && typeof error.message === "string") {
        console.error(error.message);
    }
}

async function main() {
    let failed = false;

    try {
        await runMigrations();
    } catch (error) {
        failed = true;
        const filename = error && error.migrationFilename
            ? error.migrationFilename
            : "";
        const prefix = filename === ""
            ? "Database migration could not run."
            : `Migration failed: ${filename}`;

        logDatabaseError(prefix, error);
    } finally {
        try {
            await closeDatabase();
        } catch (closeError) {
            failed = true;
            console.error("Database pool failed to close.");
        }
    }

    if (failed) {
        process.exitCode = 1;
    }
}

main();
