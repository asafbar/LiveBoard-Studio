const http = require("http");
const env = require("./config/env");
const app = require("./app");
const {
    verifyDatabaseConnection,
    closeDatabase
} = require("./config/db");
const { sweepStaleTempUploads } = require("./storage/mediaStorage");
const {
    attachBoardRealtime,
    closeBoardRealtime
} = require("./realtime/boardRealtime");

const SHUTDOWN_TIMEOUT_MS = 10000;

let shuttingDown = false;
let databaseClosed = false;

async function closeDatabaseOnce() {
    if (databaseClosed) {
        return;
    }

    databaseClosed = true;
    await closeDatabase();
}

function logDatabaseFailure(error) {
    console.error("Database connection failed.");

    if (error && typeof error.code === "string" && error.code !== "") {
        console.error(`Database error code: ${error.code}`);
    }
}

async function startServer() {
    try {
        await verifyDatabaseConnection();
    } catch (error) {
        logDatabaseFailure(error);

        try {
            await closeDatabaseOnce();
        } catch (closeError) {
            console.error("Database pool failed to close.");
        }

        process.exit(1);
    }

    console.log("Database connection verified.");

    try {
        await sweepStaleTempUploads();
    } catch (error) {
        console.error("Temporary upload cleanup failed.");
    }

    const server = http.createServer(app);
    attachBoardRealtime(server);

    server.listen(env.port, () => {
        console.log(`LiveBoard Studio API listening on port ${env.port} (${env.nodeEnv})`);
    });

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(`Port ${env.port} is already in use.`);
        } else {
            console.error("LiveBoard Studio API failed to start.");
        }

        closeDatabaseOnce()
            .catch(() => {
                console.error("Database pool failed to close.");
            })
            .finally(() => {
                process.exit(1);
            });
    });

    function shutdown(signal) {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        console.log(`${signal} received. Closing HTTP server.`);
        closeBoardRealtime();

        const forceTimer = setTimeout(() => {
            console.error("HTTP server did not close in time.");
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);

        server.close((closeError) => {
            if (closeError) {
                clearTimeout(forceTimer);
                console.error("HTTP server failed to close.");
                process.exit(1);
                return;
            }

            closeDatabaseOnce()
                .then(() => {
                    clearTimeout(forceTimer);
                    console.log("Database pool closed.");
                    process.exit(0);
                })
                .catch(() => {
                    clearTimeout(forceTimer);
                    console.error("Database pool failed to close.");
                    process.exit(1);
                });
        });
    }

    process.on("SIGINT", () => {
        shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        shutdown("SIGTERM");
    });
}

startServer();
