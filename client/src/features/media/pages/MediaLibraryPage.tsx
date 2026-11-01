import { Link } from "react-router-dom";
import LogoutButton from "../../auth/components/LogoutButton.tsx";
import MediaManager from "../components/MediaManager.tsx";

const navLinkClassName = "inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40";

function MediaLibraryPage() {
    return (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                        Media Library
                    </h1>
                    <Link to="/boards" className={navLinkClassName}>
                        Boards
                    </Link>
                    <Link to="/displays" className={navLinkClassName}>
                        Displays
                    </Link>
                </div>
                <LogoutButton />
            </header>
            <main className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                <MediaManager />
            </main>
        </div>
    );
}

export default MediaLibraryPage;
