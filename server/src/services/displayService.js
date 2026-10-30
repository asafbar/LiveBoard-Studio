const boardRepository = require("../repositories/boardRepository");
const displayRepository = require("../repositories/displayRepository");
const { notifyDisplayAssignmentChanged } = require("../realtime/displayPresence");
const { createHttpError } = require("../utils/httpError");

async function listDisplays() {
    return displayRepository.listDisplays();
}

async function getDisplay(id) {
    const display = await displayRepository.findDisplayById(id);

    if (display === null) {
        throw createHttpError(404, "Display not found.");
    }

    return display;
}

async function createDisplay(input) {
    await ensureBoardExists(input.boardId);

    try {
        return await displayRepository.createDisplay(input.name, input.boardId);
    } catch (error) {
        throw mapDisplayWriteError(error);
    }
}

async function updateDisplay(id, update) {
    const current = await displayRepository.findDisplayById(id);

    if (current === null) {
        throw createHttpError(404, "Display not found.");
    }

    const name = Object.prototype.hasOwnProperty.call(update, "name")
        ? update.name
        : current.name;
    const boardId = Object.prototype.hasOwnProperty.call(update, "boardId")
        ? update.boardId
        : current.board_id;

    await ensureBoardExists(boardId);

    const boardChanged = !boardIdsEqual(current.board_id, boardId);

    try {
        const display = await displayRepository.updateDisplay(id, name, boardId);

        if (display === null) {
            throw createHttpError(404, "Display not found.");
        }

        if (boardChanged) {
            try {
                notifyDisplayAssignmentChanged(display.id);
            } catch {
                // The assignment is already stored. A socket failure must not fail the request.
            }
        }

        return display;
    } catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }

        throw mapDisplayWriteError(error);
    }
}

async function ensureBoardExists(boardId) {
    if (boardId === null) {
        return;
    }

    const board = await boardRepository.findBoardById(boardId);

    if (board === null) {
        throw createHttpError(400, "Validation failed.", [{
            path: "boardId",
            message: "Assigned board was not found."
        }]);
    }
}

function boardIdsEqual(left, right) {
    if (left === null || left === undefined) {
        return right === null || right === undefined;
    }

    if (right === null || right === undefined) {
        return false;
    }

    return String(left).toLowerCase() === String(right).toLowerCase();
}

function mapDisplayWriteError(error) {
    if (error && error.code === "23503") {
        return createHttpError(400, "Validation failed.", [{
            path: "boardId",
            message: "Assigned board was not found."
        }]);
    }

    if (error && error.code === "23514") {
        return createHttpError(400, "Validation failed.", [{
            path: "name",
            message: "Display name is required and must be at most 200 characters."
        }]);
    }

    return error;
}

module.exports = {
    listDisplays,
    getDisplay,
    createDisplay,
    updateDisplay
};
