from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_session import Session
from OOP_Backgammon import Backgammon, Dice, Board
import sqlite3
import uuid
import cProfile
import pstats

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5174", "http://13.56.253.8"]}}, supports_credentials=True)

def init_db():
    conn = sqlite3.connect("games.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            game_data TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def save_game(game_id, game_data):
    conn = sqlite3.connect("games.db")
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO games (game_id, game_data) VALUES (?, ?)", (game_id, game_data))
    conn.commit()
    conn.close()

def load_game(game_id):
    conn = sqlite3.connect("games.db")
    cursor = conn.cursor()
    cursor.execute("SELECT game_data FROM games WHERE game_id = ?", (game_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return '', 200

@app.route("/")
def home():
    return "Welcome to the Backgammon Game API!"


@app.route("/api/startvsAI", methods=["POST"])
def startvsAI():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_name = data.get("name")
    if not player_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game_id = str(uuid.uuid4())
    game = Backgammon(name1="AI", name2=player_name, AI1="Monte", AI2="User")
    save_game(game_id, game.to_json())
    return jsonify({"message": "Game started", "game_id": game_id}), 200


@app.route("/api/startvsUser", methods=["POST"])
def startvsUser():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_one_name = data.get("name1")
    player_two_name = data.get("name2")
    if not player_one_name or not player_two_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game_id = str(uuid.uuid4())
    game = Backgammon(name1=player_one_name, name2=player_two_name, AI1="User", AI2="User")
    save_game(game_id, game.to_json())
    return jsonify({"message": "Game started", "game_id": game_id}), 200


@app.route("/api/state", methods=["GET"])
def state():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/pick_start", methods=["GET"])
def pick_start():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    if game.rolls == [] and not game.end_of_turn:
        roll1, roll2 = Dice.roll_dice()
        game.rolls = [roll1, roll2] * 2 if roll1 == roll2 else [roll1, roll2]
        game.history = []
        game.history_pointer = -1
        game.save_state()
        save_game(game_id, game.to_json())
        return jsonify({"message": "Dice rolled", "rolls": game.rolls})
    else:
        return jsonify({"message": "Rolls already available", "rolls": game.rolls})


@app.route("/api/make_move", methods=["POST"])
def make_move():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
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
    save_game(game_id, game.to_json())
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    while game.rolls != []:
        # profiler = cProfile.Profile()
        # profiler.enable()
        game.ai_play()
        # profiler.disable()
        # stats = pstats.Stats(profiler)
        # stats.strip_dirs().sort_stats('cumulative').print_stats(20)
    game.current_turn = (game.current_turn + 1) % 2
    save_game(game_id, game.to_json())
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    game.undo()
    save_game(game_id, game.to_json())
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/redo", methods=["POST"])
def redo():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    game.redo()
    save_game(game_id, game.to_json())
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/api/change_turn", methods=["POST"])
def change_turn():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    game.change_turn()
    save_game(game_id, game.to_json())
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/api/restart_game", methods=["POST"])
def restart_game():
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    game.restart_game()
    save_game(game_id, game.to_json())
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
    game_id = request.headers.get("Game-ID")
    if not game_id:
        return jsonify({"error": "Missing Game-ID"}), 400
    game_data = load_game(game_id)
    if not game_data:
        return jsonify({"error": "Game not found"}), 404
    game = Backgammon.from_json(game_data)
    return jsonify(
        {
            "current_turn": game.players[0].name,
            "current_color": game.players[0].color,
            "other_turn": game.players[1].name,
            "other_color": game.players[1].color,
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5001) #Add debug=True for development
