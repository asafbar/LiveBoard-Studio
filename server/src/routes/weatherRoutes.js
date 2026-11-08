const express = require("express");
const weatherController = require("../controllers/weatherController");
const { requireAdmin } = require("../middleware/authMiddleware");
const { limitPublicWeather } = require("../services/weather/weatherRateLimit");
const {
    validateForecastQuery,
    validateLocationQuery
} = require("../validators/weatherValidator");

const router = express.Router();

// Location search can fan out into the geocoding provider, so it stays
// behind the administrator session. Published displays call only the
// forecast route, which accepts coordinates and never a remote URL.
router.get(
    "/locations",
    requireAdmin,
    validateLocationQuery,
    weatherController.searchLocations
);

router.get(
    "/",
    limitPublicWeather,
    validateForecastQuery,
    weatherController.getForecast
);

module.exports = router;
