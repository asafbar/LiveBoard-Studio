type NewsTimerApi = {
    set: (callback: () => void, delay: number) => number;
    clear: (id: number) => void;
    hidden: () => boolean;
};

type HeadlineRotation = {
    start: () => void;
    stop: () => void;
    onVisibility: () => void;
};

function nextHeadlineIndex(index: number, count: number): number {
    if (count <= 1) {
        return 0;
    }

    const current = Number.isInteger(index) && index >= 0 ? index : 0;

    return (current + 1) % count;
}

function createHeadlineRotation(options: {
    count: number;
    intervalMs: number;
    timers: NewsTimerApi;
    onIndex: (index: number) => void;
}): HeadlineRotation {
    let timerId: number | null = null;
    let index = 0;
    let stopped = false;

    function clearTimer() {
        if (timerId === null) {
            return;
        }

        options.timers.clear(timerId);
        timerId = null;
    }

    function arm() {
        clearTimer();

        if (stopped || options.timers.hidden() || options.count < 2) {
            return;
        }

        timerId = options.timers.set(() => {
            index = nextHeadlineIndex(index, options.count);
            options.onIndex(index);
            arm();
        }, Math.max(1000, options.intervalMs));
    }

    function start() {
        index = 0;
        options.onIndex(0);
        arm();
    }

    function stop() {
        stopped = true;
        clearTimer();
    }

    function onVisibility() {
        if (options.timers.hidden()) {
            clearTimer();
            return;
        }

        arm();
    }

    return {
        start,
        stop,
        onVisibility,
    };
}

export type { HeadlineRotation, NewsTimerApi };
export { createHeadlineRotation, nextHeadlineIndex };
