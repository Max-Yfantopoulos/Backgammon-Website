from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_session import Session
from OOP_Backgammon import Backgammon, Dice, Board
import jwt
import datetime
import uuid
import cProfile
import pstats

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5174", "http://13.56.253.8"]}}, supports_credentials=True)


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return '', 200

@app.route("/")
def home():
    return "Welcome to the Backgammon Game API!"


@app.route("/api/startvsAI", methods=["POST"])
def startvsAI():
    global games
    if "games" not in globals():
        games = {}
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_name = data.get("name")
    if not player_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game_id = str(uuid.uuid4())
    game = Backgammon(name1="AI", name2=player_name, AI1="Monte", AI2="User")
    games[game_id] = game
    return jsonify({"message": "Game started", "game_id": game_id}), 200


@app.route("/api/startvsUser", methods=["POST"])
def startvsUser():
    global games
    if "games" not in globals():
        games = {}
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_one_name = data.get("name1")
    player_two_name = data.get("name2")
    if not player_one_name or not player_two_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game_id = str(uuid.uuid4())
    game = Backgammon(name1=player_one_name, name2=player_two_name, AI1="User", AI2="User")
    games[game_id] = game
    return jsonify({"message": "Game started", "game_id": game_id}), 200


@app.route("/api/state", methods=["GET"])
def state():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/pick_start", methods=["POST"])
def pick_start():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    data = request.json
    start = data.get("position")
    if start is None:
        return jsonify({"error": "Position is required"}), 400
    check = game.pick_start(start)
    if check == "Not Playable!":
        response = jsonify({"message": "Not Playable!"})
    else:
        response = jsonify(
            {
                "message": game.message,
                "current_turn": game.players[game.current_turn].name,
            }
        )
    return response


@app.route("/api/roll_dice", methods=["POST"])
def roll_dice():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    if game.rolls == [] and not game.end_of_turn:
        roll1, roll2 = Dice.roll_dice()
        game.rolls = [roll1, roll2] * 2 if roll1 == roll2 else [roll1, roll2]
        game.history = []
        game.history_pointer = -1
        game.save_state()
        return jsonify({"message": "Dice rolled", "rolls": game.rolls})
    else:
        return jsonify({"message": "Rolls already available", "rolls": game.rolls})


@app.route("/api/make_move", methods=["POST"])
def make_move():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    data = request.json
    start = data.get("previousPosition")
    end = data.get("position")

    if not game.rolls:
        return jsonify({"error": "Roll the dice first!"}), 400

    possible_moves = game.game_board.possible_moves(
        start, game.rolls, game.players[game.current_turn]
    )
    if end not in possible_moves:
        return jsonify({"error": "Invalid move!"}), 400

    game.make_move(start, end, possible_moves)
    return jsonify(
        {
            "message": f"Move made from {start} to {end}",
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/ai_play", methods=["POST"])
def ai_play():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    while game.rolls != []:
        # profiler = cProfile.Profile()
        # profiler.enable()
        game.ai_play()
        # profiler.disable()
        # stats = pstats.Stats(profiler)
        # stats.strip_dirs().sort_stats('cumulative').print_stats(20)
    game.current_turn = (game.current_turn + 1) % 2
    return jsonify(
        {
            "message": "AI Player",
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/is_possible_move", methods=["GET"])
def is_possible_move():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.is_possible_move()
    return jsonify(
        {
            "message": game.message,
            "rolls": game.rolls,
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/api/check_winner", methods=["GET"])
def check_winner():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.check_winner()
    return jsonify(
        {
            "message": game.message,
            "rolls": game.rolls,
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/api/undo", methods=["POST"])
def undo():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.undo()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/redo", methods=["POST"])
def redo():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.redo()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/change_turn", methods=["POST"])
def change_turn():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.change_turn()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/api/restart_game", methods=["POST"])
def restart_game():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    game.restart_game()
    return jsonify(
        {
            "game": "game restarted",
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )

@app.route("/api/fetch_color", methods=["GET"])
def fetch_color():
    global games
    if "games" not in globals():
        games = {}
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game = games.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404
    return jsonify(
        {
            "current_turn": game.players[0].name,
            "current_color": game.players[0].color,
            "other_turn": game.players[1].name,
            "other_color": game.players[1].color,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
