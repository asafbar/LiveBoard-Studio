import { BrowserRouter, Route, Routes } from "react-router-dom";
import DisplayPage from "./features/display/pages/DisplayPage.tsx";
import DisplaysPage from "./features/display/pages/DisplaysPage.tsx";
import ScreenPage from "./features/display/pages/ScreenPage.tsx";
import StudioPage from "./features/editor/pages/StudioPage.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StudioPage />} />
                <Route path="/displays" element={<DisplaysPage />} />
                <Route path="/display/:boardId" element={<DisplayPage />} />
                <Route path="/screens/:displayId" element={<ScreenPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
