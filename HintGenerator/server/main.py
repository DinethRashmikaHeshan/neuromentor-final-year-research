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

# --- LOAD SECURE API KEY ---
load_dotenv()
API_KEY = os.getenv("key")
client = genai.Client(api_key=API_KEY)

BEARER_TOKEN = os.getenv("BEARER_TOKEN")
HOSTED_URL = os.getenv("HOSTED_URL")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

CURRENT_COGNITIVE_STATE = "FOCUS"

async def listen_to_module1():
    global CURRENT_COGNITIVE_STATE
    uri = "ws://127.0.0.1:8001/ws/current_state"
    logger.info(f"Starting listener for Module 1 at {uri}")
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                logger.info("Connected to Module 1 successfully")
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    CURRENT_COGNITIVE_STATE = data.get("state", "FOCUS").upper()
                    logger.debug(f"Updated cognitive state to: {CURRENT_COGNITIVE_STATE}")
        except Exception as e:
            logger.warning(f"Module 1 connection failed: {e}. Retrying in 2s...")
            await asyncio.sleep(2)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(listen_to_module1())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)


llm = Llama(
    model_path="./llama-3.2-3b-instruct.Q4_K_M.gguf", 
    n_gpu_layers=-1, 
    n_ctx=2048,
    verbose=False 
)




HINT_MATRIX = {
    "missing_ampersand_scanf": {
        "FOCUS": {1: "Check your scanf arguments.", 2: "Your scanf is missing an address operator.", 3: "Add an '&' before the variable name in scanf."},
        "OVERLOAD": {1: "There's a tiny typo in your scanf.", 2: "Look closely at the variable in scanf. It needs an '&'.", 3: "Take a breath. Add an '&' right before the variable inside scanf."},
        "CONFUSE": {1: "scanf needs to know *where* to store the input.", 2: "scanf requires memory addresses. You missed the '&' symbol.", 3: "Because scanf modifies variables, it needs their address. Put '&' before your variable."}
    }
}

def analyze_c_code(code: str):
    if re.search(r'scanf\s*\(\s*"[^"]+"\s*,\s*([A-Za-z0-9_]+)\s*\)', code):
        logger.info("Detected error: missing_ampersand_scanf")
        return "missing_ampersand_scanf"
    logger.debug("No specific error pattern detected")
    return None 

def is_valid_c_code(code: str) -> bool:
    if not code or len(code.strip()) < 5:
        logger.debug("Code validation failed: empty or too short")
        return False
    c_keywords = ["#include", "main", "printf", "scanf", "return", "int ", "float ", "char ", "void ", "for(", "while(", "if("]
    is_valid = any(keyword in code for keyword in c_keywords)
    if not is_valid:
        logger.debug("Code validation failed: no C keywords found")
    else:
        logger.debug("Code validation passed")
    return is_valid

def get_local_ai_hint(code: str, state: str, attempt: int) -> str:
    prompt = f"""Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
You are an empathetic and expert C programming tutor. Analyze the student's code, cognitive state, and attempt number to provide a tailored, highly specific hint.

### Input:
Student Code:
{code}

Cognitive State: {state}
Attempt Number: {attempt}

### Response:
"""
    logger.info(f"Calling local LLM for hint generation (state={state}, attempt={attempt})")
    try:
        output = llm(prompt, max_tokens=150, stop=["### Instruction:"], echo=False)
        hint = output['choices'][0]['text'].strip()
        logger.debug(f"Local LLM generated hint: {hint[:50]}...")
        return hint
    except Exception as e:
        logger.error(f"Error calling local LLM: {e}")
        raise

def format_hint_to_vark(code: str, vark_style: str, base_hint: str):
    prompt = f"""
    You are a strict API formatting engine. Your ONLY job is to translate the provided C programming hint into the requested VARK learning style.
    
    Code Context: {code}
    Base Hint: "{base_hint}"
    Requested Style: {vark_style} (V=Visual, A=Audio, R=Reading, K=Kinesthetic)
    
    MEDIA RULES:
    - V: Output ONLY raw Mermaid.js syntax (e.g., graph TD; A-->B;). Do NOT use ```mermaid markdown.
    - A: Output a conversational script designed to be read aloud by Text-to-Speech.
    - R: Output a clear, text-based explanation of the bug.
    - K: Output a short physical instruction (e.g., "Highlight line 4 and type an ampersand").

    You must output ONLY a valid JSON object. No other text.
    {{
        "hint_text": "A short 1-sentence empathetic hint.",
        "vark_mode": "{vark_style}",
        "media_content": "The media data based on the rules above."
    }}
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1, 
            )
        )
        
        # Clean the output
        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        payload = json.loads(clean_text.strip())
        return payload
        
    except Exception as e:
        print(f"❌ Error during formatting: {e}")
        return {"hint_text": base_hint, "vark_mode": "R", "media_content": base_hint}

@app.websocket("/ws/hints")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("New WebSocket client connected for hints")
    
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            
            code = data.get('code', '')
            attempt = min(int(data.get('attempt', 1)), 3)
            state = CURRENT_COGNITIVE_STATE
            logger.info(f"Received hint request - attempt: {attempt}, cognitive state: {state}")
            
            try:
                # 1. Set up your authentication header with ONLY the Bearer token
                headers = {
                    "Authorization": f"Bearer {BEARER_TOKEN}"
                }
                
                # 2. Put your exact hosted URL here
                hosted_url = HOSTED_URL
                
                # 3. Make the request
                vark_res = await asyncio.to_thread(
                    requests.get, 
                    hosted_url, 
                    headers=headers, 
                    timeout=5 
                )
                
                # 4. CONSOLE LOG THE OUTPUT
                print(f"🌐 VARK API Status Code: {vark_res.status_code}")
                print(f"🌐 VARK API Raw Response: {vark_res.text}")
                
                # 5. Extract the style safely
                vark_style = vark_res.json().get("vark", "R").upper()
                print(f"✅ Extracted VARK Style: {vark_style}")
                
            except Exception as e:
                print(f"⚠️ VARK API Fetch Failed: {e}")
                vark_style = "R" # Fallback to Reading if the internet drops
            
            if not is_valid_c_code(code):
                logger.warning("Received invalid C code from client")
                await websocket.send_text(json.dumps({
                    "error": "🛡️ Guardrail: Please submit valid C programming code."
                }))
                continue
            
            detected_error = analyze_c_code(code)
            if detected_error and detected_error in HINT_MATRIX:
                base_hint = HINT_MATRIX[detected_error][state][attempt]
                logger.info(f"Using predefined hint for {detected_error}")
            else:
                logger.info("No predefined hint found, generating custom hint with local LLM")
                base_hint = get_local_ai_hint(code, state, attempt)
            
            vark_payload = format_hint_to_vark(code, vark_style, base_hint)
            
            logger.info("Sending formatted hint to client")
            await websocket.send_text(json.dumps({
                "status": "success",
                "ai_payload": vark_payload,
                "base_hint": base_hint,
                "attempt": attempt
            }))
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket endpoint: {e}")
        try:
            await websocket.send_text(json.dumps({"error": "Internal server error"}))
        except:
            pass