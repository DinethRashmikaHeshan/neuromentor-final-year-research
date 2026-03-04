import asyncio
import websockets
import json
import time

async def run_test_suite():
    uri = "ws://127.0.0.1:8000/ws/hints"
    
    test_cases = [
        {
            "name": "Test 1: Layer 1 (Known Error, Attempt 1, FOCUS)",
            "payload": {"code": 'scanf("%d", age);', "state": "FOCUS", "attempt": 1}
        },
        {
            "name": "Test 2: Layer 1 (Known Error, Attempt 3, CONFUSE)",
            "payload": {"code": 'scanf("%d", age);', "state": "CONFUSE", "attempt": 3}
        },
        {
            "name": "Test 3: Layer 2 AI (Unknown Error, Attempt 1, OVERLOAD)",
            "payload": {"code": 'int main() { float x = 5/2; return 0; }', "state": "OVERLOAD", "attempt": 1}
        },
        {
            "name": "Test 4: Layer 2 AI (Unknown Error, Attempt 3, FOCUS)",
            "payload": {"code": 'int main() { float x = 5/2; return 0; }', "state": "FOCUS", "attempt": 3}
        },
        {
            "name": "Test 5: Edge Case (Attempt 99 - Should Cap at 3)",
            "payload": {"code": 'scanf("%d", age);', "state": "OVERLOAD", "attempt": 99}
        },
        {
            "name": "Test 6: Garbage Code (Let's see what the AI does!)",
            "payload": {"code": 'asdfghjkl;', "state": "CONFUSE", "attempt": 1}
        }
    ]

    async with websockets.connect(uri) as websocket:
        print("🟢 Connected to Test Server\n" + "="*50)
        
        for test in test_cases:
            print(f"▶️ RUNNING: {test['name']}")
            await websocket.send(json.dumps(test['payload']))
            
            # Wait for the server to process and reply
            response_json = await websocket.recv()
            response = json.loads(response_json)
            
            print(f"   Source: {response['source']}")
            print(f"   Hint:   {response['hint']}\n" + "-"*50)
            
            # Pause for 2 seconds between tests so it doesn't overwhelm the logs
            time.sleep(2) 

        print("✅ ALL TESTS COMPLETED.")

# Run the suite
asyncio.run(run_test_suite())