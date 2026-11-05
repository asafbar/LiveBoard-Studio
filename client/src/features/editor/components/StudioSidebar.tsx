import { useState, type ReactNode } from "react";
import type { BoardPoint } from "../../boards/boardCoordinates.ts";
import type { Widget, WidgetType } from "../../boards/types/boardTypes.ts";
import type { LayerDropPlacement, LayerMove } from "../widgetOrder.ts";
import type { WidgetLayerChange } from "../widgetLayer.ts";
import {
    sidebarSectionsAfterEditorAction,
    toggleSidebarSection,
    type SidebarSections,
} from "../sidebarSections.ts";
import ComponentsPanel from "./ComponentsPanel.tsx";
import LayersPanel from "./LayersPanel.tsx";
import StudioIcon from "./StudioIcon.tsx";

type StudioSidebarProps = {
    widgets: Widget[];
    selectedWidgetId: string | null;
    revealedWidgetId: string | null;
    boardWidth: number;
    boardHeight: number;
    onAddWidget: (type: WidgetType) => void;
    onDropWidget: (type: WidgetType, point: BoardPoint) => void;
    onSelectWidget: (widgetId: string) => void;
    onMoveWidget: (widgetId: string, move: LayerMove) => void;
    onReorderWidget: (widgetId: string, targetId: string, placement: LayerDropPlacement) => void;
    onLayerChange: (widgetId: string, change: WidgetLayerChange) => void;
    onMoveIntoBoard: (widgetId: string) => void;
    onFitWidget: (widgetId: string) => void;
    onMoveAllInside: () => void;
};

type SidebarSectionProps = {
    title: string;
    panelId: string;
    expanded: boolean;
    className: string;
    onToggle: () => void;
    children: ReactNode;
};

function StudioSidebar({
    widgets,
    selectedWidgetId,
    revealedWidgetId,
    boardWidth,
    boardHeight,
    onAddWidget,
    onDropWidget,
    onSelectWidget,
    onMoveWidget,
    onReorderWidget,
    onLayerChange,
    onMoveIntoBoard,
    onFitWidget,
    onMoveAllInside,
}: StudioSidebarProps) {
    const [sections, setSections] = useState<SidebarSections>({
        componentsOpen: true,
        layersOpen: true,
    });
    const visibleSections = sidebarSectionsAfterEditorAction(sections);
    const componentsOpen = visibleSections.componentsOpen;
    const layersOpen = visibleSections.layersOpen;

    const componentsClassName = componentsOpen
        ? layersOpen
            ? "flex max-h-[min(18rem,42%)] min-h-0 shrink-0 flex-col border-b border-border"
            : "flex min-h-0 flex-1 flex-col border-b border-border"
        : "shrink-0 border-b border-border";
    const layersClassName = layersOpen
        ? "flex min-h-0 flex-1 flex-col"
        : "shrink-0";

    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
            <SidebarSection
                title="Components"
                panelId="sidebar-components"
                expanded={visibleSections.componentsOpen}
                className={componentsClassName}
                onToggle={() => {
                    setSections((current) => toggleSidebarSection(current, "components"));
                }}
            >
                <ComponentsPanel
                    boardWidth={boardWidth}
                    boardHeight={boardHeight}
                    onAddWidget={onAddWidget}
                    onDropWidget={onDropWidget}
                />
            </SidebarSection>
            <SidebarSection
                title="Layers"
                panelId="sidebar-layers"
                expanded={visibleSections.layersOpen}
                className={layersClassName}
                onToggle={() => {
                    setSections((current) => toggleSidebarSection(current, "layers"));
                }}
            >
                <LayersPanel
                    widgets={widgets}
                    selectedWidgetId={selectedWidgetId}
                    revealedWidgetId={revealedWidgetId}
                    onSelectWidget={onSelectWidget}
                    onMoveWidget={onMoveWidget}
                    onReorderWidget={onReorderWidget}
                    onLayerChange={onLayerChange}
                    boardWidth={boardWidth}
                    boardHeight={boardHeight}
                    onMoveIntoBoard={onMoveIntoBoard}
                    onFitWidget={onFitWidget}
                    onMoveAllInside={onMoveAllInside}
                />
            </SidebarSection>
        </aside>
    );
}

function SidebarSection({
    title,
    panelId,
    expanded,
    className,
    onToggle,
    children,
}: SidebarSectionProps) {
    return (
        <section className={className}>
            <h2 className="shrink-0">
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={onToggle}
                    className="flex h-10 w-full items-center justify-between px-3 text-left text-xs font-semibold tracking-wide text-muted uppercase outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                    <span>{title}</span>
                    <StudioIcon
                        name="chevron-down"
                        className={expanded ? "size-4 transition-transform duration-150" : "size-4 -rotate-90 transition-transform duration-150"}
                    />
                </button>
            </h2>
            {expanded ? (
                <div id={panelId} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {children}
                </div>
            ) : null}
        </section>
    );
}

export default StudioSidebar;
