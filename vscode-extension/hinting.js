const vscode = require('vscode');
const WebSocket = require('ws');

// --- MEMORY VARIABLES ---
let currentAttempt = 1;
let lastCode = "";
let previousState = "FOCUS";
let panel = null; // Keep track of the panel so we don't open 100 windows

async function activateHinting(context) {
    console.log('🧠 NeuroMentor Autonomous Tracking Activated');

    // 1. LISTEN TO THE COGNITIVE STATE REAL-TIME STREAM
    const stateWs = new WebSocket('ws://127.0.0.1:8001/ws/current_state');

    stateWs.on('message', async (data) => {
        const parsed = JSON.parse(data.toString());
        const currentState = parsed.state.toUpperCase();

        // 2. THE TRIGGER LOGIC: Only fire if they drop out of FOCUS
        if ((currentState === 'OVERLOAD' || currentState === 'CONFUSE') && previousState === 'FOCUS') {
            console.log(`⚠️ Cognitive shift detected: ${currentState}. Triggering intervention!`);
            await triggerHint(context);
        }
        
        previousState = currentState;
    });

    stateWs.on('error', () => {
        console.log("Could not connect to Cognitive State stream.");
    });
}

async function triggerHint(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'c') return; // Only interrupt if they are coding in C

    const studentCode = editor.document.getText();

    // --- ATTEMPT TRACKING ---
    if (studentCode === lastCode) {
        currentAttempt = Math.min(currentAttempt + 1, 3);
    } else {
        currentAttempt = 1;
        lastCode = studentCode;
    }

    // --- GRAB VARK STYLE ---
    let varkStyle = "R"; 
    try {
        const userJson = await context.secrets.get('vark-user');
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user.learningStyle) {
                const styleMap = { 'VISUAL': 'V', 'AURAL': 'A', 'READING/WRITING': 'R', 'KINESTHETIC': 'K', 'MULTIMODAL': 'V' };
                varkStyle = styleMap[user.learningStyle.toUpperCase()] || "R";
            }
        }
    } catch (e) {
        // Default to R
    }

    // --- OPEN/FOCUS THE UI PANEL ---
    if (!panel) {
        panel = vscode.window.createWebviewPanel('neuromentorHint', '🧠 NeuroMentor Intervention', vscode.ViewColumn.Beside, { enableScripts: true });
        panel.onDidDispose(() => { panel = null; }); // Reset if user closes it
    }
    panel.webview.html = getWebviewContent();

    // --- FETCH THE AI HINT ---
    const aiWs = new WebSocket('ws://127.0.0.1:8000/ws/hints');

    aiWs.on('open', () => {
        const payload = { code: studentCode, attempt: currentAttempt, vark: varkStyle };
        aiWs.send(JSON.stringify(payload));
    });

    aiWs.on('message', (data) => {
        const response = JSON.parse(data.toString());
        if (panel) panel.webview.postMessage(response);
        aiWs.close();
    });
}

// ... Keep your exact getWebviewContent() function here at the bottom ...
function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ startOnLoad: false, theme: 'dark' });
            window.mermaid = mermaid;
        </script>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); }
            .card { background: var(--vscode-editorWidget-background); padding: 20px; border-radius: 8px; border: 1px solid var(--vscode-widget-border); }
            .vark-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; margin-bottom: 15px; color: white;}
            .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
            .attempt-badge { font-size: 12px; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 4px; font-weight: bold; }
            #media-container { margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px; }
            button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 10px; border: none; cursor: pointer; border-radius: 4px;}
            button:hover { background: var(--vscode-button-hoverBackground); }
            details { margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px; cursor: pointer; border: 1px solid var(--vscode-widget-border); }
            summary { font-size: 12px; font-weight: bold; color: var(--vscode-descriptionForeground); outline: none; }
            #base-hint-text { font-size: 12px; margin-top: 10px; color: var(--vscode-editor-foreground); font-family: monospace; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header-row">
                <div id="badge" class="vark-badge" style="background: gray;">Analyzing State & Style...</div>
                <div id="attempt-badge" class="attempt-badge">Attempt: -/3</div>
            </div>
            <h2 id="hint-text">Waiting for AI...</h2>
            <div id="media-container"></div>
            
            <details>
                <summary>View Raw Llama/Matrix Hint</summary>
                <div id="base-hint-text">Waiting for data...</div>
            </details>
        </div>

        <script>
            window.addEventListener('message', async event => {
                const message = event.data; 
                if (message.error) {
                    document.getElementById('hint-text').innerText = message.error;
                    return;
                }
                
                // Update new UI elements
                document.getElementById('attempt-badge').innerText = 'Attempt: ' + message.attempt + '/3';
                document.getElementById('base-hint-text').innerText = message.base_hint;

                const aiData = message.ai_payload;
                document.getElementById('hint-text').innerText = aiData.hint_text;
                const mediaBox = document.getElementById('media-container');

                if (aiData.vark_mode === 'V') {
                    document.getElementById('badge').innerText = '👀 Visual Hint';
                    document.getElementById('badge').style.background = '#e67e22'; 
                    let cleanMermaid = aiData.media_content.replace(/\\x60{3}mermaid/gi, '').replace(/\\x60{3}/g, '').trim();
                    mediaBox.innerHTML = '<pre class="mermaid" id="vark-diagram">' + cleanMermaid + '</pre>';
                    try { await window.mermaid.run(); } catch (e) { console.error(e); }
                } 
                else if (aiData.vark_mode === 'A') {
                    document.getElementById('badge').innerText = '🎧 Audio Walkthrough';
                    document.getElementById('badge').style.background = '#9b59b6'; 
                    mediaBox.innerHTML = '<p>🗣️ <i>Playing audio...</i></p><p>' + aiData.media_content + '</p>';
                    let utterance = new SpeechSynthesisUtterance(aiData.media_content);
                    window.speechSynthesis.speak(utterance);
                }
                else if (aiData.vark_mode === 'K') {
                    document.getElementById('badge').innerText = '✋ Kinesthetic Action';
                    document.getElementById('badge').style.background = '#27ae60'; 
                    mediaBox.innerHTML = '<p><b>Your Turn:</b> ' + aiData.media_content + '</p><button onclick="this.innerText=\\'Interaction Registered!\\'; this.style.background=\\'#27ae60\\'">Simulate Typing Fix</button>';
                }
                else {
                    document.getElementById('badge').innerText = '📖 Reading Hint';
                    document.getElementById('badge').style.background = '#2980b9'; 
                    mediaBox.innerHTML = '<p>' + aiData.media_content + '</p>';
                }
            });
        </script>
    </body>
    </html>`;
}

module.exports = { activateHinting };