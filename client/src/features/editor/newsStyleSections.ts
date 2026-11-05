const newsStyleSections = [
    { id: "design", label: "Design & Layout", defaultOpen: true },
    { id: "title", label: "Title & Typography", defaultOpen: false },
    { id: "content", label: "News Content", defaultOpen: false },
    { id: "colors", label: "Colors & Background", defaultOpen: false },
    { id: "updates", label: "Live Updates", defaultOpen: false },
] as const;

type NewsStyleSectionId = (typeof newsStyleSections)[number]["id"];

type NewsStyleSectionState = Record<NewsStyleSectionId, boolean>;

function initialNewsStyleSections(): NewsStyleSectionState {
    return {
        design: true,
        title: false,
        content: false,
        colors: false,
        updates: false,
    };
}

function toggleNewsStyleSection(
    open: NewsStyleSectionState,
    id: NewsStyleSectionId,
): NewsStyleSectionState {
    return {
        ...open,
        [id]: !open[id],
    };
}

export type { NewsStyleSectionId, NewsStyleSectionState };
export {
    initialNewsStyleSections,
    newsStyleSections,
    toggleNewsStyleSection,
};
