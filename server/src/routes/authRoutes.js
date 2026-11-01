const express = require("express");
const authController = require("../controllers/authController");
const {
    requireCsrf,
    requireSession
} = require("../middleware/authMiddleware");
const { validateLogin } = require("../validators/authValidator");

const router = express.Router();

router.post(
    "/login",
    requireCsrf,
    validateLogin,
    authController.login
);

router.post(
    "/logout",
    requireCsrf,
    requireSession,
    authController.logout
);

router.get(
    "/session",
    requireSession,
    authController.getSession
);

module.exports = router;
