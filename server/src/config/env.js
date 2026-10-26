require("dotenv").config({
    quiet: true
});

const DEFAULT_PORT = 4002;
const DEFAULT_CLIENT_URL = "http://localhost:5173";

const port = readPort(process.env.PORT);
const nodeEnv = process.env.NODE_ENV || "development";
const clientUrl = process.env.CLIENT_URL || DEFAULT_CLIENT_URL;

function readPort(rawPort) {
    if (rawPort === undefined || rawPort.trim() === "") {
        return DEFAULT_PORT;
    }

    if (!/^\d+$/.test(rawPort.trim())) {
        console.error("PORT must be an integer from 1 to 65535.");
        process.exit(1);
    }

    const parsedPort = Number(rawPort);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        console.error("PORT must be an integer from 1 to 65535.");
        process.exit(1);
    }

    return parsedPort;
}

if (clientUrl === "*") {
    console.error("CLIENT_URL must be a specific origin.");
    process.exit(1);
}

module.exports = {
    port,
    nodeEnv,
    clientUrl
};
