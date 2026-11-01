const express = require("express");
const mediaController = require("../controllers/mediaController");
const { validateMediaId } = require("../validators/mediaValidator");

const router = express.Router();

// Reads stay public so a published display can load stored images.
// Future upload and deletion routes must use requireAdmin and requireCsrf.
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
