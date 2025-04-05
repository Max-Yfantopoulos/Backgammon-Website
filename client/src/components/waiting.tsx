import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/waiting.css";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5001");

function OnlineGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameId = location.state?.gameId;

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

  return (
    <div className="container">
      <h1>Maxgammon Lobby</h1>
      <p>Waiting for your friend to join the lobby!</p>
      <p>The game code is: {gameId}</p>
    </div>
  );
}

export default OnlineGame;
