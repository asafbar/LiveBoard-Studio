const express = require("express");
const mediaController = require("../controllers/mediaController");
const {
    requireAdmin,
    requireCsrf
} = require("../middleware/authMiddleware");
const {
    gateUploads,
    parseMediaUpload
} = require("../middleware/mediaUpload");
const {
    validateMediaId,
    validateUploadedFile
} = require("../validators/mediaValidator");

const router = express.Router();

// Metadata requires an administrator session.
// File bytes stay public so a published display can load an image
// whose file URL is already stored in the board.
// Deletion is not implemented. The upload gate bounds decode work
// before the multipart parser writes a temporary file.
router.post(
    "/",
    requireAdmin,
    requireCsrf,
    gateUploads,
    parseMediaUpload,
    validateUploadedFile,
    mediaController.uploadMedia
);

router.get(
    "/",
    requireAdmin,
    mediaController.listMedia
);

router.get(
    "/:id/file",
    validateMediaId,
    mediaController.getMediaFile
);

router.get(
    "/:id",
    requireAdmin,
    validateMediaId,
    mediaController.getMedia
);

module.exports = router;
