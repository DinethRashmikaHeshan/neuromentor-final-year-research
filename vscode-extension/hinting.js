const vscode = require('vscode');
const WebSocket = require('ws');

let currentAttempt = 1;
let lastCode = "";
let panel = null; 
let idleTimer = null; 
let manualStyleOverride = null; 
let activeSocket = null; 

let extensionContext = null;

// --- 1. WATCH FOR TYPING ---
vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        if (panel) panel.webview.postMessage({ command: 'stop_timer' });
    }
});

async function triggerHint(context, predictedState) {

    const ctx = context || extensionContext;  // ← ADD THIS LINE
    if (!ctx) {                                 // ← ADD THIS LINE
        console.error("[Hinting] No context!");  // ← ADD THIS LINE
        return;                                  // ← ADD THIS LINE
    }                                           // ← ADD THIS LINE

    if (panel) return; 

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'c') return; 

    lastCode = editor.document.getText();
    currentAttempt = 1;
    manualStyleOverride = null; 

    panel = vscode.window.createWebviewPanel(
        'neuromentorHint', 
        '🧠 NeuroMentor Intervention', 
        vscode.ViewColumn.Beside, 
        { enableScripts: true, retainContextWhenHidden: true }
    );
    
    panel.onDidDispose(() => { 
        panel = null; 
        currentAttempt = 1;
        manualStyleOverride = null;
        if (idleTimer) clearTimeout(idleTimer); 
        if (activeSocket) activeSocket.close();
    }); 

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'clear') {
            panel.dispose(); 
        } else if (message.command === 'override_style') {
            // THE FIX: Explicitly capture the dropdown value, even if it's empty ("")
            manualStyleOverride = message.style;
            currentAttempt = 1; 
            if (idleTimer) clearTimeout(idleTimer);
            panel.webview.postMessage({ command: 'loading', attempt: currentAttempt });
            await fetchHintAndStartTimer(context, lastCode);
        }
    });

    panel.webview.postMessage({ command: 'loading', attempt: currentAttempt });
    await fetchHintAndStartTimer(context, lastCode, predictedState);
}

// --- 2. FETCH HINT AND START THE CLOCK ---
async function fetchHintAndStartTimer(context, studentCode, predictedState) {
    let varkStyle = ""; 
    let authToken = ""; 
    let cognitiveState = "";
    
    // Debug: Check if context has secrets API
    if (!context || !context.secrets) {
        console.error('❌ CRITICAL: context or context.secrets is undefined!');
        console.log('context:', context);
    }
    
    // THE FIX: If they touched the dropdown, ALWAYS use it (even if it's "Auto Mode" / blank)
    if (manualStyleOverride !== null) {
        varkStyle = manualStyleOverride;
    } else {
        try {
            // Debug: Log before and after retrieval
            console.log('[DEBUG] Attempting to retrieve secrets...');
            
            const tokenResult = await context.secrets.get('vark-auth-token');
            authToken = tokenResult || "";
            console.log('[DEBUG] Retrieved token:', authToken ? authToken.substring(0, 20) + '...' : '(NULL/UNDEFINED)');
            
            const userJsonResult = await context.secrets.get('vark-user');
            console.log('[DEBUG] Retrieved user JSON:', userJsonResult ? 'EXISTS' : '(NULL/UNDEFINED)');
            
            if (userJsonResult) {
                try {
                    const user = JSON.parse(userJsonResult);
                    console.log('[DEBUG] Parsed user:', user);
                    
                    const styleMap = { 'VISUAL': 'V', 'AURAL': 'A', 'READ/WRITE': 'R', 'KINESTHETIC': 'K', 'MULTIMODAL': 'V' };
                    varkStyle = styleMap[user.learningStyle?.toUpperCase()] || "";
                    cognitiveState = predictedState || "";
                    
                    console.log('[DEBUG] Extracted varkStyle:', varkStyle, '| cognitiveState:', cognitiveState);
                } catch (parseErr) {
                    console.error('[DEBUG] Failed to parse user JSON:', parseErr);
                }
            } else {
                console.warn('[DEBUG] vark-user secret is empty - USER NOT LOGGED IN?');
            }
        } catch (e) { 
            console.error("[DEBUG] Secret storage error:", e);
            console.error("[DEBUG] Error stack:", e.stack);
        }
    }

    if (activeSocket) activeSocket.close();
    // activeSocket = new WebSocket('ws://127.0.0.1:8000/ws/hints');
    activeSocket = new WebSocket('wss://llama-app.lemonflower-bec54065.centralindia.azurecontainerapps.io/ws/hints');
    // activeSocket = new WebSocket("wss://llama-app.lemonflower-bec54065.centralindia.azurecontainerapps.io/ws/hints");

    activeSocket.on('open', () => {
        const payload = {
            code: studentCode, 
            attempt: currentAttempt, 
            vark: varkStyle,
            token: authToken,
            cognitiveState: cognitiveState
        };
        
        console.log('🚀 WebSocket Payload being sent to main.py:');
        console.log('  studentCode:', studentCode.substring(0, 100) + (studentCode.length > 100 ? '...' : ''));
        console.log('  attempt:', currentAttempt);
        console.log('  vark:', varkStyle);
        console.log('  token:', authToken ? authToken.substring(0, 20) + '...' : '(empty)');
        console.log('  cognitiveState:', cognitiveState);
        console.log('  Full payload:', payload);
        
        activeSocket.send(JSON.stringify(payload));
    });
    
    activeSocket.on('message', (data) => {
        const payload = JSON.parse(data.toString());
        if (panel) {
            panel.webview.postMessage({ ...payload, attempt: currentAttempt });
        }
        activeSocket.close();

        if (idleTimer) clearTimeout(idleTimer); 
        
        if (currentAttempt < 3 && panel) {
            panel.webview.postMessage({ command: 'start_timer', seconds: 10 });
            idleTimer = setTimeout(() => {
                currentAttempt++; 
                if (panel) panel.webview.postMessage({ command: 'loading', attempt: currentAttempt });
                fetchHintAndStartTimer(context, studentCode); 
            }, 10000); 
        }
    });

    activeSocket.on('error', () => {
        if (panel) panel.webview.postMessage({ error: 'Failed to connect to AI server.' });
    });
}

function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
            window.mermaid = mermaid;
        </script>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); }
            .card { background: var(--vscode-editorWidget-background); padding: 20px; border-radius: 8px; border: 1px solid var(--vscode-widget-border); }
            .vark-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; margin-bottom: 15px; color: white;}
            .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
            .header-controls { display: flex; gap: 10px; align-items: center; }
            .attempt-badge { font-size: 12px; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
            .demo-select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 4px; border-radius: 4px; cursor: pointer; outline: none; }
            #media-container { margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px; }
            button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 10px; border: none; cursor: pointer; border-radius: 4px; width: 100%;}
            button:hover { background: var(--vscode-button-hoverBackground); }
            .clear-btn { background: #d93439; margin-top: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;}
            .clear-btn:hover { background: #c91f27; }
            #timer-box { display: none; margin: 15px 0; padding: 10px; border-radius: 4px; background: rgba(243, 156, 18, 0.2); color: #e67e22; text-align: center; border: 1px solid rgba(243, 156, 18, 0.4); font-weight: bold;}
            #loading-container { text-align: center; display: none; padding: 40px 0; }
            .spinner { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--vscode-button-background); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            
            details { margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px; cursor: pointer; border: 1px solid var(--vscode-widget-border); }
            summary { font-size: 12px; font-weight: bold; color: var(--vscode-descriptionForeground); outline: none; }
            #base-hint-text { font-size: 12px; margin-top: 10px; color: var(--vscode-editor-foreground); font-family: monospace; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header-row">
                <div id="badge" class="vark-badge" style="background: gray;">Analyzing...</div>
                <div class="header-controls">
        
                    <div id="attempt-badge" class="attempt-badge">Attempt: 1/3</div>
                </div>
            </div>
            
            <div id="loading-container">
                <div class="spinner"></div>
                <div id="loading-message" style="font-weight: bold; color: var(--vscode-descriptionForeground);">Generating Hint...</div>
            </div>

            <div id="hint-content-wrapper">
                <h2 id="hint-text">Loading...</h2>
                <div id="timer-box">⏳ Next hint in <span id="countdown-number">10</span>s</div>
                <div id="media-container"></div>
            </div>
            
            <button class="clear-btn" id="close-btn">Close & Resume Coding</button>

            <details>
                <summary>View Raw AI Hint</summary>
                <div id="base-hint-text">Waiting for data...</div>
            </details>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let uiTimer = null;

            document.getElementById('close-btn').addEventListener('click', () => {
                vscode.postMessage({command: 'clear'});
            });

            // This ensures the dropdown instantly sends the signal
            window.forceStyle = function(styleCode) {
                vscode.postMessage({ command: 'override_style', style: styleCode });
            };

            window.addEventListener('message', async event => {
                const message = event.data;

                if (message.command === 'loading') {
                    document.getElementById('loading-container').style.display = 'block';
                    document.getElementById('hint-content-wrapper').style.display = 'none';
                    return;
                }

                if (message.command === 'start_timer') {
                    const timerBox = document.getElementById('timer-box');
                    let timeLeft = message.seconds;
                    timerBox.style.display = 'block';
                    if (uiTimer) clearInterval(uiTimer);
                    uiTimer = setInterval(() => {
                        document.getElementById('countdown-number').innerText = --timeLeft;
                        if (timeLeft <= 0) {
                            clearInterval(uiTimer);
                            timerBox.style.display = 'none';
                        }
                    }, 1000);
                    return;
                }

                if (message.command === 'stop_timer') {
                    if (uiTimer) clearInterval(uiTimer);
                    document.getElementById('timer-box').style.display = 'none';
                    return;
                }

                // Render Content Safely
                document.getElementById('loading-container').style.display = 'none';
                document.getElementById('hint-content-wrapper').style.display = 'block';
                document.getElementById('attempt-badge').innerText = 'Attempt: ' + message.attempt + '/3';

                const aiData = message.ai_payload || {};
                
                // Set the main hint text or fallback to the local AI hint
                document.getElementById('hint-text').innerText = aiData.hint_text || message.base_hint || "Analyze your code for errors.";
                document.getElementById('base-hint-text').innerText = message.base_hint || "No base hint provided.";
                
                const mediaBox = document.getElementById('media-container');

                // --- VISUAL MODE ---
                if (aiData.vark_mode === 'V') {
                    document.getElementById('badge').innerText = '👀 Visual Flow';
                    document.getElementById('badge').style.background = '#e67e22';
                    
                    // Safely clean string using x60 to avoid breaking JS template literals
                    let code = (aiData.media_content || "").replace(/\\x60{3}mermaid/gi, '').replace(/\\x60{3}/g, '').trim();
                    if (!code.includes('graph') && !code.includes('flowchart')) code = 'flowchart TD\\n' + code;
                    
                    try {
                        // BULLETPROOF RENDER: Use SVG generation directly
                        const uniqueId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
                        const { svg } = await window.mermaid.render(uniqueId, code);
                        mediaBox.innerHTML = '<div style="background:#ffffff; padding:15px; border-radius:6px; display:flex; justify-content:center;">' + svg + '</div>';
                    } catch (e) { 
                        // Perfect demo fallback
                        const backupCode = 'flowchart TD\\nA[Bug Detected] --> B[Analyze Syntax]\\nB --> C[Apply Code Fix]\\nC --> D[System Stable]';
                        const backupId = 'mermaid-backup-' + Math.random().toString(36).substr(2, 9);
                        try {
                            const fallback = await window.mermaid.render(backupId, backupCode);
                            mediaBox.innerHTML = '<div style="background:#ffffff; padding:15px; border-radius:6px; display:flex; justify-content:center;">' + fallback.svg + '</div>';
                        } catch(err) {
                            mediaBox.innerHTML = '<p style="color:#e74c3c;">Failed to render graph.</p>';
                        }
                    }
                } 
                // --- AUDIO MODE ---
                else if (aiData.vark_mode === 'A') {
                    document.getElementById('badge').innerText = '🎧 Audio Walkthrough';
                    document.getElementById('badge').style.background = '#9b59b6';
                    mediaBox.innerHTML = '<p style="font-size:15px; line-height:1.5;">🗣️ <i>Playing audio...</i><br><br>' + aiData.media_content + '</p>';
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance(aiData.media_content));
                }
                // --- KINESTHETIC MODE ---
                else if (aiData.vark_mode === 'K') {
                    document.getElementById('badge').innerText = '✋ Kinesthetic Action';
                    document.getElementById('badge').style.background = '#27ae60';
                    
                    let rawContent = (aiData.media_content || "").replace(/\\\\n/g, '\\n');
                    let steps = rawContent.split('\\n').map(s => s.trim()).filter(s => s.length > 3);
                    if (steps.length <= 1) {
                        steps = rawContent.split('. ').map(s => s.trim() + (s.endsWith('.') ? '' : '.')).filter(s => s.length > 3);
                    }
                    if (steps.length === 0) steps = [aiData.media_content || "Review your code logic."]; 

                    window.kSteps = steps;
                    window.currentKStep = 0;
                    
                    window.renderKStep = function() {
                        let isLast = window.currentKStep === window.kSteps.length - 1;
                        let btn = isLast ? '<button onclick="this.innerText=\\'✅ Code Change Registered!\\'; this.style.background=\\'#27ae60\\'; this.style.color=\\'white\\';" style="background: transparent; color: #27ae60; border: 2px solid #27ae60; padding: 10px 20px; font-weight: bold; font-size: 14px; cursor: pointer; border-radius: 4px; transition: 0.3s; margin-top: 15px;">Complete Fix</button>' 
                                         : '<button onclick="window.currentKStep++; window.renderKStep();" style="background: #27ae60; color: white; border: none; padding: 10px 20px; font-weight: bold; font-size: 14px; cursor: pointer; border-radius: 4px; transition: 0.3s; margin-top: 15px;">Next Step ➔</button>';
                        
                        mediaBox.innerHTML = \`
                            <div style="background: rgba(39, 174, 96, 0.15); border: 2px dashed #27ae60; padding: 25px 20px; border-radius: 8px; text-align: center;">
                                <div style="color: #27ae60; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px;">STEP \${window.currentKStep + 1} of \${window.kSteps.length}</div>
                                <p style="font-size: 16px; margin-bottom: 5px; line-height: 1.5;">\${window.kSteps[window.currentKStep]}</p>
                                \${btn}
                            </div>\`;
                    };
                    window.renderKStep();
                } 
                // --- READING MODE ---
                else {
                    document.getElementById('badge').innerText = '📖 Reading Hint';
                    document.getElementById('badge').style.background = '#2980b9';
                    mediaBox.innerHTML = '<p style="font-size: 15px; line-height: 1.6;">' + (aiData.media_content || message.base_hint) + '</p>';
                }
            });
        </script>
    </body>
    </html>`;
}




async function activateHinting(context) {
    extensionContext = context;
    console.log("[Hinting] ✅ Module activated");
}

module.exports = { triggerHint , activateHinting};