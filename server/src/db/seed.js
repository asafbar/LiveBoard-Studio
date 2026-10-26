const { pool, closeDatabase } = require("../config/db");
const {
    TECH_SUMMIT_BOARD_ID,
    techSummitBoard
} = require("./techSummitBoard");

const WIDGET_TYPES = new Set([
    "text",
    "clock",
    "image",
    "information-card",
    "announcements"
]);

const CLIENT_IMAGE_PATHS = [
    "/media/tech-summit/conference-hero.png",
    "/media/tech-summit/networking.png",
    "/media/tech-summit/next-session.png"
];

function assertSeed(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function validateTechSummitBoard(board) {
    assertSeed(board.id === "tech-summit-2026", "Board id does not match the client sample.");
    assertSeed(board.name === "Tech Summit 2026", "Board name does not match the client sample.");
    assertSeed(board.width === 1920 && board.height === 1080, "Board dimensions are invalid.");
    assertSeed(
        board.background
        && board.background.type === "gradient"
        && typeof board.background.from === "string"
        && typeof board.background.to === "string"
        && board.background.angle === 155,
        "Board background does not match the client sample."
    );
    assertSeed(Array.isArray(board.widgets) && board.widgets.length === 7, "Board widgets are invalid.");

    const widgetIds = [];

    for (const widget of board.widgets) {
        assertSeed(typeof widget.id === "string" && widget.id !== "", "A widget is missing an id.");
        assertSeed(WIDGET_TYPES.has(widget.type), `Widget type is not supported: ${widget.type}`);
        assertSeed(
            widget.layout
            && Number.isFinite(widget.layout.x)
            && Number.isFinite(widget.layout.y)
            && Number.isFinite(widget.layout.width)
            && Number.isFinite(widget.layout.height),
            `Widget layout is invalid: ${widget.id}`
        );
        assertSeed(widget.settings && typeof widget.settings === "object", `Widget settings are missing: ${widget.id}`);
        widgetIds.push(widget.id);
    }

    assertSeed(new Set(widgetIds).size === widgetIds.length, "Widget ids must be unique.");

    const serialized = JSON.stringify(board);

    for (const imagePath of CLIENT_IMAGE_PATHS) {
        assertSeed(serialized.includes(imagePath), `Missing client image path: ${imagePath}`);
    }
}

async function seedTechSummitBoard() {
    validateTechSummitBoard(techSummitBoard);

    const result = await pool.query(
        `INSERT INTO boards (id, name, draft, published)
         VALUES ($1::uuid, $2, $3::jsonb, NULL)
         ON CONFLICT (id) DO NOTHING`,
        [
            TECH_SUMMIT_BOARD_ID,
            techSummitBoard.name,
            JSON.stringify(techSummitBoard)
        ]
    );

    if (result.rowCount === 1) {
        console.log("Tech Summit board inserted.");
        return;
    }

    console.log("Tech Summit board already exists. Draft was left unchanged.");
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
        await seedTechSummitBoard();
    } catch (error) {
        failed = true;

        if (error && typeof error.code !== "string") {
            console.error(`Seed data is invalid. ${error.message}`);
        } else {
            logDatabaseError("Database seed could not run.", error);
        }
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
