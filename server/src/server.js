const env = require("./config/env");
const app = require("./app");

const SHUTDOWN_TIMEOUT_MS = 10000;

const server = app.listen(env.port, () => {
    console.log(`LiveBoard Studio API listening on port ${env.port} (${env.nodeEnv})`);
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.port} is already in use.`);
    } else {
        console.error("LiveBoard Studio API failed to start.");
    }

    process.exit(1);
});

let shuttingDown = false;

function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log(`${signal} received. Closing HTTP server.`);

    const forceTimer = setTimeout(() => {
        console.error("HTTP server did not close in time.");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    server.close((error) => {
        clearTimeout(forceTimer);

        if (error) {
            console.error("HTTP server failed to close.");
            process.exit(1);
            return;
        }

        process.exit(0);
    });
}

process.on("SIGINT", () => {
    shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    shutdown("SIGTERM");
});
