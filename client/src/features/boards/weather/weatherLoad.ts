type WeatherLoadGate = {
    disposed: boolean;
    activeGeneration: number | null;
    nextGeneration: number;
};

type WeatherViewStatus = "loading" | "ready" | "unavailable";

type WeatherFreshness = "fresh" | "stale";

function createWeatherLoadGate(): WeatherLoadGate {
    return {
        disposed: false,
        activeGeneration: null,
        nextGeneration: 1,
    };
}

function startWeatherLoad(gate: WeatherLoadGate): number | null {
    if (gate.disposed || gate.activeGeneration !== null) {
        return null;
    }

    const generation = gate.nextGeneration;
    gate.nextGeneration += 1;
    gate.activeGeneration = generation;
    return generation;
}

function finishWeatherLoad(gate: WeatherLoadGate, generation: number): void {
    if (gate.activeGeneration === generation) {
        gate.activeGeneration = null;
    }
}

function disposeWeatherLoad(gate: WeatherLoadGate): void {
    gate.disposed = true;
    gate.activeGeneration = null;
}

function weatherLoadIsCurrent(gate: WeatherLoadGate, generation: number): boolean {
    return gate.disposed === false && gate.activeGeneration === generation;
}

function weatherViewAfterFailure<TForecast extends { status: WeatherFreshness }>(
    current: TForecast | null,
): { status: WeatherViewStatus; forecast: TForecast | null } {
    if (current === null) {
        return {
            status: "unavailable",
            forecast: null,
        };
    }

    return {
        status: "ready",
        forecast: {
            ...current,
            status: "stale",
        },
    };
}

export type { WeatherFreshness, WeatherLoadGate, WeatherViewStatus };
export {
    createWeatherLoadGate,
    disposeWeatherLoad,
    finishWeatherLoad,
    startWeatherLoad,
    weatherLoadIsCurrent,
    weatherViewAfterFailure,
};
