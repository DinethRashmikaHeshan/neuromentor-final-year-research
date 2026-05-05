import os
import json
import re
import requests
import asyncio
import websockets
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from google import genai
from google.genai import types
from llama_cpp import Llama
import logging

import httpx  # replace or supplement `requests`

# --- LOAD SECURE API KEY & CONFIG ---
load_dotenv()
API_KEY = os.getenv("key")
client = genai.Client(api_key=API_KEY)

BEARER_TOKEN = os.getenv("BEARER_TOKEN")
HOSTED_URL = os.getenv("HOSTED_URL")

# Configure logging to be clean for the demo
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

CURRENT_COGNITIVE_STATE = "FOCUS"

# --- MODULE 1 LISTENER (Cognitive State) ---
async def listen_to_module1():
    global CURRENT_COGNITIVE_STATE
    uri = "ws://127.0.0.1:8001/ws/current_state"
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                logger.info("✅ Connected to Module 1 (Cognitive Engine)")
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    CURRENT_COGNITIVE_STATE = data.get("state", "FOCUS").upper()
        except Exception:
            await asyncio.sleep(2)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(listen_to_module1())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

# --- HEALTH CHECK ---
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- LOCAL AI MODEL ---
llm = Llama(
    model_path="./model.gguf", 
    n_gpu_layers=-1, 
    n_ctx=2048,
    verbose=False 
)

# --- PREDEFINED HINT MATRIX ---
HINT_MATRIX = {
    "missing_ampersand_scanf": {
        "FOCUS": {1: "Check your scanf arguments.", 2: "Your scanf is missing an address operator.", 3: "Add an '&' before the variable name in scanf."},
        "OVERLOAD": {1: "There's a tiny typo in your scanf.", 2: "Look closely at the variable in scanf. It needs an '&'.", 3: "Take a breath. Add an '&' right before the variable inside scanf."},
        "CONFUSE": {1: "scanf needs to know *where* to store the input.", 2: "scanf requires memory addresses. You missed the '&' symbol.", 3: "Because scanf modifies variables, it needs their address. Put '&' before your variable."}
    }
}

def analyze_c_code(code: str):
    if re.search(r'scanf\s*\(\s*"[^"]+"\s*,\s*([A-Za-z0-9_]+)\s*\)', code):
        return "missing_ampersand_scanf"
    return None 

def is_valid_c_code(code: str) -> bool:
    if not code or len(code.strip()) < 5: return False
    c_keywords = ["#include", "main", "printf", "scanf", "return", "int ", "float ", "char ", "void "]
    return any(keyword in code for keyword in c_keywords)

def get_local_ai_hint(code: str, state: str, attempt: int) -> str:
    prompt = f"### Instruction:\nYou are an expert C tutor. Provide a short, empathetic hint for this code.\nState: {state}, Attempt: {attempt}\nCode: {code}\n### Response:\n"
    try:
        output = llm(prompt, max_tokens=100, stop=["### Instruction:"], echo=False)
        hint = output['choices'][0]['text'].strip()
        print(f"🔍 Local LLM: {hint}")
        return hint
    except Exception as e:
        logger.error(f"Local AI Error: {e}")
        return "Check your syntax carefully."

# --- VARK FORMATTER (Gemini) ---
def format_hint_to_vark(code: str, vark_style: str, base_hint: str):
    prompt = f"""
    Translate this C hint into VARK style '{vark_style}'.
    Base Hint: "{base_hint}"
    
    RULES:
    - V: ONLY a Mermaid flowchart. Start with 'flowchart TD;'. Use ';' to separate nodes.
    - A: Conversational script for audio.
    - R: Clear text explanation.
    - K: Step-by-step physical typing instructions. Use \\n for steps.

    Output valid JSON:
    {{
        "hint_text": "1-sentence hint",
        "vark_mode": "{vark_style}",
        "media_content": "VARK data"
    }}
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', # Optimized for speed
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        payload = json.loads(response.text.strip())
        
        # BULLETPROOF FIX: Convert any string newlines to real newlines
        if payload.get("media_content"):
            payload["media_content"] = payload["media_content"].replace("\\n", "\n")
            
        return payload
    except Exception as e:
        logger.error(f"❌ Gemini Error: {e}")
        return {"hint_text": base_hint, "vark_mode": "R", "media_content": base_hint}

# --- MAIN WEBSOCKET ---
@app.websocket("/ws/hints")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("🚀 VS Code Client Connected")
    
    try:
        while True:
            raw_data = await websocket.receive_text()
            
            # FIX 5: Guard against invalid JSON
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            code = data.get('code', '')
            
            # FIX 2: Clamp attempt between 1 and 3
            attempt = max(1, min(int(data.get('attempt', 1)), 3))
            
            # FIX 3: Get cognitive state per-request from client, not from a global
            state = data.get('cognitiveState', CURRENT_COGNITIVE_STATE)

            # FIX 1: Only use client token if it's a non-empty string
            client_token = data.get('token', '').strip()
            vark_from_client = data.get('vark', '')
            actual_token = client_token if client_token else BEARER_TOKEN

            print(f"\n{'='*60}")
            print(f"[DEBUG] ===== NEW HINT REQUEST RECEIVED =====")
            print(f"[DEBUG] Full Payload from Client: {data}")
            print(f"[DEBUG]")
            print(f"[DEBUG] 📝 studentCode: {code[:100] if code else '(EMPTY)'} {'...' if len(code) > 100 else ''}")
            print(f"[DEBUG]    Length: {len(code)} chars")
            print(f"[DEBUG]")
            print(f"[DEBUG] 🔄 attempt: {attempt}/3")
            print(f"[DEBUG] 🎨 vark: '{vark_from_client}' (from client) → Will use style: '{vark_from_client if vark_from_client else 'AUTO-DETECT'}'")
            print(f"[DEBUG] 🔐 token: {actual_token[:30] + '...' if actual_token else '(NO TOKEN - USING BEARER_TOKEN)'}")
            print(f"[DEBUG]    Token empty? {not client_token} | Falling back to BEARER_TOKEN? {not client_token and BEARER_TOKEN}")
            print(f"[DEBUG] 🧠 cognitiveState: {state}")
            print(f"{'='*60}")

            vark_style = "R"  # Default fallback

            # FIX 4: Use httpx for native async instead of requests in thread pool
            try:
                print(f"[DEBUG] External Module: Fetching style from {HOSTED_URL}")
                headers = {"Authorization": f"Bearer {actual_token}"}

                async with httpx.AsyncClient() as client:
                    vark_res = await client.get(HOSTED_URL, headers=headers, timeout=10)

                if vark_res.status_code == 200:
                    module_2_data = vark_res.json()
                    print(f"[DEBUG] External Module Response: {module_2_data}")

                    raw_style = module_2_data.get(
                        "predicted_style", module_2_data.get("vark", "R")
                    ).upper()

                    style_map = {
                        'VISUAL': 'V', 'AURAL': 'A', 'READING/WRITING': 'R',
                        'KINESTHETIC': 'K', 'MULTIMODAL': 'V'
                    }
                    vark_style = style_map.get(raw_style, raw_style)
                    print(f"[DEBUG] Final Style Decided: {vark_style}")
                else:
                    print(f"[DEBUG] External Module Error: Status {vark_res.status_code}")

            except Exception as e:
                print(f"[DEBUG] External Module Connection Failed: {e}")
                vark_style = "R"

            # --- PROCESS HINT ---
            if not is_valid_c_code(code):
                await websocket.send_text(json.dumps({"error": "Invalid C code"}))
                continue

            error_key = analyze_c_code(code)
            if error_key and error_key in HINT_MATRIX:
                base_hint = HINT_MATRIX[error_key][state][attempt]
            else:
                base_hint = get_local_ai_hint(code, state, attempt)

            vark_payload = format_hint_to_vark(code, vark_style, base_hint)

            print(f"[DEBUG] Sending VARK Payload: {vark_payload['vark_mode']}")
            print(f"[DEBUG] ------------------------\n")

            await websocket.send_text(json.dumps({
                "status": "success",
                "ai_payload": vark_payload,
                "base_hint": base_hint,
                "attempt": attempt
            }))

    except WebSocketDisconnect:
        logger.info("🔌 VS Code Disconnected")
    except Exception as e:
        logger.error(f"Unexpected Error: {e}")
        # FIX 6: Close WebSocket cleanly on unexpected error
        await websocket.close(code=1011)