import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/board.css";

const Backend_Url = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

interface CheckerLocation {
  x: number;
  y: number;
}

interface ValidMoves {
  [key: number]: boolean;
}

function BackgammonBoard() {
  const navigate = useNavigate();
  const [validMoves, setValidMoves] = useState<ValidMoves>({});
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [playerColors, setPlayerColors] = useState<Record<string, string>>({});
  const [previousPosition, setPreviousPosition] = useState<number | null>(null);
  const [currentDice, setCurrentDice] = useState<number[]>([]);
  const [currentLocations, setCurrentLocations] = useState<
    Record<number, CheckerLocation>
  >({});
  const [shakingButtons, setShakingButtons] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
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
  }, [currentDice]);

  useEffect(() => {
    fetchColor();
    fetchGameState();
  }, []);

  useEffect(() => {
    const handleTurn = async () => {
      if (currentTurn !== "AI") {
        triggerShake("dicebutton");
      } else if (currentTurn === "AI") {
        if (currentDice.length === 0) {
          await rollDice();
        }
        await fetchAIPlay();
      }
    };
    handleTurn();
  }, [currentTurn]);

  const handleClick = async (position: number) => {
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

    if (currentTurn === "AI") {
      return;
    }
    console.log("You clicked on box:", position);
    console.log("Current Player: ", currentTurn);
    console.log("Current Dice: ", currentDice);
    if (position in validMoves && previousPosition != null) {
      try {
        const gameId = sessionStorage.getItem("game_id") || "";
        const response = await fetch(`${Backend_Url}/api/make_move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Game-ID": gameId,
          },
          body: JSON.stringify({
            previousPosition,
            position,
          }),
        });

        const data = await response.json();

        if (data.message) {
          console.log(data.message);
          setCurrentTurn(data.current_turn);
          setPreviousPosition(null);
          setCurrentDice(data.rolls);
          setCurrentLocations(data.checkers_location);
          if (data.rolls.length === 0) {
            triggerShake("donebutton");
          }
        }
      } catch (error) {
        console.error("Error making move:", error);
      }
    } else if (position >= 0 && position <= 27) {
      try {
        const gameId = sessionStorage.getItem("game_id") || "";
        const response = await fetch(`${Backend_Url}/api/pick_start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Game-ID": gameId,
          },
          body: JSON.stringify({ position }),
        });

        const data = await response.json();
        if (data.message) {
          console.log("Possible moves:", data.message);
          setPreviousPosition(position);
          setValidMoves(data.message);
        } else {
          console.log("No possible moves available");
        }
      } catch (error) {
        console.error("Error fetching possible moves:", error);
      }
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
  };

  const triggerShake = (buttonId: string) => {
    setShakingButtons((prev) => ({ ...prev, [buttonId]: true }));
  };

  const stopShake = (buttonId: string) => {
    setShakingButtons((prev) => ({ ...prev, [buttonId]: false }));
  };

  const fetchGameState = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/state`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
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
    } catch (error) {
      console.error("Error fetching game state:", error);
    }
  };

  const isPossibleMove = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/is_possible_move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      if (data.message === "No Possible Move!") {
        setCurrentTurn(data.current_turn);
        setCurrentDice(data.rolls);
        triggerShake("donebutton");
        console.log("No possible moves, switching turn to:", data.current_turn);
      }
    } catch (error) {
      console.error("Error checking if there is a possible move:", error);
    }
  };

  const rollDice = async () => {
    console.log("You rolled the dice.");
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/roll_dice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });

      const data = await response.json();

      if (data.message) {
        setCurrentDice(data.rolls);
      } else {
        console.log("Unexpected Error");
      }
    } catch (error) {
      console.error("Error rolling:", error);
    }
  };

  const fetchAIPlay = async () => {
    try {
      console.log("play");
      const gameId = sessionStorage.getItem("game_id") || "";
      const aiResponse = await fetch(`${Backend_Url}/api/ai_play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      console.log("done playing");

      const aiData = await aiResponse.json();
      console.log("hi");

      if (aiData.message) {
        console.log(aiData.message);
        setCurrentTurn(aiData.current_turn);
        setPreviousPosition(null);
        setCurrentDice(aiData.rolls);
        setValidMoves({});
        setCurrentLocations(aiData.checkers_location);
      } else {
        console.log("Unexpected Error");
      }
    } catch (error) {
      console.error("Error making AI move:", error);
    }
  };

  const checkWinner = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/check_winner`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      if (data.message == "Winner!") {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking if there is a winner:", error);
    }
  };

  const undo = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      if (currentDice.length === 0 && data.rolls.length > 0) {
        stopShake("donebutton");
      }
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    } catch (error) {
      console.error("Error checking if there is a winner:", error);
    }
  };

  const redo = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/redo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      if (currentDice.length === 1 && data.rolls.length === 0) {
        triggerShake("donebutton");
      }
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    } catch (error) {
      console.error("Error checking if there is a winner:", error);
    }
  };

  const changeTurn = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/change_turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      setCurrentTurn(data.current_turn);
    } catch (error) {
      console.error("Error checking if there is a winner:", error);
    }
  };

  const restartGame = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/restart_game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      setCurrentTurn(data.current_turn);
      setPreviousPosition(null);
      setCurrentDice(data.rolls);
      setValidMoves({});
      setCurrentLocations(data.checkers_location);
    } catch (error) {
      console.error("Error restarting game:", error);
    }
  };

  const fetchColor = async () => {
    try {
      const gameId = sessionStorage.getItem("game_id") || "";
      const response = await fetch(`${Backend_Url}/api/fetch_color`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Game-ID": gameId,
        },
      });
      const data = await response.json();
      if (data.current_color == "black") {
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
    } catch (error) {
      console.error("Error checking if there is a winner:", error);
    }
  };

  return (
    <div className="container">
      <h1>Maxgammon Game</h1>
      <div className="popup" id="popup">
        <p>Congrats {currentTurn} you won the game!</p>
        <button
          className="backarrow-button popup-back"
          onClick={() => handleClick(-1)}
        >
          ↵
        </button>
        <button
          className="backarrow-button restart"
          onClick={() => handleClick(-3)}
        >
          ↻
        </button>
      </div>
      <button className="backarrow-button" onClick={() => handleClick(-1)}>
        ↵
      </button>
      <div className="roll-redo-container">
        <button className="undo-button" onClick={() => handleClick(-2)}>
          ⟲
        </button>
        <button className="redo-button" onClick={() => handleClick(-4)}>
          ⟳
        </button>
        <button className={`dice ${shakingButtons["dicebutton"] ? "shake" : ""}`} onClick={() => handleClick(-10)}>
          Press To Roll!
        </button>
        <button className={`next-turn ${shakingButtons["donebutton"] ? "shake" : ""}`} onClick={() => handleClick(-5)}>
          Done
        </button>
      </div>
      <div className="board">
        <div className="left-bin">
          <div className="top-row">
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
          </div>
          <div className="bottom-row">
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
          </div>
        </div>

        <div className="middle-bar"></div>

        <div className="right-bin">
          <div className="top-row">
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
            <div className="arrow-down odd"></div>
            <div className="arrow-down even"></div>
          </div>
          <div className="bottom-row">
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
            <div className="arrow-up odd"></div>
            <div className="arrow-up even"></div>
          </div>
        </div>

        <div
          className={`piece_black ${
            currentLocations[0]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[0]?.x || 0}px`,
            top: `${currentLocations[0]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[1]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[1]?.x || 0}px`,
            top: `${currentLocations[1]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[2]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[2]?.x || 0}px`,
            top: `${currentLocations[2]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[3]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[3]?.x || 0}px`,
            top: `${currentLocations[3]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[4]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[4]?.x || 0}px`,
            top: `${currentLocations[4]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[5]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[5]?.x || 0}px`,
            top: `${currentLocations[5]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[6]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[6]?.x || 0}px`,
            top: `${currentLocations[6]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[7]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[7]?.x || 0}px`,
            top: `${currentLocations[7]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[8]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[8]?.x || 0}px`,
            top: `${currentLocations[8]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[9]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[9]?.x || 0}px`,
            top: `${currentLocations[9]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[10]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[10]?.x || 0}px`,
            top: `${currentLocations[10]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[11]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[11]?.x || 0}px`,
            top: `${currentLocations[11]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[12]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[12]?.x || 0}px`,
            top: `${currentLocations[12]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[13]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[13]?.x || 0}px`,
            top: `${currentLocations[13]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_black ${
            currentLocations[14]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[14]?.x || 0}px`,
            top: `${currentLocations[14]?.y || 0}px`,
          }}
        ></div>

        <div
          className={`piece_white ${
            currentLocations[15]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[15]?.x || 0}px`,
            top: `${currentLocations[15]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[16]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[16]?.x || 0}px`,
            top: `${currentLocations[16]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[17]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[17]?.x || 0}px`,
            top: `${currentLocations[17]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[18]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[18]?.x || 0}px`,
            top: `${currentLocations[18]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[19]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[19]?.x || 0}px`,
            top: `${currentLocations[19]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[20]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[20]?.x || 0}px`,
            top: `${currentLocations[20]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[21]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[21]?.x || 0}px`,
            top: `${currentLocations[21]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[22]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[22]?.x || 0}px`,
            top: `${currentLocations[22]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[23]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[23]?.x || 0}px`,
            top: `${currentLocations[23]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[24]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[24]?.x || 0}px`,
            top: `${currentLocations[24]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[25]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[25]?.x || 0}px`,
            top: `${currentLocations[25]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[26]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[26]?.x || 0}px`,
            top: `${currentLocations[26]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[27]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[27]?.x || 0}px`,
            top: `${currentLocations[27]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[28]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[28]?.x || 0}px`,
            top: `${currentLocations[28]?.y || 0}px`,
          }}
        ></div>
        <div
          className={`piece_white ${
            currentLocations[29]?.x === 601.5 ? "at_home" : ""
          }`}
          style={{
            left: `${currentLocations[29]?.x || 0}px`,
            top: `${currentLocations[29]?.y || 0}px`,
          }}
        ></div>

        <div
          className="position-box position-box_0"
          onClick={() => handleClick(0)}
        ></div>
        <div
          className="position-box position-box_1"
          onClick={() => handleClick(1)}
        ></div>
        <div
          className="position-box position-box_2"
          onClick={() => handleClick(2)}
        ></div>
        <div
          className="position-box position-box_3"
          onClick={() => handleClick(3)}
        ></div>
        <div
          className="position-box position-box_4"
          onClick={() => handleClick(4)}
        ></div>
        <div
          className="position-box position-box_5"
          onClick={() => handleClick(5)}
        ></div>
        <div
          className="position-box position-box_6"
          onClick={() => handleClick(6)}
        ></div>
        <div
          className="position-box position-box_7"
          onClick={() => handleClick(7)}
        ></div>
        <div
          className="position-box position-box_8"
          onClick={() => handleClick(8)}
        ></div>
        <div
          className="position-box position-box_9"
          onClick={() => handleClick(9)}
        ></div>
        <div
          className="position-box position-box_10"
          onClick={() => handleClick(10)}
        ></div>
        <div
          className="position-box position-box_11"
          onClick={() => handleClick(11)}
        ></div>
        <div
          className="position-box position-box_12"
          onClick={() => handleClick(12)}
        ></div>
        <div
          className="position-box position-box_13"
          onClick={() => handleClick(13)}
        ></div>
        <div
          className="position-box position-box_14"
          onClick={() => handleClick(14)}
        ></div>
        <div
          className="position-box position-box_15"
          onClick={() => handleClick(15)}
        ></div>
        <div
          className="position-box position-box_16"
          onClick={() => handleClick(16)}
        ></div>
        <div
          className="position-box position-box_17"
          onClick={() => handleClick(17)}
        ></div>
        <div
          className="position-box position-box_18"
          onClick={() => handleClick(18)}
        ></div>
        <div
          className="position-box position-box_19"
          onClick={() => handleClick(19)}
        ></div>
        <div
          className="position-box position-box_20"
          onClick={() => handleClick(20)}
        ></div>
        <div
          className="position-box position-box_21"
          onClick={() => handleClick(21)}
        ></div>
        <div
          className="position-box position-box_22"
          onClick={() => handleClick(22)}
        ></div>
        <div
          className="position-box position-box_23"
          onClick={() => handleClick(23)}
        ></div>

        <div className="dead-box-container">
          <div
            className="dead-box dead-box-white"
            onClick={() => handleClick(24)}
          ></div>
          <div
            className="dead-box dead-box-black"
            onClick={() => handleClick(25)}
          ></div>
        </div>

        <div className="home-box-container">
          <div
            className="home-box home-box-white"
            onClick={() => handleClick(26)}
          ></div>
          <div
            className="home-box home-box-black"
            onClick={() => handleClick(27)}
          ></div>
        </div>
      </div>

      <div className="name-container">
        <div className="turn">Current Turn: {currentTurn}</div>
        <div className="name-checker"
             style={{
              backgroundColor: playerColors[currentTurn], // Change colors as needed
             }}>
        </div>
      </div>

      <div className="rolls">Rolls: {currentDice.toString()}</div>
    </div>
  );
}

export default BackgammonBoard;
