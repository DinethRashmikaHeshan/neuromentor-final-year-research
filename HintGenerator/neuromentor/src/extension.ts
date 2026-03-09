import * as vscode from 'vscode';
import WebSocket = require('ws');

export function activate(context: vscode.ExtensionContext) {
    console.log('NeuroMentor is now active!');

    let disposable = vscode.commands.registerCommand('neuromentor.getHint', () => {
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("NeuroMentor: Please open a C file first!");
            return;
        }
        const studentCode = editor.document.getText();

        const panel = vscode.window.createWebviewPanel(
            'neuromentorHint',
            '🧠 NeuroMentor VARK',
            vscode.ViewColumn.Beside, 
            { enableScripts: true }   
        );

        panel.webview.html = getWebviewContent();

        const ws = new WebSocket('ws://127.0.0.1:8000/ws/hints');

        ws.on('open', () => {
            const payload = {
                code: studentCode,
                attempt: 2,
            };
            ws.send(JSON.stringify(payload));
        });

        ws.on('message', (data: WebSocket.Data) => {
            const response = JSON.parse(data.toString());
            panel.webview.postMessage(response);
            ws.close(); 
        });

        ws.on('error', (err: Error) => {
            vscode.window.showErrorMessage(`NeuroMentor Error: Could not connect to Python backend. Is it running?`);
        });
    });

    context.subscriptions.push(disposable);
}

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
            #media-container { margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px; }
            button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 10px; border: none; cursor: pointer; border-radius: 4px;}
            button:hover { background: var(--vscode-button-hoverBackground); }
        </style>
    </head>
    <body>
        <div class="card">
            <div id="badge" class="vark-badge" style="background: gray;">Analyzing State...</div>
            <h2 id="hint-text">Waiting for custom AI hint...</h2>
            <div id="media-container"></div>
        </div>

        <script>
            window.addEventListener('message', async event => {
                const message = event.data; 
                
                if (message.error) {
                    document.getElementById('hint-text').innerText = message.error;
                    return;
                }

                const aiData = message.ai_payload;
                document.getElementById('hint-text').innerText = aiData.hint_text;
                
                const mediaBox = document.getElementById('media-container');

                if (aiData.vark_mode === 'V') {
                    document.getElementById('badge').innerText = '👀 Visual Representation';
                    document.getElementById('badge').style.background = '#e67e22'; 
                    mediaBox.innerHTML = '<pre class="mermaid">' + aiData.media_content + '</pre>';
                    await window.mermaid.run(); 
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
                    mediaBox.innerHTML = '<p><b>Your Turn:</b> ' + aiData.media_content + '</p><button onclick="this.innerText=\\'Interaction Registered!\\'">Simulate Typing Fix</button>';
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

export function deactivate() {}