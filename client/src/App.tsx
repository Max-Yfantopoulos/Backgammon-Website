import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/home";
import Local from "./components/local";
import Online from "./components/online";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/local" element={<Local />} />
        <Route path="/online" element={<Online />} />
      </Routes>
    </Router>
  );
}

export default App;
