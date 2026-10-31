const express = require("express");
const boardController = require("../controllers/boardController");
const {
    validateBoardId,
    validateCreateBoard,
    validateDraft
} = require("../validators/boardValidator");

const router = express.Router();

// Local development only. These routes are not authenticated.
router.get("/", boardController.listBoards);

router.post(
    "/",
    validateCreateBoard,
    boardController.createBoard
);

router.get(
    "/:id",
    validateBoardId,
    boardController.getBoard
);

// Renames the board record only. Draft and published documents are not changed.
router.patch(
    "/:id",
    validateBoardId,
    validateCreateBoard,
    boardController.renameBoard
);

router.put(
    "/:id/draft",
    validateBoardId,
    validateDraft,
    boardController.replaceDraft
);

// Publishes the draft stored in PostgreSQL. The request body is ignored.
router.post(
    "/:id/publish",
    validateBoardId,
    boardController.publishBoard
);

// Copies the saved draft onto a new unpublished board. The request body is ignored.
router.post(
    "/:id/duplicate",
    validateBoardId,
    boardController.duplicateBoard
);

module.exports = router;
