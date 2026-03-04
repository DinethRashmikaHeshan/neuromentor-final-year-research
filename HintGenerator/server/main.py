from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from llama_cpp import Llama
import json
import re

app = FastAPI()

# --- 1. LOAD YOUR CUSTOM AI MODEL (LAYER 2) ---
print("🧠 Loading Custom AI Model into Mac M1 Memory...")
try:
    # Updated to your exact model name and path
    llm = Llama(
        model_path="./llama-3.2-3b-instruct.Q4_K_M.gguf", 
        n_gpu_layers=-1, # Uses 100% of Apple Metal GPU
        n_ctx=2048,
        verbose=False 
    )
    print("✅ AI Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Failed to load model. Please check the file name and path. Error: {e}")

# --- 2. THE 3x3 MATRIX (LAYER 1) ---
HINT_MATRIX = {
    "missing_ampersand_scanf": {
        "FOCUS": {1: "Check your scanf arguments.", 2: "Your scanf is missing an address operator.", 3: "Add an '&' before the variable name in scanf."},
        "OVERLOAD": {1: "There's a tiny typo in your scanf.", 2: "Look closely at the variable in scanf. It needs an '&'.", 3: "Take a breath. Add an '&' right before the variable inside scanf."},
        "CONFUSE": {1: "scanf needs to know *where* to store the input.", 2: "scanf requires memory addresses. You missed the '&' symbol.", 3: "Because scanf modifies variables, it needs their address. Put '&' before your variable."}
    },
    "assignment_in_if": {
        "FOCUS": {1: "Check your 'if' condition.", 2: "Are you comparing or assigning?", 3: "Use '==' for comparison, not '='."},
        "OVERLOAD": {1: "Look at the equals sign in your 'if'.", 2: "You used a single '=', which changes the value.", 3: "Change the '=' inside your if(...) to '=='."},
        "CONFUSE": {1: "In C, a single '=' means 'make it equal to'.", 2: "To check *if* something is equal, C needs two equals signs.", 3: "Using '=' inside an 'if' is always true. Change it to '==' to compare."}
    },
    "single_quote_string": {
        "FOCUS": {1: "Check your printf quotes.", 2: "Strings need double quotes.", 3: "Change ' to \" inside printf."},
        "OVERLOAD": {1: "Look at the quotes around your text.", 2: "Single quotes are only for one letter.", 3: "Change the single quotes (' ') to double quotes (\" \")."},
        "CONFUSE": {1: "In C, single quotes are for single characters (like 'A').", 2: "Text (strings) must be wrapped in double quotes.", 3: "Replace the single quotes in your printf with double quotes."}
    },
    "missing_stdio": {
        "FOCUS": {1: "Where does printf come from?", 2: "You forgot the standard input/output library.", 3: "Add #include <stdio.h> at the top."},
        "OVERLOAD": {1: "The computer doesn't know what printf is yet.", 2: "You need to include the library that makes printf work.", 3: "Type #include <stdio.h> at the very top of your file."},
        "CONFUSE": {1: "printf is not a built-in C word; it lives in a library.", 2: "Before you can use it, you have to tell the compiler to load that library.", 3: "Put #include <stdio.h> on line 1 so the program knows how to print."}
    },
    "void_main": {
        "FOCUS": {1: "Check your main function return type.", 2: "main should return an integer.", 3: "Change 'void main' to 'int main'."},
        "OVERLOAD": {1: "The main function shouldn't be 'void'.", 2: "C programs expect main to return a number.", 3: "Change the word 'void' to 'int' before main."},
        "CONFUSE": {1: "In modern C, 'main' must return an integer to tell the OS if it succeeded.", 2: "Using 'void' means it returns nothing, which causes compiler errors.", 3: "Replace 'void main()' with 'int main()'."}
    }
}

# --- 3. THE RULE ENGINE (LAYER 1 ROUTER) ---
def analyze_c_code(code: str):
    if re.search(r'scanf\s*\(\s*"[^"]+"\s*,\s*([A-Za-z0-9_]+)\s*\)', code):
        return "missing_ampersand_scanf"
    if re.search(r'if\s*\([^=]*=[^=]*\)', code) and not re.search(r'==|!=|<=|>=', code):
        return "assignment_in_if"
    if re.search(r'printf\s*\(\s*\'[^\']+\'\s*\)', code):
        return "single_quote_string"
    if "printf" in code and "#include" not in code and "stdio.h" not in code:
        return "missing_stdio"
    if re.search(r'void\s+main\s*\(', code):
        return "void_main"
    return None 

# --- 4. THE SYNTAX GUARDRAIL (THE BOUNCER) ---
def is_valid_c_code(code: str) -> bool:
    if not code or len(code.strip()) < 5:
        return False
        
    # Removed lone punctuation like ';' and '{' which can be easily faked.
    # Now it looks for structural C keywords.
    c_keywords = ["#include", "main", "printf", "scanf", "return", "int ", "float ", "char ", "void ", "for(", "while(", "if("]
    
    return any(keyword in code for keyword in c_keywords)
# --- 5. THE AI GENERATOR (LAYER 2) ---
def get_ai_hint(code: str, state: str, attempt: int) -> str:
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
    output = llm(
        prompt,
        max_tokens=150, 
        stop=["### Instruction:"], 
        echo=False
    )
    return output['choices'][0]['text'].strip()

# --- 6. THE WEBSOCKET ROUTER ---
@app.websocket("/ws/hints")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 Client connected via WebSocket!")
    
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            
            code = data.get('code', '')
            state = data.get('state', 'FOCUS').upper()
            attempt = min(int(data.get('attempt', 1)), 3) 
            
            # STEP A: THE GUARDRAIL CHECK
            if not is_valid_c_code(code):
                print("🛡️  Guardrail Activated: Rejected non-C code.")
                response = {
                    "hint": "Please submit valid C programming code. I need to see things like 'main', '#include', 'return' to help you!",
                    "source": "Syntax_Guardrail"
                }
                await websocket.send_text(json.dumps(response))
                continue
            
            # STEP B: Check Layer 1 (Deterministic Rules)
            detected_error = analyze_c_code(code)
            
            if detected_error and detected_error in HINT_MATRIX:
                final_hint = HINT_MATRIX[detected_error][state][attempt]
                source = "Layer_1_Templates"
                print(f"⚡ Fast Route: Caught by Templates ({detected_error})")
            
            # STEP C: Fallback to Layer 2 (Your Custom AI)
            else:
                print("🧠 Deep Route: Asking Custom AI...")
                final_hint = get_ai_hint(code, state, attempt)
                source = "Layer_2_AI_Fallback"
            
            # Send the result back
            response = {"hint": final_hint, "source": source}
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        print("🔴 Client disconnected.")
    except Exception as e:
        print(f"⚠️ Error during WebSocket communication: {e}")