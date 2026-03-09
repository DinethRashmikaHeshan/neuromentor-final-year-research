import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# --- LOAD SECURE API KEY ---
load_dotenv() # This reads the .env file
API_KEY = os.getenv("key") # This grabs the variable named "key"

if not API_KEY:
    print("❌ Error: Could not find 'key' in your .env file!")
    exit()

# --- SETUP ---
client = genai.Client(api_key=API_KEY)

# --- MOCK DATA ---
test_code = """
int main() {
    int age;
    printf("Enter age: ");
    scanf("%d", age); // Bug here
    return 0;
}
"""
base_hint = "Your scanf is missing an address operator. Add an '&' before the variable name."

# --- THE TRANSLATOR FUNCTION ---
def test_gemini_vark(vark_style):
    print(f"\n{'='*40}")
    print(f"🔄 Testing VARK Style: {vark_style}")
    print(f"{'='*40}")
    
    prompt = f"""
    You are a strict API formatting engine. Your ONLY job is to translate the provided C programming hint into the requested VARK learning style.
    
    Code Context: {test_code}
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
                temperature=0.1, # Strict mode
            )
        )
        
        # Clean the output just like in our main server
        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        payload = json.loads(clean_text.strip())
        
        # Print the results beautifully
        print(f"🎯 Hint Text: {payload.get('hint_text')}")
        print(f"📦 Media Content:\n{payload.get('media_content')}")
        
    except Exception as e:
        print(f"❌ Error during generation: {e}")

# --- RUN ALL 4 TESTS ---
if __name__ == "__main__":
    styles = ["V", "A", "R", "K"]
    for style in styles:
        test_gemini_vark(style)
        
    print("\n✅ All 4 tests complete!")