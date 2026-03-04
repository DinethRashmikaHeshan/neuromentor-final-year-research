from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json

app = FastAPI()

# We use @app.websocket instead of @app.post
@app.websocket("/ws/hints")
async def websocket_endpoint(websocket: WebSocket):
    # 1. Accept the incoming "phone call" from your friend's module
    await websocket.accept()
    print("🟢 Friend's module connected via WebSocket!")
    
    try:
        # 2. Keep the line open forever in a loop
        while True:
            # Wait to receive a JSON message from your friend
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            
            print(f"📥 Received real-time update: State is {data['state']} on Attempt {data['attempt']}")
            
            # (Later, this is where we will plug in Layer 1 Templates and Layer 2 AI)
            
            # 3. Send the hint instantly back through the open pipe
            response_payload = {
                "status": "success",
                "hint": f"Try taking a breath! I see you are in {data['state']}.",
                "source": "websocket_test"
            }
            await websocket.send_text(json.dumps(response_payload))
            
    except WebSocketDisconnect:
        print("🔴 Friend's module disconnected.")