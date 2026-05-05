

import asyncio
import json
import websockets
import ssl

async def test_websocket():
    url = "wss://llama-app.lemonflower-bec54065.centralindia.azurecontainerapps.io/ws/hints"
    
    # Skip SSL verification
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        async with websockets.connect(url, ssl=ssl_context) as websocket:
            print("✅ Connected to WebSocket")
            
            # Test payload
            payload = {
                "code": "#include <stdio.h>\nint main() {\n  int x;\n  scanf(\"%d\", x);\n  return 0;\n}",
                "attempt": 1,
                "cognitiveState": "FOCUS",
                "vark": "V",
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6…Q.EAI8Y30n5QZTUL-_Il52iZd_DoBSnJygj_lCwJX5294"
            }
            
            print(f"\n📤 Sending payload:")
            print(json.dumps(payload, indent=2))
            
            await websocket.send(json.dumps(payload))
            
            print("\n⏳ Waiting for response...")
            response = await websocket.recv()
            
            print(f"\n📥 Response received:")
            print(json.dumps(json.loads(response), indent=2))
            
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(test_websocket())