const express = require("express");
const newsController = require("../controllers/newsController");
const { limitPublicNews } = require("../services/news/newsRateLimit");
const { validateNewsQuery } = require("../validators/newsValidator");

const router = express.Router();

router.get(
    "/",
    limitPublicNews,
    validateNewsQuery,
    newsController.getHeadlines
);

module.exports = router;
