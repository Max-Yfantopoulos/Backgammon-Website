import { useEffect, useState, ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/lobby.css";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5001");

function OnlineGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;
  const [createdCode, setCreatedCode] = useState("");
  const [code, setCode] = useState("");
  const [shakingName, setShakingName] = useState<{ [key: string]: boolean }>(
    {}
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
  };

  const triggerShake = (buttonId: string) => {
    setShakingName((prev) => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setShakingName((prev) => ({ ...prev, [buttonId]: false }));
    }, 1950);
  };

  useEffect(() => {
    console.log("Listening for game_ready event...");
    socket.on("game_ready", (data) => {
      console.log("Game is ready:", data);
      navigate("/online", { state: { gameId: data.game_id } });
    });

    return () => {
      console.log("Cleaning up game_ready listener...");
      socket.off("game_ready");
    };
  }, []);

  const handleClick = async (position: number) => {
    console.log("You clicked on box:", position);
    if (position == -1) {
      navigate("/");
    } else if (position == 0) {
      socket.emit("create_lobby", { name1: "Player1" });
      socket.on("lobby_created", (data) => {
        console.log("Lobby created with game ID:", data.game_id);
        setCreatedCode(data.game_id);
        const waiting = document.getElementById("waiting");
        if (waiting) {
          waiting.style.display = "block";
        } else {
          console.error("Element with ID 'waiting' not found.");
        }
      });
    } else if (position == 1 && code) {
      console.log("doing this");
      console.log("Joining room with gameId:", code);
      socket.emit("join_game", { player_name: name, game_id: code });
      socket.on("game_ready", (data) => {
        navigate("/online", { state: { gameId: data.game_id } });
      });
      console.log("navigate");
    } else if (position == 1 && !code) {
      triggerShake("first-name-input");
    } else if (position == 2) {
      navigate("/online");
    }
  };

  return (
    <div className="container">
      <div className="waiting" id="waiting">
        <button className="home" onClick={() => handleClick(-1)}>
          ↵
        </button>
        <p>Waiting for your friend to join the lobby!</p>
        <p>The game code is: {createdCode}</p>
      </div>
      <button className="home" onClick={() => handleClick(-1)}>
        ↵
      </button>
      <h1>Maxgammon Lobby</h1>
      <div
        className={`name-input-container ${
          shakingName["first-name-input"] ? "shake-home" : ""
        }`}
      >
        <label htmlFor="name1">Code: </label>
        <input
          className="name-input"
          type="text"
          id="name1"
          value={code}
          onChange={handleInputChange}
          placeholder="Enter game code"
        />
      </div>
      <div className="button-container">
        <button className="lobby-button" onClick={() => handleClick(0)}>
          Create Game
        </button>
        <button className="lobby-button" onClick={() => handleClick(1)}>
          Join Game
        </button>
        <button className="lobby-button" onClick={() => handleClick(2)}>
          Play Random
        </button>
      </div>
    </div>
  );
}

export default OnlineGame;
