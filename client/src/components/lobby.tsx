import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/lobby.css";

function OnlineGame() {
  const navigate = useNavigate();

  const [names, setNames] = useState({ name1: "", name2: "" });
  const [shakingName, setShakingName] = useState<{ [key: string]: boolean }>(
    {}
  );

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
    }, 1950);
  };

  const handleClick = async (position: number) => {
    console.log("You clicked on box:", position);
    if (position == -1) {
      navigate("/");
    } else if (position == 0 && names.name1) {
      navigate("/online");
    } else if (position == 0 && !names.name1) {
      triggerShake("first-name-input");
    } else if (position == 1) {
      navigate("/online");
    }
  };

  return (
    <div className="container">
      <button className="home" onClick={() => handleClick(-1)}>
        ↵
      </button>
      <h1>Maxgammon Lobby</h1>
      <div
        className={`name-input-container ${
          shakingName["first-name-input"] ? "shake-home" : ""
        }`}
      >
        <label htmlFor="name1">Player 1: </label>
        <input
          className="name-input"
          type="text"
          id="name1"
          value={names.name1}
          onChange={handleInputChange}
          placeholder="Enter game code"
        />
      </div>
      <div className="button-container">
        <button className="lobby-button" onClick={() => handleClick(0)}>
          Play Friend
        </button>
        <button className="lobby-button" onClick={() => handleClick(1)}>
          Play Random
        </button>
      </div>
    </div>
  );
}

export default OnlineGame;
