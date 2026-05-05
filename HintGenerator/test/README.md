# Test Client - HintGenerator WebSocket Tests

## Overview
`testClient.py` is a WebSocket test client that validates the hint generation backend server running at `ws://localhost:8000/ws/hints`. It sends C code snippets and receives adaptive hints based on cognitive state.

## Tests Included

### Test 1: Missing Ampersand Error (Fast Path)
**Purpose:** Tests the regex-matched error detection and predefined hint matrix.

**Test Details:**
- **Input Code:** Missing `&` operator in scanf
  ```c
  int main() { int age; scanf("%d", age); return 0; }
  ```
- **Parameters:**
  - Attempt: 2 (second attempt)
  - Cognitive State: OVERLOAD
  - Bearer Token: "my_test_token"

**Expected Output:** 
- Status: success
- Returns a predefined hint from the HINT_MATRIX tailored for OVERLOAD state at attempt 2
- Hint formatted in VARK learning style

---

### Test 2: Unknown Syntax Error (Slow Path)
**Purpose:** Tests the local Llama LLM fallback for unrecognized C code errors.

**Test Details:**
- **Input Code:** Missing semicolon (syntax error)
  ```c
  int main() { printf("Hello World") return 0; }
  ```
- **Parameters:**
  - Attempt: 1 (first attempt)
  - Cognitive State: FOCUS
  - No custom token (uses default BEARER_TOKEN)

**Expected Output:**
- Status: success
- Returns a dynamically generated hint from local Llama LLM model
- Hint adapted to FOCUS cognitive state at attempt 1
- Hint formatted in VARK learning style

---

## How to Run

```bash
# Ensure the server is running
cd ../server
python main.py

# In another terminal, run the test client
cd ../test
python testClient.py
```

## Requirements
- FastAPI server running on `http://localhost:8000`
- WebSocket endpoint at `/ws/hints`
- Dependencies: `asyncio`, `websockets`, `json` (included in standard Python library)

## Output Format
The client prints formatted JSON responses showing:
- `status`: "success" or error
- `ai_payload`: VARK-formatted hint (Visual/Aural/Reading/Kinesthetic)
- `base_hint`: Raw hint text
- `attempt`: Attempt number
