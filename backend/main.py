from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import random
import string

from .manager import ConnectionManager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

class CreateRoomRequest(BaseModel):
    rounds: int = 5
    show_scores: bool = True

class JoinRoomRequest(BaseModel):
    room_code: str
    name: str

@app.post("/create-room")
async def create_room(request: CreateRoomRequest):
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    manager.create_room(room_code, {"rounds": request.rounds, "show_scores": request.show_scores})
    return {"room_code": room_code}

@app.get("/check-room/{room_code}")
async def check_room(room_code: str):
    room = manager.get_room(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"exists": True, "created": True} # Just to confirm

@app.websocket("/ws/{room_code}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, client_id: str):
    await manager.connect(websocket, room_code, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle messages
            action = data.get("action")
            room = manager.get_room(room_code)
            
            if not room:
                await websocket.send_json({"type": "error", "message": "Room does not exist"})
                break
             
            if action == "join":
                name = data.get("name")
                avatar = data.get("avatar", "")
                room.add_player(client_id, name, avatar)
                await manager.broadcast(room_code, {"type": "state_update", "data": room.to_dict()})
                
            elif action == "start_game":
                # Only host should start? For now anyone.
                room.start_game()
                await manager.broadcast(room_code, {"type": "state_update", "data": room.to_dict()})
                
            elif action == "submit_score":
                score = float(data.get("score"))
                room.submit_score(client_id, score)
                
                # Check for implicit winner OR explicit all submitted
                if room.check_implicit_winner() or room.all_scores_submitted():
                   summary = room.calculate_round_results()
                   await manager.broadcast(room_code, {"type": "round_end", "data": summary})
                   await manager.broadcast(room_code, {"type": "state_update", "data": room.to_dict()})
                else:
                    # Broadcast that someone submitted (maybe hide value)
                    await manager.broadcast(room_code, {"type": "state_update", "data": room.to_dict()})
            
            elif action == "vote_end":
                if room.vote_end_game(client_id):
                    await manager.broadcast(room_code, {
                        "type": "state_update",
                        "data": room.to_dict()
                    })

            elif action == "vote_restart":
                if room.toggle_restart_vote(client_id):
                    # Check if everyone is ready
                    if room.check_restart_condition():
                        # Game Reset!
                        await manager.broadcast(room_code, {
                            "type": "state_update",
                            "data": room.to_dict()
                        })
                    else:
                        # Just update votes
                        await manager.broadcast(room_code, {
                            "type": "state_update",
                            "data": room.to_dict()
                        })
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast(room_code, {"type": "player_left", "client_id": client_id})
        updated_room = manager.get_room(room_code)
        if updated_room:
             await manager.broadcast(room_code, {"type": "state_update", "data": updated_room.to_dict()})
