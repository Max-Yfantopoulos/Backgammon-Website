import random
import numpy as np
import copy
import json
from MCTS import *


class Checker:
    def __init__(self, id, x, y):
        self.id = id
        self.x = x
        self.y = y

    def to_dict(self):
        return {"id": self.id, "x": self.x, "y": self.y}
    
    @classmethod
    def from_dict(cls, data):
        return cls(data["id"], data["x"], data["y"])


class Dice:
    def roll_dice():
        return random.randrange(6) + 1, random.randrange(6) + 1


class Player:
    def __init__(self, name, color, home_position, dead_position, AI):
        self.name = name
        self.color = color
        self.home_position = home_position
        self.dead_position = dead_position
        self.num_home_pieces = 0
        self.num_dead_pieces = 0
        self.AI = AI

    def to_dict(self):
        return {
            "name": self.name,
            "color": self.color,
            "home_position": self.home_position,
            "dead_position": self.dead_position,
            "num_home_pieces": self.num_home_pieces,
            "num_dead_pieces": self.num_dead_pieces,
            "AI": self.AI,
        }
    @classmethod
    def from_dict(cls, data):
        player = cls(
            data["name"],
            data["color"],
            data["home_position"],
            data["dead_position"],
            data["AI"],
        )
        player.num_home_pieces = data["num_home_pieces"]
        player.num_dead_pieces = data["num_dead_pieces"]


class Board:
    def __init__(self):
        self.board = np.zeros(24, dtype=int)
        self.setup_starting_positions()

    def to_dict(self):
        return {"board": self.board.tolist()}
    
    @classmethod
    def from_dict(cls, data):
        board = cls()
        board.board = np.array(data["board"], dtype=int)
        return board

    def __str__(self):
        top_row = " | ".join(
            f"{abs(cell)}{'W' if cell < 0 else 'B' if cell > 0 else ' '}"
            for cell in self.board[:12]
        )
        bottom_row = " | ".join(
            f"{abs(cell)}{'W' if cell < 0 else 'B' if cell > 0 else ' '}"
            for cell in reversed(self.board[12:])
        )
        board_string = f"  {top_row}\n" f"  {bottom_row}\n"
        return board_string

    def setup_starting_positions(self):
        self.board[0] = 2
        self.board[5] = -5
        self.board[7] = -3
        self.board[11] = 5
        self.board[12] = -5
        self.board[16] = 3
        self.board[18] = 5
        self.board[23] = -2

    def within_board(self, start):
        if 0 <= start <= 23:
            return True
        return False

    def can_player_bear_off(self, player):
        if player.num_dead_pieces > 0:
            return False
        if player.color == "White":
            for i in range(6, 24):
                if self.board[i] < 0:
                    return False
        elif player.color == "Black":
            for i in range(0, 18):
                if self.board[i] > 0:
                    return False
        return True

    def largest_in_home(self, player):
        if player.color == "White":
            for i in range(5, -1, -1):
                if self.board[i] < 0:
                    return i
        elif player.color == "Black":
            for i in range(18, 24):
                if self.board[i] > 0:
                    return i
        return None

    def possible_starts(self, rolls, player):
        possible_starts = []
        for start in range(24):
            possible = []
            if player.color == "White":
                if self.board[start] < 0:
                    possible = self.possible_moves(start, rolls, player)
            else:
                if self.board[start] > 0:
                    possible = self.possible_moves(start, rolls, player)
            if len(possible) != 0:
                possible_starts.append(start)
        if possible_starts == []:
            possible = self.possible_moves(24, rolls, player)
            if len(possible) != 0:
                possible_starts.append(24)
            possible2 = self.possible_moves(25, rolls, player)
            if len(possible2) != 0:
                possible_starts.append(25)
        return possible_starts

    def possible_moves(self, start, rolls, player):
        possible_col_to_roll = {}
        if player.color == "White":
            if self.within_board(start) and self.can_player_bear_off(player):
                largest = self.largest_in_home(player)
                if largest is None:
                    largest = 1000
                for roll in rolls:
                    if (
                        start - roll >= 0
                        and self.board[start - roll] <= 1
                        and self.board[start] < 0
                    ):
                        possible_col_to_roll[start - roll] = roll
                    if start >= largest and start - roll < 0 and self.board[start] < 0:
                        possible_col_to_roll[26] = roll
                    if self.board[start] < 0 and roll - 1 == start:
                        possible_col_to_roll[26] = roll
            elif self.within_board(start) and player.num_dead_pieces == 0:
                if self.board[start] < 0:
                    for roll in rolls:
                        if start - roll >= 0 and self.board[start - roll] <= 1:
                            possible_col_to_roll[start - roll] = roll
            elif start == 24 and player.num_dead_pieces > 0:
                for roll in rolls:
                    if self.board[24 - roll] <= 1:
                        possible_col_to_roll[24 - roll] = roll
        elif player.color == "Black":
            if self.within_board(start) and self.can_player_bear_off(player):
                largest = self.largest_in_home(player)
                if largest is None:
                    largest = -1000
                for roll in rolls:
                    if (
                        start + roll <= 23
                        and self.board[start + roll] >= -1
                        and self.board[start] > 0
                    ):
                        possible_col_to_roll[start + roll] = roll
                    if start <= largest and start + roll > 23 and self.board[start] > 0:
                        possible_col_to_roll[27] = roll
                    if self.board[start] > 0 and 24 - roll == start:
                        possible_col_to_roll[27] = roll
            elif self.within_board(start) and player.num_dead_pieces == 0:
                if self.board[start] > 0:
                    for roll in rolls:
                        if start + roll <= 23 and self.board[start + roll] >= -1:
                            possible_col_to_roll[start + roll] = roll
            elif start == 25 and player.num_dead_pieces > 0:
                for roll in rolls:
                    if self.board[roll - 1] >= -1:
                        possible_col_to_roll[roll - 1] = roll
        return possible_col_to_roll


class Backgammon:
    def __init__(self, name1, name2, AI1, AI2):
        self.name1 = name1
        self.name2 = name2
        self.AI1 = AI1
        self.AI2 = AI2
        self.players = [
            Player(name1, "White", 26, 24, AI1),
            Player(name2, "Black", 27, 25, AI2),
        ]
        self.game_board = Board()
        self.current_turn = None
        self.rolls = []
        self.history = []
        self.history_pointer = -1
        self.real_game = True
        self.end_of_turn = False
        self.determine_first_turn()
        self.message = ""
        # [id, x, y] (1 is for black and -1 is for white)
        self.checkers = [
            Checker(0, 5.75, 0),
            Checker(1, 5.75, 36),
            Checker(2, 548.25, 0),
            Checker(3, 548.25, 36),
            Checker(4, 548.25, 72),
            Checker(5, 548.25, 108),
            Checker(6, 548.25, 144),
            Checker(7, 358.25, 424),
            Checker(8, 358.25, 388),
            Checker(9, 358.25, 352),
            Checker(10, 242.25, 424),
            Checker(11, 242.25, 388),
            Checker(12, 242.25, 352),
            Checker(13, 242.25, 316),
            Checker(14, 242.25, 280),
            Checker(15, 5.25, 424),
            Checker(16, 5.25, 388),
            Checker(17, 548.25, 424),
            Checker(18, 548.25, 388),
            Checker(19, 548.25, 352),
            Checker(20, 548.25, 316),
            Checker(21, 548.25, 280),
            Checker(22, 358.25, 0),
            Checker(23, 358.25, 36),
            Checker(24, 358.25, 72),
            Checker(25, 242.25, 0),
            Checker(26, 242.25, 36),
            Checker(27, 242.25, 72),
            Checker(28, 242.25, 108),
            Checker(29, 242.25, 144),
        ]
        self.columns = {
            0: [0, 1],
            1: [],
            2: [],
            3: [],
            4: [],
            5: [25, 26, 27, 28, 29],
            6: [],
            7: [22, 23, 24],
            8: [],
            9: [],
            10: [],
            11: [2, 3, 4, 5, 6],
            12: [17, 18, 19, 20, 21],
            13: [],
            14: [],
            15: [],
            16: [7, 8, 9],
            17: [],
            18: [10, 11, 12, 13, 14],
            19: [],
            20: [],
            21: [],
            22: [],
            23: [15, 16],
            24: [],
            25: [],
            26: [],
            27: [],
        }
        self.state_hash_to_move = {}
        self.save_state()

    def to_json(self):
        """Serialize the game state to a JSON-compatible dictionary."""
        return json.dumps({
            "players": [player.to_dict() for player in self.players],
            "game_board": self.game_board.to_dict(),
            "current_turn": self.current_turn,
            "rolls": self.rolls,
            "history": [
                {
                "Board": state["Board"].to_dict(),
                "Players": [player.to_dict() for player in state["Players"]],
                "Current_turn": state["Current_turn"],
                "Rolls": state["Rolls"],
                "Columns": state["Columns"],
                "Checkers": [checker.to_dict() for checker in state["Checkers"]],
                "Message": state["Message"],
                }
                for state in self.history
            ],
            "history_pointer": self.history_pointer,
            "real_game": self.real_game,
            "end_of_turn": self.end_of_turn,
            "message": self.message,
            "checkers": [checker.to_dict() for checker in self.checkers],
            "columns": self.columns,
        })
    
    @classmethod
    def from_json(cls, json_data):
        """Deserialize the JSON data back into a Backgammon object."""
        data = json.loads(json_data)
        players = [Player.from_dict(p) for p in data["players"]]
        game = cls(
            name1=players[0].name,
            name2=players[1].name,
            AI1=players[0].AI,
            AI2=players[1].AI,
        )
        game.game_board = Board.from_dict(data["game_board"])
        game.current_turn = data["current_turn"]
        game.rolls = data["rolls"]
        game.history = [
            {
                "Board": Board.from_dict(state["Board"]),
                "Players": [Player.from_dict(player) for player in state["Players"]],
                "Current_turn": state["Current_turn"],
                "Rolls": state["Rolls"],
                "Columns": state["Columns"],
                "Checkers": [Checker.from_dict(checker) for checker in state["Checkers"]],
                "Message": state["Message"],
            }
            for state in data["history"]
        ]
        game.history_pointer = data["history_pointer"]
        game.real_game = data["real_game"]
        game.end_of_turn = data["end_of_turn"]
        game.message = data["message"]
        game.checkers = [Checker.from_dict(c) for c in data["checkers"]]
        game.columns = data["columns"]
        return game
    
    def update_locations(self, start, end):
        checker_idx = self.columns[start].pop()
        checker = self.checkers[checker_idx]

        if end == 26:
            checker.x = 601.5
            checker.y = len(self.columns[end]) * 11
            self.columns[end].append(checker_idx)
        elif end == 27:
            checker.x = 601.5
            checker.y = 450 - len(self.columns[end]) * 11
            self.columns[end].append(checker_idx)
        elif len(self.columns[end]) == 0:
            if end <= 5:
                checker.x = 5.75 + 47.5 * end
                checker.y = 0
            elif end <= 11:
                checker.x = 5.75 + 47.5 * end + 20
                checker.y = 0
            elif end <= 17:
                checker.x = 548.25 - 47.5 * (end % 12)
                checker.y = 424
            elif end <= 23:
                checker.x = 548.25 - 47.5 * (end % 12) - 20
                checker.y = 424
            self.columns[end].append(checker_idx)
        elif (self.checkers[self.columns[end][0]].id <= 14 and checker.id <= 14) or (
            self.checkers[self.columns[end][0]].id >= 15 and checker.id >= 15
        ):
            if end <= 5:
                checker.x = 5.75 + 47.5 * end
                checker.y = len(self.columns[end]) * 36
            elif end <= 11:
                checker.x = 5.75 + 47.5 * end + 20
                checker.y = len(self.columns[end]) * 36
            elif end <= 17:
                checker.x = 548.25 - 47.5 * (end % 12)
                checker.y = 424 - len(self.columns[end]) * 36
            elif end <= 23:
                checker.x = 548.25 - 47.5 * (end % 12) - 20
                checker.y = 424 - len(self.columns[end]) * 36
            self.columns[end].append(checker_idx)
        elif self.checkers[self.columns[end][0]].id <= 14 and checker.id >= 15:
            dead_checker_idx = self.columns[end].pop()
            if end <= 5:
                checker.x = 5.75 + 47.5 * end
                checker.y = 0
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    250 + 40 * self.players[1].num_dead_pieces
                )
            elif end <= 11:
                checker.x = 5.75 + 47.5 * end + 20
                checker.y = 0
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    250 + 40 * self.players[1].num_dead_pieces
                )
            elif end <= 17:
                checker.x = 548.25 - 47.5 * (end % 12)
                checker.y = 424
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    250 + 40 * self.players[1].num_dead_pieces
                )
            elif end <= 23:
                checker.x = 548.25 - 47.5 * (end % 12) - 20
                checker.y = 424
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    250 + 40 * self.players[1].num_dead_pieces
                )
            self.columns[25].append(dead_checker_idx)
            self.columns[end].append(checker_idx)
        elif self.checkers[self.columns[end][0]].id >= 15 and checker.id <= 14:
            dead_checker_idx = self.columns[end].pop()
            if end <= 5:
                checker.x = 5.75 + 47.5 * end
                checker.y = 0
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    210 - 40 * self.players[0].num_dead_pieces
                )
            elif end <= 11:
                checker.x = 5.75 + 47.5 * end + 20
                checker.y = 0
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    210 - 40 * self.players[0].num_dead_pieces
                )
            elif end <= 17:
                checker.x = 548.25 - 47.5 * (end % 12)
                checker.y = 424
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    210 - 40 * self.players[0].num_dead_pieces
                )
            elif end <= 23:
                checker.x = 548.25 - 47.5 * (end % 12) - 20
                checker.y = 424
                self.checkers[dead_checker_idx].x = -52.5
                self.checkers[dead_checker_idx].y = (
                    210 - 40 * self.players[0].num_dead_pieces
                )
            self.columns[24].append(dead_checker_idx)
            self.columns[end].append(checker_idx)
        return

    def from_existing_board(cls, name1, name2, board, current_player, rolls):
        game = cls(name1, name2)
        game.game_board = board
        game.current_turn = current_player
        game.rolls = rolls
        return game

    def __hash__(self):
        return hash(tuple(self.game_board.board))

    def __str__(self):
        player_info = f"White: {self.players[0].name} | Black: {self.players[1].name}\n"
        rolls_info = f"Rolls available: {self.rolls}\n"
        current_turn = f"Current turn: {self.players[self.current_turn].name} ({self.players[self.current_turn].color})\n"
        dead_people = f"White Dead: {self.players[0].num_dead_pieces} | Black Dead: {self.players[1].num_dead_pieces}\n"
        board_display = str(self.game_board)
        return f"{player_info}{rolls_info}{current_turn}{dead_people}{board_display}"

    def __eq__(self, other):
        if not isinstance(other, Backgammon):
            return False
        return (
            self.players == other.players
            and self.game_board.board == other.game_board.board
            and self.current_turn == other.current_turn
            and self.rolls == other.rolls
        )

    def save_state(self):
        state = {
            "Board": copy.deepcopy(self.game_board),
            "Players": copy.deepcopy(self.players),
            "Current_turn": copy.deepcopy(self.current_turn),
            "Rolls": copy.deepcopy(self.rolls),
            "Columns": copy.deepcopy(self.columns),
            "Checkers": [copy.deepcopy(checker) for checker in self.checkers],
            "Message": copy.deepcopy(self.message),
        }
        if self.history_pointer < len(self.history) - 1:
            self.history = self.history[: self.history_pointer + 1]
        self.history.append(state)
        self.history_pointer += 1

    def load_state(self, state):
        self.game_board = copy.deepcopy(state["Board"])
        self.players = copy.deepcopy(state["Players"])
        self.current_turn = copy.deepcopy(state["Current_turn"])
        self.rolls = copy.deepcopy(state["Rolls"])
        self.columns = copy.deepcopy(state["Columns"])
        self.checkers = [copy.deepcopy(checker) for checker in state["Checkers"]]
        self.message = copy.deepcopy(state["Message"])

    def undo(self):
        if self.history_pointer >= 1:
            self.history_pointer -= 1
            previous_state = self.history[self.history_pointer]
            self.load_state(previous_state)
            return True
        return False

    def redo(self):
        if self.history_pointer < len(self.history) - 1:
            self.history_pointer += 1
            next_state = self.history[self.history_pointer]
            self.load_state(next_state)
            return True
        return False

    def change_turn(self):
        if self.rolls == [] and self.end_of_turn:
            self.current_turn = (self.current_turn + 1) % 2
            self.end_of_turn = False
            self.history = []
            self.history_pointer = -1

    def possible_states(self):
        temporary = copy.deepcopy(self)
        i = 0
        possible_states_1 = set()
        possible_states_2 = set()
        possible_states_1_dict = {}
        possible_states_2_dict = {}
        possible_starts = temporary.game_board.possible_starts(
            temporary.rolls, temporary.players[temporary.current_turn]
        )
        if len(temporary.rolls) == 2:
            for start in possible_starts:
                possible_moves = temporary.game_board.possible_moves(
                    start, temporary.rolls, temporary.players[temporary.current_turn]
                )
                for end in possible_moves:
                    temp_game = copy.deepcopy(temporary)
                    temp_game.make_move(start, end, possible_moves)
                    move = (start, end)
                    temp_game_hash = hash(temp_game)
                    if temp_game_hash not in possible_states_1_dict:
                        possible_states_1.add(temp_game)
                        possible_states_1_dict[temp_game_hash] = move
                    new_possible_starts = temp_game.game_board.possible_starts(
                        temp_game.rolls, temp_game.players[temp_game.current_turn]
                    )
                    for new_start in new_possible_starts:
                        new_possible_moves = temp_game.game_board.possible_moves(
                            new_start,
                            temp_game.rolls,
                            temp_game.players[temp_game.current_turn],
                        )
                        for new_end in new_possible_moves:
                            done_state = copy.deepcopy(temp_game)
                            done_state.make_move(new_start, new_end, new_possible_moves)
                            new_move = (new_start, new_end)
                            i += 1
                            done_state_hash = hash(done_state)
                            if done_state_hash not in possible_states_2_dict:
                                possible_states_2.add(done_state)
                                possible_states_2_dict[done_state_hash] = (
                                    move,
                                    new_move,
                                )
            if possible_states_2:
                self.state_hash_to_move = possible_states_2_dict
                return possible_states_2
            elif possible_states_1:
                self.state_hash_to_move = possible_states_1_dict
                return possible_states_1
        self.state_hash_to_move[hash(temporary)] = ()
        return [temporary]

    def determine_first_turn(self):
        while True:
            roll1, roll2 = Dice.roll_dice()
            if roll1 > roll2:
                self.current_turn = 0
                print(f"{self.players[0].name} (White) Player Goes First!")
                break
            elif roll1 < roll2:
                self.current_turn = 1
                print(f"{self.players[1].name} (Black) Player Goes First!")
                break

    def check_winner(self):
        for player in self.players:
            if player.num_home_pieces == 15:
                self.message = "Winner!"
                return True
        self.message = "No Winner!"
        return False

    def is_possible_move(self):
        if (
            self.game_board.possible_starts(self.rolls, self.players[self.current_turn])
            != []
        ):
            self.message = "Possible Move!"
        else:
            self.end_of_turn = True
            self.rolls = []
            self.message = "No Possible Move!"
        return

    def make_move(self, start, end, possible):
        self.rolls.remove(possible[end])
        if self.current_turn == 0:
            if self.players[0].num_dead_pieces > 0:
                if self.game_board.board[end] == 1:
                    self.players[0].num_dead_pieces -= 1
                    self.game_board.board[end] -= 2
                    self.players[1].num_dead_pieces += 1
                else:
                    self.players[0].num_dead_pieces -= 1
                    self.game_board.board[end] -= 1
            elif end == 26:
                self.game_board.board[start] += 1
                self.players[0].num_home_pieces += 1
            else:
                if self.game_board.board[end] == 1:
                    self.game_board.board[start] += 1
                    self.game_board.board[end] -= 2
                    self.players[1].num_dead_pieces += 1
                else:
                    self.game_board.board[start] += 1
                    self.game_board.board[end] -= 1
        else:
            if self.players[1].num_dead_pieces > 0:
                if self.game_board.board[end] == -1:
                    self.players[1].num_dead_pieces -= 1
                    self.game_board.board[end] += 2
                    self.players[0].num_dead_pieces += 1
                else:
                    self.players[1].num_dead_pieces -= 1
                    self.game_board.board[end] += 1
            elif end == 27:
                self.game_board.board[start] -= 1
                self.players[1].num_home_pieces += 1
            else:
                if self.game_board.board[end] == -1:
                    self.game_board.board[start] -= 1
                    self.game_board.board[end] += 2
                    self.players[0].num_dead_pieces += 1
                else:
                    self.game_board.board[start] -= 1
                    self.game_board.board[end] += 1
        if self.rolls == []:
            self.end_of_turn = True
        if self.real_game:
            self.update_locations(start, end)
            self.save_state()

    def pick_start(self, start):
        possible = self.game_board.possible_moves(
            start, self.rolls, self.players[self.current_turn]
        )
        self.message = possible

    def ai_play(self):
        the_rolls = self.rolls
        if len(the_rolls) == 4:
            mcts = MCTS()
            self.rolls = the_rolls[0:2]
            best_move = mcts.search(self)
            self.game_board = best_move.game.game_board
            self.players = best_move.game.players
            self.rolls = the_rolls[2:4]
            moves = self.state_hash_to_move[hash(best_move.game)]
            if len(moves) == 0:
                self.end_of_turn = False
                self.rolls = []
                return
            if isinstance(moves[0], tuple):
                for move_pair in moves:
                    start, end = move_pair
                    self.update_locations(start, end)
            else:
                start, end = moves
                self.update_locations(start, end)
        mcts = MCTS()
        best_move = mcts.search(self)
        self.game_board = best_move.game.game_board
        self.players = best_move.game.players
        self.rolls = best_move.game.rolls
        moves = self.state_hash_to_move[hash(best_move.game)]
        self.end_of_turn = False
        self.rolls = []
        if len(moves) == 0:
            self.end_of_turn = False
            self.rolls = []
            return
        if isinstance(moves[0], tuple):
            for move_pair in moves:
                start, end = move_pair
                self.update_locations(start, end)
        else:
            start, end = moves
            self.update_locations(start, end)
        return

    def play_turn(self):
        if self.rolls == []:
            self.current_turn = (self.current_turn + 1) % 2
            roll1, roll2 = Dice.roll_dice()
            if roll1 == roll2:
                self.rolls = [roll1, roll2] * 2
            else:
                self.rolls = [roll1, roll2]
        all_possible_starts = self.game_board.possible_starts(
            self.rolls, self.players[self.current_turn]
        )
        if all_possible_starts == []:
            self.rolls = []
            return
        start = random.choice(all_possible_starts)
        possible = self.game_board.possible_moves(
            start, self.rolls, self.players[self.current_turn]
        )
        end = random.choice(list(possible.keys()))
        self.make_move(start, end, possible)

    def restart_game(self):
        self.players = [
            Player(self.name1, "White", 26, 24, self.AI1),
            Player(self.name2, "Black", 27, 25, self.AI2),
        ]
        self.game_board = Board()
        self.current_turn = None
        self.rolls = []
        self.history = []
        self.history_pointer = -1
        self.real_game = True
        self.end_of_turn = False
        self.determine_first_turn()
        self.message = ""
        self.checkers = [
            Checker(0, 5.75, 0),
            Checker(1, 5.75, 36),
            Checker(2, 548.25, 0),
            Checker(3, 548.25, 36),
            Checker(4, 548.25, 72),
            Checker(5, 548.25, 108),
            Checker(6, 548.25, 144),
            Checker(7, 358.25, 424),
            Checker(8, 358.25, 388),
            Checker(9, 358.25, 352),
            Checker(10, 242.25, 424),
            Checker(11, 242.25, 388),
            Checker(12, 242.25, 352),
            Checker(13, 242.25, 316),
            Checker(14, 242.25, 280),
            Checker(15, 5.25, 424),
            Checker(16, 5.25, 388),
            Checker(17, 548.25, 424),
            Checker(18, 548.25, 388),
            Checker(19, 548.25, 352),
            Checker(20, 548.25, 316),
            Checker(21, 548.25, 280),
            Checker(22, 358.25, 0),
            Checker(23, 358.25, 36),
            Checker(24, 358.25, 72),
            Checker(25, 242.25, 0),
            Checker(26, 242.25, 36),
            Checker(27, 242.25, 72),
            Checker(28, 242.25, 108),
            Checker(29, 242.25, 144),
        ]
        self.columns = {
            0: [0, 1],
            1: [],
            2: [],
            3: [],
            4: [],
            5: [25, 26, 27, 28, 29],
            6: [],
            7: [22, 23, 24],
            8: [],
            9: [],
            10: [],
            11: [2, 3, 4, 5, 6],
            12: [17, 18, 19, 20, 21],
            13: [],
            14: [],
            15: [],
            16: [7, 8, 9],
            17: [],
            18: [10, 11, 12, 13, 14],
            19: [],
            20: [],
            21: [],
            22: [],
            23: [15, 16],
            24: [],
            25: [],
            26: [],
            27: [],
        }
        self.save_state()

    def main_loop(self):
        while True:
            if self.check_winner():
                break
            self.play_turn()

    def start_game(self):
        self.main_loop()


def main():
    game = Backgammon("Player1", "Player2", "Monte", "User")


if __name__ == "__main__":
    main()
