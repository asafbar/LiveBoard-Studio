const boardService = require("../services/boardService");
const { successResponse } = require("../utils/apiResponse");
const {
    toBoardDetail,
    toBoardSummaryList
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
    replaceDraft
};
