import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router-dom";
import BoardsPage from "./features/boards/pages/BoardsPage.tsx";
import DisplayPage from "./features/display/pages/DisplayPage.tsx";
import DisplaysPage from "./features/display/pages/DisplaysPage.tsx";
import ScreenPage from "./features/display/pages/ScreenPage.tsx";
import StudioPage from "./features/editor/pages/StudioPage.tsx";

function StudioRoute() {
    const { boardId = "" } = useParams();

    return <StudioPage key={boardId} />;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/boards" replace />,
    },
    {
        path: "/studio/:boardId",
        element: <StudioRoute />,
    },
    {
        path: "/boards",
        element: <BoardsPage />,
    },
    {
        path: "/displays",
        element: <DisplaysPage />,
    },
    {
        path: "/display/:boardId",
        element: <DisplayPage />,
    },
    {
        path: "/screens/:displayId",
        element: <ScreenPage />,
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
