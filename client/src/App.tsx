import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/home";
import Game from "./components/board";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  );
}

export default App;