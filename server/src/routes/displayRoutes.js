const express = require("express");
const displayController = require("../controllers/displayController");
const {
    requireAdmin,
    requireCsrf
} = require("../middleware/authMiddleware");
const {
    validateCreateDisplay,
    validateDisplayId,
    validateUpdateDisplay
} = require("../validators/displayValidator");

const router = express.Router();

// A display id does not prove device identity.
// Any client that knows the id can read this assignment and register
// as that screen. Registration does not grant board or display edits.
router.get(
    "/:id",
    validateDisplayId,
    displayController.getDisplay
);

router.get(
    "/",
    requireAdmin,
    displayController.listDisplays
);

router.post(
    "/",
    requireAdmin,
    requireCsrf,
    validateCreateDisplay,
    displayController.createDisplay
);

router.patch(
    "/:id",
    requireAdmin,
    requireCsrf,
    validateDisplayId,
    validateUpdateDisplay,
    displayController.updateDisplay
);

module.exports = router;
