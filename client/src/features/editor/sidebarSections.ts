type SidebarSectionName = "components" | "layers";

type SidebarSections = {
    componentsOpen: boolean;
    layersOpen: boolean;
};

function toggleSidebarSection(sections: SidebarSections, section: SidebarSectionName): SidebarSections {
    if (section === "components") {
        return {
            componentsOpen: !sections.componentsOpen,
            layersOpen: sections.layersOpen,
        };
    }

    return {
        componentsOpen: sections.componentsOpen,
        layersOpen: !sections.layersOpen,
    };
}

// Adding, selecting, moving, resizing, deleting, undoing, and redoing a widget
// keep the sections the user left open.
function sidebarSectionsAfterEditorAction(sections: SidebarSections): SidebarSections {
    return {
        componentsOpen: sections.componentsOpen,
        layersOpen: sections.layersOpen,
    };
}

function scrollTopForRevealedRow(
    scrollTop: number,
    listTop: number,
    listBottom: number,
    rowTop: number,
    rowBottom: number,
): number {
    if (rowTop < listTop) {
        return scrollTop - (listTop - rowTop);
    }

    if (rowBottom > listBottom) {
        return scrollTop + (rowBottom - listBottom);
    }

    return scrollTop;
}

export type { SidebarSectionName, SidebarSections };
export {
    scrollTopForRevealedRow,
    sidebarSectionsAfterEditorAction,
    toggleSidebarSection,
};
