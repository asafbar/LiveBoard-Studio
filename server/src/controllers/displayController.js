const displayService = require("../services/displayService");
const { successResponse } = require("../utils/apiResponse");
const {
    toDisplay,
    toDisplayList,
    toPublicDisplay
} = require("../utils/displayMapper");

async function listDisplays(req, res, next) {
    try {
        const displays = await displayService.listDisplays();

        res.status(200).json(
            successResponse(
                "Displays loaded successfully.",
                toDisplayList(displays)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function getDisplay(req, res, next) {
    try {
        const display = await displayService.getDisplay(req.params.id);

        res.status(200).json(
            successResponse(
                "Display loaded successfully.",
                toPublicDisplay(display)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function createDisplay(req, res, next) {
    try {
        const display = await displayService.createDisplay(req.displayInput);

        res.status(201).json(
            successResponse(
                "Display created successfully.",
                toDisplay(display)
            )
        );
    } catch (error) {
        next(error);
    }
}

async function updateDisplay(req, res, next) {
    try {
        const display = await displayService.updateDisplay(req.params.id, req.displayUpdate);

        res.status(200).json(
            successResponse(
                "Display updated successfully.",
                toDisplay(display)
            )
        );
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listDisplays,
    getDisplay,
    createDisplay,
    updateDisplay
};
