import asyncio
import websockets
import json
import requests
import sys

# API URL
API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

async def test_game_flow():
    print("1. Creating Room...")
    try:
        resp = requests.post(f"{API_URL}/create-room", json={"rounds": 3, "show_scores": True})
        resp.raise_for_status()
        room_code = resp.json()["room_code"]
        print(f"   Room Created: {room_code}")
    except Exception as e:
        print(f"FAIL: Could not create room. {e}")
        return

    # Client IDs
    alice_id = "client_alice"
    bob_id = "client_bob"

    print("2. Connecting Players...")
    async with websockets.connect(f"{WS_URL}/{room_code}/{alice_id}") as ws_alice, \
               websockets.connect(f"{WS_URL}/{room_code}/{bob_id}") as ws_bob:
        
        # Join
        await ws_alice.send(json.dumps({"action": "join", "name": "Alice"}))
        await ws_bob.send(json.dumps({"action": "join", "name": "Bob"}))
        
        # Consume state updates
        _ = await ws_alice.recv() # State update
        _ = await ws_bob.recv()   # State update
        
        print("   Players joined.")

        # Start Game
        print("3. Starting Game...")
        await ws_alice.send(json.dumps({"action": "start_game"}))
        
        # Consume state updates (Game Started)
        msg_alice = json.loads(await ws_alice.recv())
        msg_bob = json.loads(await ws_bob.recv())
        
        if msg_alice["data"]["game_started"] and msg_bob["data"]["game_started"]:
             print("   Game Started!")
        else:
             print("FAIL: Game did not start.")
             return

        # Submit Scores
        # Alice loses 50
        # Bob wins (0)
        print("4. Submitting Scores (Alice: 50, Bob: 0)...")
        await ws_alice.send(json.dumps({"action": "submit_score", "score": 50}))
        
        # Wait for update (Alice submitted)
        _ = await ws_alice.recv()
        _ = await ws_bob.recv()
        
        await ws_bob.send(json.dumps({"action": "submit_score", "score": 0}))
        
        # Expect Round End
        print("5. Verifying Results...")
        res_alice = json.loads(await ws_alice.recv())
        res_bob = json.loads(await ws_bob.recv())
        
        if res_alice["type"] == "round_end":
            data = res_alice["data"]
            pot = data["pot"]
            print(f"   Round Pot: {pot}")
            
            # Check winners
            winners = [d["name"] for d in data["details"] if d["change"] > 0]
            if "Bob" in winners and "Alice" not in winners:
                print("   SUCCESS: Bob won the pot!")
            else:
                print(f"FAIL: Unexpected winners: {winners}")
                
            # Check amounts
            alice_stat = next(d for d in data["details"] if d["name"] == "Alice")
            bob_stat = next(d for d in data["details"] if d["name"] == "Bob")
            
            if alice_stat["change"] == -50 and bob_stat["change"] == 50:
                 print("   SUCCESS: Score calculation correct.")
            else:
                 print(f"FAIL: Incorrect scores. Alice: {alice_stat['change']}, Bob: {bob_stat['change']}")
                 
        else:
            print(f"FAIL: Expected round_end, got {res_alice['type']}")

if __name__ == "__main__":
    try:
        asyncio.run(test_game_flow())
    except Exception as e:
        print(f"ERROR: {e}")
