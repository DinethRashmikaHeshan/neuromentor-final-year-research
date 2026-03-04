import asyncio
import websockets
import json

async def test_my_socket():
    # Connect to the WebSocket we just built
    uri = "ws://127.0.0.1:8000/ws/hints"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to the server!")
        
        # The fake data your friend will send
        fake_payload = {
            "code": "int main() { printf('hello') }",
            "state": "CONFUSE",
            "attempt": 1
        }
        
        # Send it
        await websocket.send(json.dumps(fake_payload))
        print("Sent data to server...")
        
        # Wait for the instant response
        response = await websocket.recv()
        print(f"Received back: {response}")

# Run the test
asyncio.run(test_my_socket())