const express = require("express");
const displayController = require("../controllers/displayController");
const {
    validateCreateDisplay,
    validateDisplayId,
    validateUpdateDisplay
} = require("../validators/displayValidator");

const router = express.Router();

// Local development administration only.
// A display id does not prove device identity or authorization.
// Online status is untrusted presence until device authentication exists.
router.get("/", displayController.listDisplays);

router.get(
    "/:id",
    validateDisplayId,
    displayController.getDisplay
);

router.post(
    "/",
    validateCreateDisplay,
    displayController.createDisplay
);

router.patch(
    "/:id",
    validateDisplayId,
    validateUpdateDisplay,
    displayController.updateDisplay
);

module.exports = router;
