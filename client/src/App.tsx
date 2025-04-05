import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/home";
import Local from "./components/local";
import Online from "./components/online";
import Lobby from "./components/lobby";
import Waiting from "./components/waiting";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/local" element={<Local />} />
        <Route path="/online" element={<Online />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/waiting" element={<Waiting />} />
      </Routes>
    </Router>
  );
}

export default App;
