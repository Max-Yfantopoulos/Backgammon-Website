import math
import random
import copy


class Dice:
    def roll_dice():
        return random.randrange(6) + 1, random.randrange(6) + 1


class TreeNode:
    def __init__(self, game, parent):
        self.game = game
        if self.game.check_winner():
            self.is_terminal = True
        else:
            self.is_terminal = False
        self.is_fully_expanded = self.is_terminal
        self.parent = parent
        self.visits = 0
        self.score = 0
        self.children = {}
        self.root = 0
        self.all_possible_states = []


class MCTS:
    def search(self, inital_state):
        self.root = TreeNode(inital_state, None)
        self.all_possible_states = self.root.game.possible_states()
        if len(self.all_possible_states) == 1:
            node = TreeNode(self.all_possible_states.pop(), self.root)
            return node
        for i in range(1000):
            node = self.select(self.root)
            score = self.rollout(node.game)
            self.backpropagate(node, score)
        try:
            return self.get_best_move(self.root, 0)
        except:
            pass

    def select(self, node):
        while not node.is_terminal:
            if node.is_fully_expanded:
                return self.get_best_move(node, 1.4)
            else:
                return self.expand(node)

    def expand(self, node):
        state = self.all_possible_states.pop()
        new_node = TreeNode(state, node)
        node.children[hash(state)] = new_node
        if len(self.all_possible_states) == 0:
            node.is_fully_expanded = True
        return new_node

    def rollout(self, game):
        the_board = game.game_board.board.copy()
        the_rolls = game.rolls
        the_current_turn = game.current_turn
        white_player_dead = game.players[0].num_dead_pieces
        white_player_home = game.players[0].num_home_pieces
        black_player_dead = game.players[1].num_dead_pieces
        black_player_home = game.players[1].num_home_pieces
        white_player_type = game.players[0].AI
        black_player_type = game.players[1].AI

        game.players[0].AI = "Random"
        game.players[1].AI = "Random"
        game.real_game = False
        game.start_game()
        game.game_board.board = the_board
        game.current_turn = the_current_turn
        game.players[0].num_dead_pieces = white_player_dead
        game.players[0].num_home_pieces = white_player_home
        game.players[1].num_dead_pieces = black_player_dead
        game.players[1].num_home_pieces = black_player_home
        game.players[0].AI = white_player_type
        game.players[1].AI = black_player_type
        game.rolls = the_rolls
        game.real_game = True
        if game.current_turn == 0:
            return 1
        elif game.current_turn == 1:
            return -1

    def backpropagate(self, node, score):
        while node is not None:
            node.visits += 1
            node.score += score
            node = node.parent

    def get_best_move(self, node, explore_constant):
        best_score = float("-inf")
        best_moves = []

        for child_node in node.children.values():
            if child_node.game.current_turn == 0:
                current_player = 1
            elif child_node.game.current_turn == 1:
                current_player = -1
            move_score = (
                current_player * child_node.score / child_node.visits
                + explore_constant
                * math.sqrt(math.log(node.visits / child_node.visits))
            )
            if move_score > best_score:
                best_score = move_score
                best_moves = [child_node]
            elif move_score == best_score:
                best_moves.append(child_node)

        return random.choice(best_moves)
