const newsService = require("../services/newsService");
const { successResponse } = require("../utils/apiResponse");

async function getHeadlines(req, res, next) {
    try {
        const headlines = await newsService.getHeadlines(req.newsQuery);

        res.status(200).json(successResponse(
            "News loaded successfully.",
            headlines
        ));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getHeadlines
};
