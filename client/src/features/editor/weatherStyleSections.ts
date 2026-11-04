const weatherStyleSections = [
    { id: "design", label: "Design & Layout", defaultOpen: true },
    { id: "title", label: "Title & Typography", defaultOpen: false },
    { id: "content", label: "Weather Content", defaultOpen: false },
    { id: "colors", label: "Colors & Background", defaultOpen: false },
    { id: "updates", label: "Live Updates", defaultOpen: false },
] as const;

type WeatherStyleSectionId = (typeof weatherStyleSections)[number]["id"];

type WeatherStyleSectionState = Record<WeatherStyleSectionId, boolean>;

function initialWeatherStyleSections(): WeatherStyleSectionState {
    return {
        design: true,
        title: false,
        content: false,
        colors: false,
        updates: false,
    };
}

function toggleWeatherStyleSection(
    open: WeatherStyleSectionState,
    id: WeatherStyleSectionId,
): WeatherStyleSectionState {
    return {
        ...open,
        [id]: !open[id],
    };
}

export type { WeatherStyleSectionId, WeatherStyleSectionState };
export {
    initialWeatherStyleSections,
    toggleWeatherStyleSection,
    weatherStyleSections,
};
