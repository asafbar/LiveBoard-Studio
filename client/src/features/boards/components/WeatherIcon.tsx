import type { ReactNode } from "react";
import type { WeatherIconName } from "../weather/weatherCodes.ts";

type WeatherIconProps = {
    name: WeatherIconName;
    className?: string;
};

function WeatherIcon({ name, className }: WeatherIconProps) {
    return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
            {iconShapes[name]}
        </svg>
    );
}

const iconShapes: Record<WeatherIconName, ReactNode> = {
    clear: (
        <>
            <circle cx="32" cy="32" r="12" />
            <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" />
        </>
    ),
    "mainly-clear": (
        <>
            <circle cx="24" cy="26" r="9" />
            <path d="M24 8v6M12 14l4 4M8 26h6M12 38l4-4" />
            <path d="M28 40h18a8 8 0 0 0 0-16 12 12 0 0 0-22-2" />
        </>
    ),
    "partly-cloudy": (
        <>
            <circle cx="22" cy="22" r="8" />
            <path d="M22 6v5M10 12l4 4M6 22h5" />
            <path d="M26 44h20a9 9 0 0 0 1-18 13 13 0 0 0-24-1" />
        </>
    ),
    cloudy: (
        <path d="M18 46h28a11 11 0 0 0 1-22 16 16 0 0 0-30-2 10 10 0 0 0 1 24Z" />
    ),
    fog: (
        <>
            <path d="M16 24h32M12 32h40M16 40h32" />
            <path d="M22 18h20" />
        </>
    ),
    drizzle: (
        <>
            <path d="M18 32h28a10 10 0 0 0 0-20 15 15 0 0 0-28 2" />
            <path d="M24 40v6M32 42v6M40 40v6" />
        </>
    ),
    rain: (
        <>
            <path d="M18 30h28a10 10 0 0 0 0-20 15 15 0 0 0-28 2" />
            <path d="M24 38l-4 10M34 38l-4 10M44 38l-4 10" />
        </>
    ),
    "freezing-rain": (
        <>
            <path d="M18 28h28a10 10 0 0 0 0-20 15 15 0 0 0-28 2" />
            <path d="M24 36l-3 8M34 36l-3 8M30 48h8M28 52h12" />
        </>
    ),
    snow: (
        <>
            <path d="M18 30h28a10 10 0 0 0 0-20 15 15 0 0 0-28 2" />
            <path d="M24 42v8M20 46h8M28 44l-8 4M20 44l8 4M40 42v8M36 46h8" />
        </>
    ),
    showers: (
        <>
            <path d="M16 28h30a9 9 0 0 0 0-18 14 14 0 0 0-26 2" />
            <path d="M22 36l-4 8M32 36l-4 8M42 36l-4 8" />
        </>
    ),
    "snow-showers": (
        <>
            <path d="M16 28h30a9 9 0 0 0 0-18 14 14 0 0 0-26 2" />
            <path d="M24 40v8M20 44h8M40 40v8M36 44h8" />
        </>
    ),
    thunder: (
        <>
            <path d="M18 30h26a9 9 0 0 0 0-18 14 14 0 0 0-26 1" />
            <path d="M34 30 26 44h8l-4 12 14-16h-8l6-10" />
        </>
    ),
    unknown: (
        <>
            <circle cx="32" cy="32" r="16" />
            <path d="M32 26v2M32 34v8" />
        </>
    ),
};

export default WeatherIcon;
