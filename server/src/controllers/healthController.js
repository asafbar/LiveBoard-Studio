const { successResponse } = require("../utils/apiResponse");

function getHealth(req, res) {
    res.status(200).json(
        successResponse("LiveBoard Studio API is running.", {
            status: "ok"
        })
    );
}

module.exports = {
    getHealth
};
