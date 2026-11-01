require("../config/env");
const { closeDatabase } = require("../config/db");
const { createInitialAccount } = require("../services/authService");

async function main() {
    const username = readUsername(process.env.ADMIN_USERNAME);
    const password = process.env.ADMIN_PASSWORD;

    if (typeof username !== "string") {
        console.error(username === null
            ? "ADMIN_USERNAME must be 1 to 64 characters without control characters."
            : "ADMIN_USERNAME is required.");
        process.exitCode = 1;
        return;
    }

    if (password === undefined || password === "") {
        console.error("ADMIN_PASSWORD is required.");
        process.exitCode = 1;
        return;
    }

    try {
        await createInitialAccount(username, password);
        console.log(`Administrator account created for ${username}.`);
    } catch (error) {
        process.exitCode = 1;

        if (error.code === "admin-exists") {
            console.error("An administrator account already exists.");
            return;
        }

        if (error.code === "admin-password-invalid" || error.code === "admin-username-invalid") {
            console.error(error.message);
            return;
        }

        console.error("Administrator bootstrap failed.");

        if (typeof error.code === "string" && /^[0-9A-Z]{5}$/.test(error.code)) {
            console.error(`Database error code: ${error.code}`);
        }
    }
}

function readUsername(value) {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const username = value.trim();

    if (username.length > 64 || /[\u0000-\u001F\u007F]/.test(username)) {
        return null;
    }

    return username;
}

async function run() {
    try {
        await main();
    } finally {
        try {
            await closeDatabase();
        } catch (closeError) {
            process.exitCode = 1;
            console.error("Database pool failed to close.");
        }
    }
}

run();
