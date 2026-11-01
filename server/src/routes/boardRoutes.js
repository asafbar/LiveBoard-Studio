const express = require("express");
const boardController = require("../controllers/boardController");
const {
    requireAdmin,
    requireCsrf
} = require("../middleware/authMiddleware");
const {
    validateBoardId,
    validateCreateBoard,
    validateDraft
} = require("../validators/boardValidator");

const router = express.Router();

router.get(
    "/:id/published",
    validateBoardId,
    boardController.getPublishedBoard
);

router.get(
    "/",
    requireAdmin,
    boardController.listBoards
);

router.post(
    "/",
    requireAdmin,
    requireCsrf,
    validateCreateBoard,
    boardController.createBoard
);

router.get(
    "/:id",
    requireAdmin,
    validateBoardId,
    boardController.getBoard
);

// Renames the board record only. Draft and published documents are not changed.
router.patch(
    "/:id",
    requireAdmin,
    requireCsrf,
    validateBoardId,
    validateCreateBoard,
    boardController.renameBoard
);

router.put(
    "/:id/draft",
    requireAdmin,
    requireCsrf,
    validateBoardId,
    validateDraft,
    boardController.replaceDraft
);

// Publishes the draft stored in PostgreSQL. The request body is ignored.
router.post(
    "/:id/publish",
    requireAdmin,
    requireCsrf,
    validateBoardId,
    boardController.publishBoard
);

// Copies the saved draft onto a new unpublished board. The request body is ignored.
router.post(
    "/:id/duplicate",
    requireAdmin,
    requireCsrf,
    validateBoardId,
    boardController.duplicateBoard
);

module.exports = router;
