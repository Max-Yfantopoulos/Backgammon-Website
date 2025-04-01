from flask import Flask, jsonify, request
from flask_cors import CORS
from OOP_Backgammon import Backgammon, Dice, Board
import cProfile
import pstats


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/")
def home():
    return "Welcome to the Backgammon Game API!"


@app.route("/startvsAI", methods=["POST"])
def startvsAI():
    global game
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_name = data.get("name")
    if not player_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game = Backgammon(name1="AI", name2=player_name, AI1="Monte", AI2="User")
    return jsonify({"message": "Game started"}), 200


@app.route("/startvsUser", methods=["POST"])
def startvsUser():
    global game
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    player_one_name = data.get("name1")
    player_two_name = data.get("name2")
    if not player_one_name or not player_two_name:
        return jsonify({"error": "Missing 'name' field"}), 400
    game = Backgammon(
        name1=player_one_name, name2=player_two_name, AI1="User", AI2="User"
    )
    return jsonify({"message": "Game started"}), 200


@app.route("/state", methods=["GET"])
def state():
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/pick_start", methods=["POST"])
def pick_start():
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
                "rolls": game.rolls,
                "dead_pieces": {
                    "White": game.players[0].num_dead_pieces,
                    "Black": game.players[1].num_dead_pieces,
                },
                "home_pieces": {
                    "White": game.players[0].num_home_pieces,
                    "Black": game.players[1].num_home_pieces,
                },
            }
        )
    return response


@app.route("/roll_dice", methods=["POST"])
def roll_dice():
    if game.rolls == [] and not game.end_of_turn:
        roll1, roll2 = Dice.roll_dice()
        game.rolls = [roll1, roll2] * 2 if roll1 == roll2 else [roll1, roll2]
        game.history = []
        game.history_pointer = -1
        game.save_state()
        return jsonify({"message": "Dice rolled", "rolls": game.rolls})
    else:
        return jsonify({"message": "Rolls already available", "rolls": game.rolls})


@app.route("/make_move", methods=["POST"])
def make_move():
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


@app.route("/ai_play", methods=["POST"])
def ai_play():
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


@app.route("/is_possible_move", methods=["GET"])
def is_possible_move():
    game.is_possible_move()
    return jsonify(
        {
            "message": game.message,
            "rolls": game.rolls,
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/check_winner", methods=["GET"])
def check_winner():
    game.check_winner()
    return jsonify(
        {
            "message": game.message,
            "rolls": game.rolls,
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/undo", methods=["GET"])
def undo():
    game.undo()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/redo", methods=["GET"])
def redo():
    game.redo()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


@app.route("/change_turn", methods=["GET"])
def change_turn():
    game.change_turn()
    return jsonify(
        {
            "current_turn": game.players[game.current_turn].name,
        }
    )


@app.route("/restart_game", methods=["GET"])
def restart_game():
    game.restart_game()
    return jsonify(
        {
            "game": "game restarted",
            "current_turn": game.players[game.current_turn].name,
            "rolls": game.rolls,
            "checkers_location": [checker.to_dict() for checker in game.checkers],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
