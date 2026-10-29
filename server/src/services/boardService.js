const boardRepository = require("../repositories/boardRepository");
const { notifyBoardPublished } = require("../realtime/boardRealtime");
const { createHttpError } = require("../utils/httpError");

async function listBoards() {
    return boardRepository.listBoards();
}

async function getBoard(id) {
    const board = await boardRepository.findBoardById(id);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    return board;
}

async function publishBoard(id) {
    const board = await boardRepository.publishDraft(id);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    notifyBoardPublished(board.id);
    return board;
}

async function replaceDraft(id, draft) {
    const board = await boardRepository.replaceDraft(id, draft);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    return board;
}

module.exports = {
    listBoards,
    getBoard,
    publishBoard,
    replaceDraft
};
