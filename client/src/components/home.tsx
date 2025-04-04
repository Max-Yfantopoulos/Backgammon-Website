import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const Backend_Url = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

function Home() {
  const navigate = useNavigate();

  const [names, setNames] = useState({ name1: "", name2: "" });
  const [shakingName, setShakingName] = useState<{ [key: string]: boolean }>({});

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target;
    setNames((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const triggerShake = (buttonId: string) => {
    setShakingName((prev) => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setShakingName((prev) => ({ ...prev, [buttonId]: false }));
    }
    , 1950);
  };

  const handleClick = async (position: number) => {
    console.log("You clicked on box:", position);
    console.log("Backend URL:", Backend_Url);
    if (position == 0 && names.name1) {
      try {
        console.log("Sending request to startvsAI with:", names.name1);
        const response = await fetch(`${Backend_Url}/api/startvsAI`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: names.name1,
          }),
        });
        const data = await response.json();
        const gameId = data.game_id;
        sessionStorage.setItem("game_id", gameId);
        console.log("Sendinsup");
        navigate("/game");
      } catch (error) {
        console.error("Error rolling:", error);
      }
    } else if (position == 0 && !names.name1) {
      triggerShake("first-name-input");
    } else if (position == 1 && names.name1 && names.name2) {
      try {
        console.log(
          "Sending request to startvsUser with:",
          names.name1,
          names.name2
        );
        const response = await fetch(`${Backend_Url}/api/startvsUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name1: names.name1,
            name2: names.name2,
          }),
        });
        const data = await response.json();
        const gameId = data.game_id;
        sessionStorage.setItem("game_id", gameId);
        console.log("USER GAME!!");
        navigate("/game");
      } catch (error) {
        console.error("Error rolling:", error);
      }
    } else if (position == 1 && !names.name1 && names.name2) {
      triggerShake("first-name-input");
    } else if (position == 1 && names.name1 && !names.name2) {
      triggerShake("second-name-input");
    } else if (position == 1 && !names.name1 && !names.name2) {
      triggerShake("first-name-input");
      triggerShake("second-name-input");
    }
  };

  return (
    <div className="container">
      <div className="welcome">Welcome To Maxgammon!</div>
      <div className={`name-input-container name-input-container-1 ${shakingName["first-name-input"] ? "shake" : ""}`}>
        <label htmlFor="name1">Player 1: </label>
        <input
          className="name-input"
          type="text"
          id="name1"
          value={names.name1}
          onChange={handleInputChange}
          placeholder="Type your name"
        />
      </div>
      <div className={`name-input-container name-input-container-2 ${shakingName["second-name-input"] ? "shake" : ""}`}>
        <label htmlFor="name2">Player 2: </label>
        <input
          className="name-input"
          type="text"
          id="name2"
          value={names.name2}
          onChange={handleInputChange}
          placeholder="Type your name"
        />
      </div>
      <div className="button-container">
        <button className="AI-button" onClick={() => handleClick(0)}>
          Play AI
        </button>
        <button className="Multiplayer-button" onClick={() => handleClick(1)}>
          Play Multiplayer
        </button>
      </div>
    </div>
  );
}

export default Home;
