import { useState, useEffect, ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "../styles/online.css";
import "../styles/game.css";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5001");

interface CheckerLocation {
  x: number;
  y: number;
}

interface ValidMoves {
  [key: number]: boolean;
}

function OnlineGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name;
  const [validMoves, setValidMoves] = useState<ValidMoves>({});
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [playerColors, setPlayerColors] = useState<Record<string, string>>({});
  const [previousPosition, setPreviousPosition] = useState<number | null>(null);
  const [currentDice, setCurrentDice] = useState<number[]>([]);
  const [currentLocations, setCurrentLocations] = useState<
    Record<number, CheckerLocation>
  >({});
  const [shakingButtons, setShakingButtons] = useState<{
    [key: string]: boolean;
  }>({});
  const [code, setCode] = useState("");
  const [shakingName, setShakingName] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [gameId, setGameId] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [readyToStart, setReadyToStart] = useState<boolean>(false);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
  };

  const triggerNameShake = (buttonId: string) => {
    setShakingName((prev) => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setShakingName((prev) => ({ ...prev, [buttonId]: false }));
    }, 1950);
  };

  useEffect(() => {
    if (readyToStart) {
      console.log("Current gameId:", gameId);
      if (currentDice.length > 0 && currentTurn != "AI") {
        isPossibleMove();
      }
      const handleWin = async () => {
        const check = await checkWinner();
        if (check) {
          const popup = document.getElementById("popup");

          if (popup) {
            popup.style.display = "block";
          } else {
            console.error("Couldn't find popup element");
          }
          return;
        }
      };
      handleWin();
    }
  }, [currentDice]);

  useEffect(() => {
    if (readyToStart) {
      fetchColor();
      fetchGameState();
    }
  }, [gameId]);

  useEffect(() => {
    if (currentTurn === name) {
      //triggerButtonShake("dicebutton");
    }
  }, [currentTurn]);

  const handleClick = async (position: number) => {
    if (position == -100) {
      socket.emit("create_lobby", { name: name });
      socket.on("lobby_created", (data: any) => {
        console.log("Lobby created with game ID:", data.game_id);
        setCreatedCode(data.game_id);
        const lobby = document.getElementById("lobby-container");
        if (lobby) {
          lobby.style.display = "none";
        } else {
          console.error("Element with ID 'waiting' not found.");
        }
        const waiting = document.getElementById("waiting");
        if (waiting) {
          waiting.style.display = "block";
        } else {
          console.error("Element with ID 'waiting' not found.");
        }
        console.log("Listening for game_ready event...");
        socket.off("game_ready");
        socket.on("game_ready", (data: any) => {
          setReadyToStart(true);
          setGameId(data.game_id);
          console.log("Game is ready:", data);
          const waiting = document.getElementById("waiting");
          if (waiting) {
            waiting.style.display = "none";
          } else {
            console.error("Element with ID 'waiting' not found.");
          }
        });
      });
    } else if (position == -99 && code) {
      console.log("Joining room with gameId:", code);
      socket.emit("join_game", { player_name: name, game_id: code });
      socket.off("game_ready");
      socket.on("game_ready", (data: any) => {
        setReadyToStart(true);
        setGameId(data.game_id);
        const lobby = document.getElementById("lobby-container");
        if (lobby) {
          lobby.style.display = "none";
        } else {
          console.error("Element with ID 'lobby' not found.");
        }
      });
      console.log("navigate");
    } else if (position == -99 && !code) {
      triggerNameShake("first-name-input");
    } else if (position == -98) {
    }
    if (position == -3) {
      restartGame();
      fetchGameState();
      const popup = document.getElementById("popup");
      if (popup) {
        popup.style.display = "none";
      } else {
        console.error("Couldn't find popup element");
      }
    } else if (position == -1) {
      navigate("/");
    }
    console.log("You clicked on box:", position);
    console.log("Current Player: ", currentTurn);
    console.log("Current Dice: ", currentDice);
    if (currentTurn === name) {
      if (position in validMoves && previousPosition != null) {
        makeMove(position);
      } else if (position >= 0 && position <= 27) {
        pickStart(position);
      } else if (position == -10) {
        stopShake("dicebutton");
        rollDice();
      } else if (position == -2) {
        undo();
      } else if (position == -4) {
        redo();
      } else if (position == -5) {
        stopShake("donebutton");
        changeTurn();
      }
    }
  };

  // const triggerButtonShake = (buttonId: string) => {
  //   setShakingButtons((prev) => ({ ...prev, [buttonId]: true }));
  // };

  const stopShake = (buttonId: string) => {
    setShakingButtons((prev) => ({ ...prev, [buttonId]: false }));
  };

  const fetchGameState = () => {
    socket.off("fetch_state");
    socket.off("error");
    socket.emit("fetch_state", { game_id: gameId });
    socket.on("state_fetched", (data: any) => {
      console.log("Fetched Data:", data);
      if (data.current_turn) {
        setCurrentTurn(data.current_turn);
      }
      if (data.rolls) {
        setCurrentDice(data.rolls);
      }
      if (data.checkers_location) {
        setCurrentLocations(data.checkers_location);
      }
      console.log("Updated State:", currentLocations);
    });

    socket.on("error", (error: any) => {
      console.error("Error fetching game state:", error.message);
    });
  };

  const makeMove = (position: number) => {
    socket.off("move_made");
    socket.off("error");
    socket.emit("make_move", {
      game_id: gameId,
      previous_position: previousPosition,
      end_position: position,
    });

    socket.on("move_made", (data: any) => {
      if (data.message) {
        console.log(data.message);
        setCurrentTurn(data.current_turn);
        setPreviousPosition(null);
        setCurrentDice(data.rolls);
        setCurrentLocations(data.checkers_location);
        if (data.rolls.length === 0) {
          if (currentTurn === name) {
            //triggerButtonShake("donebutton");
          }
        }
      }
    });

    socket.on("error", (error: any) => {
      console.error("Error making move:", error.message);
    });
    fetchGameState();
  };

  const pickStart = (position: number) => {
    socket.off("start_picked");
    socket.off("error");
    socket.emit("pick_start", { game_id: gameId, position: position });
    socket.on("start_picked", (data: any) => {
      if (data.message) {
        console.log("Possible moves:", data.message);
        setPreviousPosition(position);
        setValidMoves(data.message);
      } else {
        console.log("No possible moves available");
      }
    });
    socket.on("error", (error: any) => {
      console.error("Error fetching possible moves:", error.message);
    });
  };

  const isPossibleMove = () => {
    socket.off("is_possible_move");
    socket.off("error");
    socket.emit("is_possible_move", { game_id: gameId });
    socket.on("possible_move_checked", (data: any) => {
      if (data.message === "No Possible Move!") {
        setCurrentTurn(data.current_turn);
        setCurrentDice(data.rolls);
        if (data.current_turn === name) {
          //triggerButtonShake("dicebutton");
        }
        console.log("No possible moves, switching turn to:", data.current_turn);
      }
    });
    socket.on("error", (error: any) => {
      console.error(
        "Error checking if there is a possible move:",
        error.message
      );
    });
  };

  const rollDice = () => {
    console.log("You rolled the dice.");
    socket.off("dice_rolled");
    socket.off("error");
    socket.emit("roll_dice", { game_id: gameId });
    socket.on("dice_rolled", (data: any) => {
      if (data.message) {
        setCurrentDice(data.rolls);
      } else {
        console.log("Unexpected Error");
      }
    });

    socket.on("error", (error: any) => {
      console.error("Error rolling dice:", error.message);
    });
    fetchGameState();
  };

  const checkWinner = async () => {
    socket.off("winner_checked");
    socket.off("error");
    socket.emit("check_winner", { game_id: gameId });
    return new Promise((resolve) => {
      socket.on("winner_checked", (data: any) => {
        if (data.message === "Winner!") {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      socket.on("error", (error: any) => {
        console.error("Error checking winner:", error.message);
        resolve(false);
      });
    });
  };

  const undo = async () => {
    socket.off("undo_done");
    socket.off("error");
    socket.emit("undo", { game_id: gameId });
    socket.on("undo_done", (data: any) => {
      if (currentDice.length === 0 && data.rolls.length > 0) {
        stopShake("donebutton");
      }
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    });

    socket.on("error", (error: any) => {
      console.error("Error undoing move:", error.message);
    });
    fetchGameState();
  };

  const redo = async () => {
    socket.off("redo_done");
    socket.off("error");
    socket.emit("redo", { game_id: gameId });

    socket.on("redo_done", (data: any) => {
      if (
        currentDice.length === 1 &&
        data.rolls.length === 0 &&
        currentTurn === name
      ) {
        //triggerButtonShake("donebutton");
      }
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    });

    socket.on("error", (error: any) => {
      console.error("Error redoing move:", error.message);
    });
    fetchGameState();
  };

  const changeTurn = () => {
    socket.off("turn_changed");
    socket.off("error");
    socket.emit("change_turn", { game_id: gameId });
    socket.on("turn_changed", (data: any) => {
      setCurrentTurn(data.current_turn);
      console.log("Turn changed to:", data.current_turn);
    });
    socket.on("error", (error: any) => {
      console.error("Error changing turn:", error.message);
    });
    fetchGameState();
  };

  const restartGame = async () => {
    socket.off("game_restarted");
    socket.off("error");
    socket.emit("restart_game", { game_id: gameId });
    socket.on("game_restarted", (data: any) => {
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    });

    socket.on("error", (error: any) => {
      console.error("Error restarting game:", error.message);
    });
    fetchGameState();
  };

  const fetchColor = async () => {
    console.log("Game ID: " + gameId);
    socket.off("color_fetched");
    socket.off("error");
    socket.emit("fetch_color", { game_id: gameId });
    socket.on("color_fetched", (data: any) => {
      if (data.current_color === "black") {
        setPlayerColors({
          [data.current_turn]: "#696969",
          [data.other_turn]: "#ffffff",
        });
      } else {
        setPlayerColors({
          [data.current_turn]: "#ffffff",
          [data.other_turn]: "#696969",
        });
      }
    });

    socket.on("error", (error: any) => {
      console.error("Error fetching colors:", error.message);
    });
  };

  return (
    <div className="container-game">
      <div className="waiting" id="waiting">
        <button className="home" onClick={() => handleClick(-1)}>
          ↵
        </button>
        <p className="waiting-text-1">
          Waiting for your friend to join the lobby!
        </p>
        <p className="waiting-text-2">The game code is: {createdCode}</p>
      </div>
      <div className="lobby-container" id="lobby-container">
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
          <button className="lobby-button" onClick={() => handleClick(-100)}>
            Create Game
          </button>
          <button className="lobby-button" onClick={() => handleClick(-99)}>
            Join Game
          </button>
          <button className="lobby-button" onClick={() => handleClick(-98)}>
            Play Random
          </button>
        </div>
      </div>
      <button className="home" onClick={() => handleClick(-1)}>
        ↵
      </button>
      <h1>Maxgammon Game</h1>
      <div className="board">
        <div className="dead-and-home-box">
          <div
            className="position-box-top-dead-and-home"
            onClick={() => handleClick(26)}
          ></div>
          <div
            className="position-box-bottom-dead-and-home"
            onClick={() => handleClick(27)}
          ></div>
        </div>
        <div className="left-bar"></div>
        <div className="left-bin">
          <div className="top-row">
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(0)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(1)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(2)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(3)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(4)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(5)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
          </div>
          <div className="bottom-row">
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(23)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(22)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(21)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(20)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(19)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(18)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
          </div>
        </div>

        <div className="middle-bar"></div>

        <div className="right-bin">
          <div className="top-row">
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(6)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(7)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(8)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(9)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(10)}
              ></div>
              <div className="down-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-top"
                onClick={() => handleClick(11)}
              ></div>
              <div className="down-triangle-dark-brown"></div>
            </div>
          </div>
          <div className="bottom-row">
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(17)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(16)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(15)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(14)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(13)}
              ></div>
              <div className="up-triangle-dark-brown"></div>
            </div>
            <div className="triangle-container">
              <div
                className="position-box-bottom"
                onClick={() => handleClick(12)}
              ></div>
              <div className="up-triangle-light-brown"></div>
            </div>
          </div>
        </div>
        <div className="right-bar"></div>
        <div className="dead-and-home-box">
          <div
            className="position-box-top-dead-and-home"
            onClick={() => handleClick(24)}
          ></div>
          <div
            className="position-box-bottom-dead-and-home"
            onClick={() => handleClick(25)}
          ></div>
        </div>
        <div
          className={`piece_black ${
            currentLocations[0]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[0]?.x || 0}%`,
            top: `${currentLocations[0]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[1]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[1]?.x || 0}%`,
            top: `${currentLocations[1]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[2]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[2]?.x || 0}%`,
            top: `${currentLocations[2]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[3]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[3]?.x || 0}%`,
            top: `${currentLocations[3]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[4]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[4]?.x || 0}%`,
            top: `${currentLocations[4]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[5]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[5]?.x || 0}%`,
            top: `${currentLocations[5]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[6]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[6]?.x || 0}%`,
            top: `${currentLocations[6]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[7]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[7]?.x || 0}%`,
            top: `${currentLocations[7]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[8]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[8]?.x || 0}%`,
            top: `${currentLocations[8]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[9]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[9]?.x || 0}%`,
            top: `${currentLocations[9]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[10]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[10]?.x || 0}%`,
            top: `${currentLocations[10]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[11]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[11]?.x || 0}%`,
            top: `${currentLocations[11]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[12]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[12]?.x || 0}%`,
            top: `${currentLocations[12]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[13]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[13]?.x || 0}%`,
            top: `${currentLocations[13]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[14]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[14]?.x || 0}%`,
            top: `${currentLocations[14]?.y || 0}%`,
          }}
        ></div>

        <div
          className={`piece_white ${
            currentLocations[15]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[15]?.x || 0}%`,
            top: `${currentLocations[15]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[16]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[16]?.x || 0}%`,
            top: `${currentLocations[16]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[17]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[17]?.x || 0}%`,
            top: `${currentLocations[17]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[18]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[18]?.x || 0}%`,
            top: `${currentLocations[18]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[19]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[19]?.x || 0}%`,
            top: `${currentLocations[19]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[20]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[20]?.x || 0}%`,
            top: `${currentLocations[20]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[21]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[21]?.x || 0}%`,
            top: `${currentLocations[21]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[22]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[22]?.x || 0}%`,
            top: `${currentLocations[22]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[23]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[23]?.x || 0}%`,
            top: `${currentLocations[23]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[24]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[24]?.x || 0}%`,
            top: `${currentLocations[24]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[25]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[25]?.x || 0}%`,
            top: `${currentLocations[25]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[26]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[26]?.x || 0}%`,
            top: `${currentLocations[26]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[27]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[27]?.x || 0}%`,
            top: `${currentLocations[27]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[28]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[28]?.x || 0}%`,
            top: `${currentLocations[28]?.y || 0}%`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[29]?.x === 0 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[29]?.x || 0}%`,
            top: `${currentLocations[29]?.y || 0}%`,
          }}
        ></div>
        <div className="popup" id="popup">
          <p className="no-margin">Congrats {currentTurn} you won the game!</p>
          <button className="popup-home" onClick={() => handleClick(-1)}>
            ↵
          </button>
          <button className="popup-restart" onClick={() => handleClick(-3)}>
            ↻
          </button>
        </div>
      </div>
      <div className="roll-redo-container">
        <button className="undo-button" onClick={() => handleClick(-2)}>
          ⟲
        </button>
        <button className="redo-button" onClick={() => handleClick(-4)}>
          ⟳
        </button>
        <button
          className={`dice ${
            shakingButtons["dicebutton"] ? "shake-board" : ""
          }`}
          onClick={() => handleClick(-10)}
        >
          Press To Roll!
        </button>
        <button
          className={`next-turn ${
            shakingButtons["donebutton"] ? "shake-board" : ""
          }`}
          onClick={() => handleClick(-5)}
        >
          Done
        </button>
      </div>
      <div className="name-container">
        <div className="turn">Current Turn: {currentTurn}</div>
        <div
          className="name-checker"
          style={{
            backgroundColor: playerColors[currentTurn], // Change colors as needed
          }}
        ></div>
      </div>

      <div className="rolls">Rolls: {currentDice.toString()}</div>
    </div>
  );
}

export default OnlineGame;
