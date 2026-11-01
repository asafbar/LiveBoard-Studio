const boardService = require("../services/boardService");
const { successResponse } = require("../utils/apiResponse");
const {
    toBoardDetail,
    toBoardSummaryList,
    toPublicPublishedBoard
} = require("../utils/boardMapper");

async function listBoards(req, res, next) {
    try {
        const boards = await boardService.listBoards();

        res.status(200).json(
            successResponse(
                "Boards loaded successfully.",
                toBoardSummaryList(boards)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function getPublishedBoard(req, res, next) {
    try {
        const board = await boardService.getPublishedBoard(req.params.id);
        const unpublished = board.published === null;

        res.status(200).json(
            successResponse(
                unpublished
                    ? "Board is not published."
                    : "Published board loaded successfully.",
                toPublicPublishedBoard(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function getBoard(req, res, next) {
    try {
        const board = await boardService.getBoard(req.params.id);

        res.status(200).json(
            successResponse(
                "Board loaded successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function publishBoard(req, res, next) {
    try {
        const board = await boardService.publishBoard(req.params.id);

        res.status(200).json(
            successResponse(
                "Board published successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function createBoard(req, res, next) {
    try {
        const board = await boardService.createBoard(req.boardName);

        res.status(201).json(
            successResponse(
                "Board created successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function duplicateBoard(req, res, next) {
    try {
        const board = await boardService.duplicateBoard(req.params.id);

        res.status(201).json(
            successResponse(
                "Board duplicated successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function renameBoard(req, res, next) {
    try {
        const board = await boardService.renameBoard(req.params.id, req.boardName);

        res.status(200).json(
            successResponse(
                "Board renamed successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function replaceDraft(req, res, next) {
    try {
        const board = await boardService.replaceDraft(req.params.id, req.draft);

        res.status(200).json(
            successResponse(
                "Board draft saved successfully.",
                toBoardDetail(board)
            )
        );
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listBoards,
    getBoard,
    getPublishedBoard,
    createBoard,
    duplicateBoard,
    publishBoard,
    renameBoard,
    replaceDraft
};
