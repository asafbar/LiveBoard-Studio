const express = require("express");
const mediaController = require("../controllers/mediaController");
const { validateMediaId } = require("../validators/mediaValidator");

const router = express.Router();

// Read-only until administrative authentication exists.
// Upload and deletion are intentionally not exposed.
router.get("/", mediaController.listMedia);

router.get(
    "/:id/file",
    validateMediaId,
    mediaController.getMediaFile
);

router.get(
    "/:id",
    validateMediaId,
    mediaController.getMedia
);

module.exports = router;
