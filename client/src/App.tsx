import { BrowserRouter, Route, Routes } from "react-router-dom";
import DisplayPage from "./features/display/pages/DisplayPage.tsx";
import StudioPage from "./features/editor/pages/StudioPage.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StudioPage />} />
                <Route path="/display/:boardId" element={<DisplayPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
