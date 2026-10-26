const express = require("express");
const boardController = require("../controllers/boardController");
const {
    validateBoardId,
    validateDraft
} = require("../validators/boardValidator");

const router = express.Router();

// Local development only. These routes are not authenticated.
router.get("/", boardController.listBoards);

router.get(
    "/:id",
    validateBoardId,
    boardController.getBoard
);

router.put(
    "/:id/draft",
    validateBoardId,
    validateDraft,
    boardController.replaceDraft
);

module.exports = router;
