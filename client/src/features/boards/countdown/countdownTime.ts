const countdownTimeZones = [
    "Asia/Jerusalem",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Dubai",
    "Asia/Tokyo",
    "Australia/Sydney",
] as const;

type CountdownTimeZone = (typeof countdownTimeZones)[number];

type CountdownWallTime = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

type CountdownUnitFlags = {
    showDays: boolean;
    showHours: boolean;
    showMinutes: boolean;
    showSeconds: boolean;
};

type CountdownRemaining = {
    completed: boolean;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
};

type CountdownTicker = {
    start: () => void;
    stop: () => void;
    onVisibility: () => void;
};

type CountdownTickerOptions = {
    showSeconds: boolean;
    now: () => number;
    onTick: (now: number) => void;
    schedule: (callback: () => void, delay: number) => number;
    cancel: (timerId: number) => void;
    isHidden: () => boolean;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const unitSizes = [
    ["days", 86400],
    ["hours", 3600],
    ["minutes", 60],
    ["seconds", 1],
] as const;

function isCountdownTimeZone(value: string): value is CountdownTimeZone {
    return countdownTimeZones.some((zone) => zone === value);
}

function readWallTime(targetDate: string, targetTime: string): CountdownWallTime | null {
    const date = datePattern.exec(targetDate);
    const time = timePattern.exec(targetTime);

    if (date === null || time === null) {
        return null;
    }

    const year = Number(date[1]);
    const month = Number(date[2]);
    const day = Number(date[3]);
    const hour = Number(time[1]);
    const minute = Number(time[2]);
    const second = time[3] === undefined ? 0 : Number(time[3]);
    const probe = new Date(Date.UTC(year, month - 1, day));

    if (
        month < 1
        || month > 12
        || hour > 23
        || minute > 59
        || second > 59
        || probe.getUTCFullYear() !== year
        || probe.getUTCMonth() !== month - 1
        || probe.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day, hour, minute, second };
}

function wallParts(epoch: number, timeZone: string): CountdownWallTime | null {
    let formatter: Intl.DateTimeFormat;

    try {
        formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return null;
    }

    const parts: Record<string, string> = {};

    formatter.formatToParts(new Date(epoch)).forEach((part) => {
        if (part.type !== "literal") {
            parts[part.type] = part.value;
        }
    });

    const hour = parts.hour === "24" ? 0 : Number(parts.hour);

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour,
        minute: Number(parts.minute),
        second: Number(parts.second),
    };
}

function offsetMs(epoch: number, timeZone: string): number | null {
    const parts = wallParts(epoch, timeZone);

    if (parts === null || parts.hour === undefined || Number.isNaN(parts.year)) {
        return null;
    }

    const zonedAsUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );

    return zonedAsUtc - epoch;
}

function sameWallTime(first: CountdownWallTime, second: CountdownWallTime): boolean {
    return first.year === second.year
        && first.month === second.month
        && first.day === second.day
        && first.hour === second.hour
        && first.minute === second.minute
        && first.second === second.second;
}

function wallSortKey(parts: CountdownWallTime): number {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function zonedWallTimeToEpoch(wall: CountdownWallTime, timeZone: string): number | null {
    const desired = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
    const offsets = new Set<number>();
    let probe = desired;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const offset = offsetMs(probe, timeZone);

        if (offset === null) {
            return null;
        }

        offsets.add(offset);
        probe = desired - offset;
    }

    const matches: number[] = [];

    offsets.forEach((offset) => {
        const candidate = desired - offset;
        const parts = wallParts(candidate, timeZone);

        if (parts !== null && sameWallTime(parts, wall)) {
            matches.push(candidate);
        }
    });

    if (matches.length > 0) {
        return Math.min(...matches);
    }

    let forward: number | null = null;

    offsets.forEach((offset) => {
        const candidate = desired - offset;
        const parts = wallParts(candidate, timeZone);

        if (parts === null || wallSortKey(parts) < wallSortKey(wall)) {
            return;
        }

        if (forward === null || candidate < forward) {
            forward = candidate;
        }
    });

    return forward ?? probe;
}

function countdownTargetEpoch(targetDate: string, targetTime: string, timeZone: string): number | null {
    if (!isCountdownTimeZone(timeZone)) {
        return null;
    }

    const wall = readWallTime(targetDate, targetTime);

    if (wall === null) {
        return null;
    }

    return zonedWallTimeToEpoch(wall, timeZone);
}

function countdownRemaining(
    targetEpoch: number | null,
    nowEpoch: number,
    units: CountdownUnitFlags,
): CountdownRemaining {
    if (targetEpoch === null || !Number.isFinite(targetEpoch) || !Number.isFinite(nowEpoch) || nowEpoch >= targetEpoch) {
        return {
            completed: true,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };
    }

    let rest = Math.floor((targetEpoch - nowEpoch) / 1000);
    const values = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    };
    const shownUnits = {
        days: units.showDays,
        hours: units.showHours,
        minutes: units.showMinutes,
        seconds: units.showSeconds,
    };
    let shown = false;

    unitSizes.forEach(([name, size]) => {
        if (!shownUnits[name]) {
            return;
        }

        shown = true;
        values[name] = Math.floor(rest / size);
        rest -= values[name] * size;
    });

    if (!shown) {
        values.hours = Math.floor(rest / 3600);
        values.minutes = Math.floor((rest % 3600) / 60);
    }

    return {
        completed: false,
        days: values.days,
        hours: values.hours,
        minutes: values.minutes,
        seconds: values.seconds,
    };
}

function nextCountdownDelay(nowEpoch: number, showSeconds: boolean): number {
    const interval = showSeconds ? 1000 : 60000;
    const remainder = nowEpoch % interval;

    return remainder === 0 ? interval : interval - remainder;
}

function createCountdownTicker(options: CountdownTickerOptions): CountdownTicker {
    let active = false;
    let timerId = 0;

    function arm(report: boolean) {
        if (!active || options.isHidden()) {
            return;
        }

        const current = options.now();

        if (report) {
            options.onTick(current);
        }

        timerId = options.schedule(() => {
            arm(true);
        }, nextCountdownDelay(options.now(), options.showSeconds));
    }

    return {
        start() {
            active = true;
            arm(false);
        },
        stop() {
            active = false;
            options.cancel(timerId);
        },
        onVisibility() {
            options.cancel(timerId);
            arm(true);
        },
    };
}

export type {
    CountdownRemaining,
    CountdownTicker,
    CountdownTimeZone,
    CountdownUnitFlags,
    CountdownWallTime,
};
export {
    countdownRemaining,
    countdownTargetEpoch,
    countdownTimeZones,
    createCountdownTicker,
    isCountdownTimeZone,
    nextCountdownDelay,
    readWallTime,
    zonedWallTimeToEpoch,
};
