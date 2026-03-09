import asyncio
import random
from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.websocket("/ws/current_state")
async def state_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Streams a new state every 1 second
            payload = {"state": random.choice(["FOCUS", "OVERLOAD", "CONFUSE"])}
            await websocket.send_json(payload)
            await asyncio.sleep(1) 
    except Exception:
        print("Module 1 disconnected.")