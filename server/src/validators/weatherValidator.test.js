const assert = require("node:assert/strict");
const test = require("node:test");
const {
    validateForecastQuery,
    validateLocationQuery
} = require("./weatherValidator");

test("accepts forecast boundaries and defaults the unit to celsius", () => {
    const request = query({
        latitude: "-90",
        longitude: "180"
    });

    validateForecastQuery(request, {}, failOnError);
    assert.deepEqual(request.weatherForecast, {
        latitude: -90,
        longitude: 180,
        units: "celsius"
    });

    const fahrenheit = query({
        latitude: "90",
        longitude: "-180",
        unit: "fahrenheit"
    });

    validateForecastQuery(fahrenheit, {}, failOnError);
    assert.equal(fahrenheit.weatherForecast.units, "fahrenheit");
});

test("rejects coordinates, units, and unknown forecast fields", () => {
    assert.equal(forecastError({
        latitude: "90.1",
        longitude: "0",
        unit: "celsius"
    }), "Latitude must be from -90 to 90.");
    assert.equal(forecastError({
        latitude: "0",
        longitude: "-180.1",
        unit: "celsius"
    }), "Longitude must be from -180 to 180.");
    assert.equal(forecastError({
        latitude: "1e2",
        longitude: "0",
        unit: "celsius"
    }), "Latitude must be a decimal number.");
    assert.equal(forecastError({
        latitude: "32",
        longitude: "34",
        unit: "kelvin"
    }), "Unit must be celsius or fahrenheit.");
    assert.equal(forecastError({
        latitude: "32",
        longitude: "34",
        unit: "celsius",
        url: "https://example.test"
    }), "Unknown field.");
    assert.equal(forecastError({
        latitude: ["32", "33"],
        longitude: "34",
        unit: "celsius"
    }), "Latitude must be a single value.");
    assert.equal(forecastError({
        longitude: "34",
        unit: "celsius"
    }), "Latitude must be a decimal number.");
});

test("accepts a bounded location query and rejects invalid search text", () => {
    const request = query({
        q: "  Tel Aviv  "
    });

    validateLocationQuery(request, {}, failOnError);
    assert.equal(request.weatherQuery, "Tel Aviv");
    assert.equal(locationError({ q: "A" }), "Search text must be at least 2 characters.");
    assert.equal(locationError({ q: " " }), "Search text must be at least 2 characters.");
    assert.equal(
        locationError({ q: "x".repeat(81) }),
        "Search text must be 80 characters or fewer."
    );
    assert.equal(
        locationError({ q: "Tel\nAviv" }),
        "Search text cannot include control characters."
    );
    assert.equal(locationError({ q: ["Tel", "Aviv"] }), "Search text must be a single value.");
    assert.equal(locationError({
        q: "Tel Aviv",
        count: "100"
    }), "Unknown field.");
    assert.equal(locationError({}), "Search text is required.");
});

function forecastError(parameters) {
    return validationError(validateForecastQuery, parameters);
}

function locationError(parameters) {
    return validationError(validateLocationQuery, parameters);
}

function validationError(validate, parameters) {
    let message = "";

    validate(query(parameters), {}, (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, "Validation failed.");
        message = error.errors[0].message;
    });

    return message;
}

function query(parameters) {
    return {
        query: parameters
    };
}

function failOnError(error) {
    if (error) {
        assert.fail(error.message);
    }
}
