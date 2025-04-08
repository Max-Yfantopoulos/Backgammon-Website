import { useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import useSound from "use-sound";
import "../styles/home.css";
import clickSound from "/assets/sounds/click-sound.wav";

function Home() {
  const navigate = useNavigate();

  const [names, setNames] = useState({ name1: "", name2: "" });
  const [shakingName, setShakingName] = useState<{ [key: string]: boolean }>(
    {}
  );

  const [playClickSound] = useSound(clickSound);

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
    if (position == 0 && names.name1) {
      playClickSound();
      navigate("/local", { state: { player_one_name: names.name1 } });
    } else if (position == 0 && !names.name1) {
      triggerShake("first-name-input");
    } else if (position == 1 && names.name1 && names.name2) {
      playClickSound();
      navigate("/local", {
        state: { player_one_name: names.name1, player_two_name: names.name2 },
      });
    } else if (position == 1 && !names.name1 && names.name2) {
      triggerShake("first-name-input");
    } else if (position == 1 && names.name1 && !names.name2) {
      triggerShake("second-name-input");
    } else if (position == 1 && !names.name1 && !names.name2) {
      triggerShake("first-name-input");
      triggerShake("second-name-input");
    } else if (position == 2 && names.name1) {
      playClickSound();
      navigate("/online", { state: { name: names.name1 } });
    } else if (position == 2 && !names.name1) {
      triggerShake("first-name-input");
    }
  };

  return (
    <div className="container">
      <h1>Welcome To Maxgammon!</h1>
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
          placeholder="Type your name"
        />
      </div>
      <div
        className={`name-input-container ${
          shakingName["second-name-input"] ? "shake-home" : ""
        }`}
      >
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
        <button className="home-button" onClick={() => handleClick(0)}>
          Play AI
        </button>
        <button className="home-button" onClick={() => handleClick(1)}>
          Play Multiplayer
        </button>
        <button className="home-button" onClick={() => handleClick(2)}>
          Play Online
        </button>
      </div>
    </div>
  );
}

export default Home;
