const weatherService = require("../services/weatherService");
const { successResponse } = require("../utils/apiResponse");

async function searchLocations(req, res, next) {
    try {
        const result = await weatherService.searchLocations(req.weatherQuery);

        res.status(200).json(successResponse(
            "Locations loaded successfully.",
            result
        ));
    } catch (error) {
        next(error);
    }
}

async function getForecast(req, res, next) {
    try {
        const forecast = await weatherService.getForecast(
            req.weatherForecast.latitude,
            req.weatherForecast.longitude,
            req.weatherForecast.units
        );

        res.status(200).json(successResponse(
            "Weather loaded successfully.",
            forecast
        ));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    searchLocations,
    getForecast
};
