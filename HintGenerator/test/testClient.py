import asyncio
import websockets
import json
import ssl

async def test_tutor():
    # uri = "wss://llama-app.lemonflower-bec54065.centralindia.azurecontainerapps.io/ws/hints"
    uri = "ws://localhost:8000/ws/hints"
    
    # Disable SSL verification for self-signed certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    async with websockets.connect(uri, ssl=ssl_context) as websocket:
        print("✅ Connected to Tutor Backend")
        
        # --- TEST 1: The Fast Path (Regex Match) ---
        print("\n--- Sending Test 1 (Missing Ampersand) ---")
        payload1 = {
            "code": 'int main() { int age; scanf("%d", age); return 0; }',
            "attempt": 2,
            "cognitive_state": "OVERLOAD",
            "token": "my_test_token"
        }
        await websocket.send(json.dumps(payload1))
        response1 = await websocket.recv()
        print("📥 Received:", json.dumps(json.loads(response1), indent=2))

        # --- TEST 2: The Slow Path (Local Llama LLM) ---
        # print("\n--- Sending Test 2 (Unknown Error) ---")
        # payload2 = {
        #     "code": 'int main() { printf("Hello World") return 0; }', # Missing semicolon
        #     "attempt": 1,
        #     "cognitive_state": "FOCUS"
        # }
        # await websocket.send(json.dumps(payload2))
        # response2 = await websocket.recv()
        # print("📥 Received:", json.dumps(json.loads(response2), indent=2))

asyncio.run(test_tutor())