const path = require("path");
require("dotenv").config({
    quiet: true
});

const DEFAULT_PORT = 4002;
const DEFAULT_CLIENT_URL = "http://localhost:5173";
const DEFAULT_DB_HOST = "localhost";
const DEFAULT_DB_PORT = 5433;
const DEFAULT_DB_NAME = "liveboard_studio";

const port = readPort(process.env.PORT, "PORT", DEFAULT_PORT);
const nodeEnv = process.env.NODE_ENV || "development";
const clientUrl = process.env.CLIENT_URL || DEFAULT_CLIENT_URL;
const dbHost = readSetting(process.env.DB_HOST, DEFAULT_DB_HOST);
const dbPort = readPort(process.env.DB_PORT, "DB_PORT", DEFAULT_DB_PORT);
const dbName = readSetting(process.env.DB_NAME, DEFAULT_DB_NAME);
const dbUser = readRequired("DB_USER");
const dbPassword = readRequired("DB_PASSWORD");
const mediaDir = readMediaDir(process.env.MEDIA_DIR);

function readPort(rawPort, name, defaultPort) {
    if (rawPort === undefined || rawPort.trim() === "") {
        return defaultPort;
    }

    if (!/^\d+$/.test(rawPort.trim())) {
        console.error(`${name} must be an integer from 1 to 65535.`);
        process.exit(1);
    }

    const parsedPort = Number(rawPort);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        console.error(`${name} must be an integer from 1 to 65535.`);
        process.exit(1);
    }

    return parsedPort;
}

function readSetting(rawValue, fallback) {
    if (rawValue === undefined || rawValue.trim() === "") {
        return fallback;
    }

    return rawValue.trim();
}

function readMediaDir(rawValue) {
    if (rawValue === undefined || rawValue.trim() === "") {
        return path.resolve(__dirname, "../../storage/media");
    }

    const trimmed = rawValue.trim();

    if (path.isAbsolute(trimmed)) {
        return path.resolve(trimmed);
    }

    return path.resolve(__dirname, "../..", trimmed);
}

function readRequired(name) {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        console.error(`${name} is required.`);
        process.exit(1);
    }

    return value;
}

if (clientUrl === "*") {
    console.error("CLIENT_URL must be a specific origin.");
    process.exit(1);
}

module.exports = {
    port,
    nodeEnv,
    clientUrl,
    dbHost,
    dbPort,
    dbName,
    dbUser,
    dbPassword,
    mediaDir
};
