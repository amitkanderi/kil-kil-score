import json
import asyncio
from typing import Dict, List, Optional
from fastapi import WebSocket

class GameRoom:
    def __init__(self, room_code: str, total_rounds: int = 5, show_scores: bool = True):
        self.room_code = room_code
        self.total_rounds = total_rounds
        self.show_scores = show_scores
        # players: client_id -> {name, avatar, total_score, current_round_score, win_streak, loss_streak, is_host}
        self.players: Dict[str, dict] = {} 
        self.current_round = 1
        self.game_started = False
        self.game_over = False
        self.history: List[Dict] = []
        self.end_game_votes: set = set()
        self.restart_votes: set = set()

    def add_player(self, client_id: str, name: str, avatar: str = ""):
        if client_id not in self.players:
            self.players[client_id] = {
                "name": name, 
                "avatar": avatar,
                "total_score": 0.0, 
                "current_round_score": None,
                "win_streak": 0,
                "loss_streak": 0,
                "is_host": len(self.players) == 0
            }

    def remove_player(self, client_id: str):
        if client_id in self.players:
            del self.players[client_id]
        if client_id in self.end_game_votes:
            self.end_game_votes.remove(client_id)
        if client_id in self.restart_votes:
            self.restart_votes.remove(client_id)

    def start_game(self):
        if not self.game_started:
            self.game_started = True
            self.current_round = 1
            self.history = []
            self.end_game_votes.clear()
            # Reset streaks on new game start
            for p in self.players.values():
                p["win_streak"] = 0
                p["loss_streak"] = 0
                p["total_score"] = 0
                p["current_round_score"] = None
    
    def vote_end_game(self, client_id: str):
        if client_id in self.players:
            self.end_game_votes.add(client_id)
            # If all players voted, end game
            if len(self.end_game_votes) == len(self.players):
                self.game_over = True
            return True
        return False

    def toggle_restart_vote(self, client_id: str):
        if client_id in self.players:
            if client_id in self.restart_votes:
                self.restart_votes.remove(client_id)
            else:
                self.restart_votes.add(client_id)
            return True
        return False

    def check_restart_condition(self):
        # If all players voted to restart, reset to lobby
        if len(self.players) > 0 and len(self.restart_votes) == len(self.players):
             self.game_started = False
             self.game_over = False
             self.current_round = 1
             self.restart_votes.clear()
             return True
        return False

    def submit_score(self, client_id: str, score: float) -> bool:
        if self.game_started and not self.game_over:
            if client_id in self.players:
                 self.players[client_id]["current_round_score"] = score
            return True
        return False
    
    def check_implicit_winner(self):
        """
        Check if only one player hasn't submitted a score.
        If all other players submitted > 0 (loss), assume the last player is the winner (0).
        Returns True if round is complete.
        """
        if len(self.players) < 2: return False # Need at least 2 players
        
        pending_players = [cid for cid, p in self.players.items() if p["current_round_score"] is None]
        
        if len(pending_players) == 1:
            # Check if all others have submitted
            return True
        return False

    def all_scores_submitted(self):
        return all(p["current_round_score"] is not None for p in self.players.values())

    def calculate_round_results(self):
        # Handle implicit winner logic
        pending_players = [cid for cid, p in self.players.items() if p["current_round_score"] is None]
        if len(pending_players) == 1:
            # Auto-fill last player with 0 (Winner)
            self.players[pending_players[0]]["current_round_score"] = 0.0

        round_scores = {cid: p["current_round_score"] for cid, p in self.players.items() if p["current_round_score"] is not None}
        pot = sum(round_scores.values())
        
        winners = [cid for cid, score in round_scores.items() if score == 0]
        
        round_summary = {
            "round_num": self.current_round,
            "pot": pot,
            "details": [],
            "events": []
        }
        
        for cid, p in self.players.items():
            score = round_scores.get(cid, 0)
            change = 0
            is_winner = cid in winners
            
            if is_winner:
                if len(winners) > 0:
                    change = pot / len(winners)
                
                # Streak Logic
                if p["loss_streak"] >= 3:
                     round_summary["events"].append({"type": "comeback", "player": p["name"], "streak": p["loss_streak"]})
                
                p["win_streak"] += 1
                p["loss_streak"] = 0
                
                if p["win_streak"] >= 3:
                    round_summary["events"].append({"type": "win_streak", "player": p["name"], "streak": p["win_streak"]})
                    
            else:
                change = -score
                p["loss_streak"] += 1
                p["win_streak"] = 0
                
                if p["loss_streak"] >= 3:
                    round_summary["events"].append({"type": "loss_streak", "player": p["name"], "streak": p["loss_streak"]})
            
            p["total_score"] += change
            p["current_round_score"] = None # Reset
            
            round_summary["details"].append({
                "name": p["name"],
                "avatar": p.get("avatar", ""),
                "score_input": score,
                "change": change,
                "total": p["total_score"],
                "is_winner": is_winner,
                "win_streak": p["win_streak"],
                "loss_streak": p["loss_streak"]
            })
            
        self.history.append(round_summary)
        
        if self.current_round >= self.total_rounds:
            self.game_over = True
        else:
            self.current_round += 1
            
        return round_summary

    def to_dict(self):
        return {
            "room_code": self.room_code,
            "players": self.players,
            "current_round": self.current_round,
            "total_rounds": self.total_rounds,
            "game_started": self.game_started,
            "game_over": self.game_over,
            "history": self.history,
            "show_scores": self.show_scores,
            "votes": len(self.end_game_votes),
            "restart_votes": list(self.restart_votes)
        }

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {} 
        self.player_map: Dict[str, str] = {} # client_id -> room_code
        self.rooms: Dict[str, GameRoom] = {} 

    async def connect(self, websocket: WebSocket, room_code: str, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.player_map[client_id] = room_code

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        room_code = self.player_map.get(client_id)
        if room_code and room_code in self.rooms:
            room = self.rooms[room_code]
            room.remove_player(client_id)
            if not room.players:
                del self.rooms[room_code] # Cleanup empty room
        
        if client_id in self.player_map:
            del self.player_map[client_id]

    async def broadcast(self, room_code: str, message: dict):
        room = self.rooms.get(room_code)
        if room:
            for client_id in room.players.keys():
                connection = self.active_connections.get(client_id)
                if connection:
                    try:
                        await connection.send_json(message)
                    except:
                        pass # Handle broken pipe

    def get_room(self, room_code: str) -> Optional[GameRoom]:
        return self.rooms.get(room_code)

    def create_room(self, room_code: str, settings: dict) -> GameRoom:
        if room_code in self.rooms:
            return self.rooms[room_code]
        self.rooms[room_code] = GameRoom(room_code, settings.get("rounds", 5), settings.get("show_scores", True))
        return self.rooms[room_code]
