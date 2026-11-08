import type { WeatherTemperatureUnit } from "../types/boardTypes.ts";

type WeatherRefreshMinutes = 10 | 30 | 60 | 1440;

type WeatherRefreshClock = {
    lastSuccessAt: number | null;
    lastAttemptAt: number | null;
    failureCount: number;
};

type WeatherLoadResult = "success" | "failure" | "skipped";

type WeatherTimerApi = {
    set: (callback: () => void, delay: number) => number;
    clear: (id: number) => void;
    hidden: () => boolean;
    now: () => number;
};

type WeatherRefreshController = {
    start: () => void;
    stop: () => void;
    onVisibility: () => void;
};

const weatherRefreshChoices: readonly WeatherRefreshMinutes[] = [10, 30, 60, 1440];
const legacyWeatherRefreshMinutes: WeatherRefreshMinutes = 10;
const newWeatherRefreshMinutes: WeatherRefreshMinutes = 30;
const weatherRetryDelaysMs = [60_000, 120_000, 300_000, 900_000];

function isWeatherRefreshMinutes(value: number): value is WeatherRefreshMinutes {
    return weatherRefreshChoices.includes(value as WeatherRefreshMinutes);
}

function resolveWeatherRefreshMinutes(value: number | undefined): WeatherRefreshMinutes {
    if (value !== undefined && isWeatherRefreshMinutes(value)) {
        return value;
    }

    return legacyWeatherRefreshMinutes;
}

function weatherRefreshIntervalMs(minutes: WeatherRefreshMinutes): number {
    return minutes * 60 * 1000;
}

function nextWeatherRefreshDelayMs(failureCount: number, refreshMinutes: WeatherRefreshMinutes): number {
    if (failureCount > 0) {
        const index = Math.min(failureCount, weatherRetryDelaysMs.length) - 1;

        return weatherRetryDelaysMs[index] ?? weatherRetryDelaysMs[0] ?? 60_000;
    }

    return weatherRefreshIntervalMs(refreshMinutes);
}

function remainingWeatherDelayMs(
    clock: WeatherRefreshClock,
    refreshMinutes: WeatherRefreshMinutes,
    now: number,
): number {
    const delay = nextWeatherRefreshDelayMs(clock.failureCount, refreshMinutes);
    const basis = clock.failureCount > 0
        ? clock.lastAttemptAt
        : clock.lastSuccessAt ?? clock.lastAttemptAt;

    if (basis === null) {
        return 0;
    }

    return Math.max(0, delay - (now - basis));
}

function weatherRefreshDue(
    clock: WeatherRefreshClock,
    refreshMinutes: WeatherRefreshMinutes,
    now: number,
): boolean {
    if (clock.lastAttemptAt === null && clock.lastSuccessAt === null) {
        return true;
    }

    return remainingWeatherDelayMs(clock, refreshMinutes, now) === 0;
}

function weatherForecastRequestKey(
    latitude: number,
    longitude: number,
    unit: WeatherTemperatureUnit,
): string {
    return `${latitude}:${longitude}:${unit}`;
}

function createWeatherRefreshController(options: {
    refreshMinutes: WeatherRefreshMinutes;
    timers: WeatherTimerApi;
    load: () => Promise<WeatherLoadResult>;
}): WeatherRefreshController {
    const clock: WeatherRefreshClock = {
        lastSuccessAt: null,
        lastAttemptAt: null,
        failureCount: 0,
    };
    let timerId: number | null = null;
    let stopped = false;

    function clearTimer() {
        if (timerId === null) {
            return;
        }

        options.timers.clear(timerId);
        timerId = null;
    }

    function schedule() {
        clearTimer();

        if (stopped || options.timers.hidden()) {
            return;
        }

        const delay = remainingWeatherDelayMs(clock, options.refreshMinutes, options.timers.now());

        if (delay === 0) {
            return;
        }

        timerId = options.timers.set(() => {
            void run();
        }, delay);
    }

    async function run() {
        clearTimer();

        if (stopped || options.timers.hidden()) {
            return;
        }

        clock.lastAttemptAt = options.timers.now();
        let result: WeatherLoadResult;

        try {
            result = await options.load();
        } catch {
            result = "failure";
        }

        if (stopped) {
            return;
        }

        if (result === "success") {
            clock.failureCount = 0;
            clock.lastSuccessAt = options.timers.now();
        } else if (result === "failure") {
            clock.failureCount += 1;
        }

        schedule();
    }

    function start() {
        if (options.timers.hidden()) {
            return;
        }

        void run();
    }

    function onVisibility() {
        if (options.timers.hidden()) {
            clearTimer();
            return;
        }

        if (weatherRefreshDue(clock, options.refreshMinutes, options.timers.now())) {
            void run();
            return;
        }

        schedule();
    }

    function stop() {
        stopped = true;
        clearTimer();
    }

    return {
        start,
        stop,
        onVisibility,
    };
}

export type { WeatherLoadResult, WeatherRefreshClock, WeatherRefreshController, WeatherRefreshMinutes, WeatherTimerApi };
export {
    createWeatherRefreshController,
    isWeatherRefreshMinutes,
    legacyWeatherRefreshMinutes,
    newWeatherRefreshMinutes,
    nextWeatherRefreshDelayMs,
    remainingWeatherDelayMs,
    resolveWeatherRefreshMinutes,
    weatherForecastRequestKey,
    weatherRefreshChoices,
    weatherRefreshDue,
    weatherRefreshIntervalMs,
    weatherRetryDelaysMs,
};
