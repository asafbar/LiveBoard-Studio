import ComponentsPanel from "../components/ComponentsPanel.tsx";
import EditorCanvas from "../components/EditorCanvas.tsx";
import PropertiesPanel from "../components/PropertiesPanel.tsx";
import StudioTopBar from "../components/StudioTopBar.tsx";

function StudioPage() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <StudioTopBar />
            <div className="flex min-h-0 flex-1">
                <ComponentsPanel />
                <EditorCanvas />
                <PropertiesPanel />
            </div>
            <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-muted">
                <p>Board resolution: 1920 x 1080</p>
                <p>Zoom 100%</p>
                <p className="inline-flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
                    Draft
                </p>
            </footer>
        </div>
    );
}

export default StudioPage;
