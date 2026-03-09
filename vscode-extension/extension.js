const vscode = require('vscode');

const BACKEND_URL = 'https://Urindu-Cognitive-Load-Inference-Engine.hf.space/predict';
const HF_TOKEN = '';

// Cognitive state colors (mirrored from App.jsx)
const stateColors = {
    confused: '#e74c3c',
    relaxed: '#27ae60',
    focused: '#2980b9',
    active_thinking: '#f39c12',
    neutral: '#7f8c8d',
};

// Tracking state
let currentPrediction = 'Waiting for data...';
let currentProbabilities = null;
let userViewProvider = null;
let statusBarItem = null;

class CognitiveStateViewProvider {
    constructor(context) {
        this._context = context;
        this._webviewView = null;
    }

    resolveWebviewView(webviewView) {
        this._webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        webviewView.webview.html = this.getHtml();
    }

    updateView() {
        if (this._webviewView) {
            this._webviewView.webview.html = this.getHtml();
        }
    }

    getHtml() {
        const prediction = currentPrediction;
        const probabilities = currentProbabilities;
        const color = stateColors[prediction] || '#555';

        const probaRows = probabilities
            ? Object.entries(probabilities)
                .map(([state, val]) => {
                    const pct = (val * 100).toFixed(1);
                    const barColor = stateColors[state] || '#999';
                    return `
                        <div class="proba-row">
                            <span class="state-label">${state}</span>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width:${pct}%; background:${barColor};"></div>
                            </div>
                            <span class="pct-label">${pct}%</span>
                        </div>`;
                })
                .join('')
            : `<p class="hint">Start coding to get predictions.</p>`;

        return `<!DOCTYPE html>
<html>
<head>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .header { text-align: center; }
    .logo {
        width: 64px;
        height: 64px;
        margin: 0 auto 10px;
        background: linear-gradient(135deg, #003f87, #0078d4, #00a8e8);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        color: white;
        font-weight: bold;
    }
    .header h2 { font-size: 16px; font-weight: 700; }
    .header p { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 3px; }

    .state-card {
        background: var(--vscode-list-activeSelectionBackground);
        border-radius: 8px;
        padding: 14px;
        text-align: center;
    }
    .state-label-sm {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
    }
    .state-value {
        font-size: 22px;
        font-weight: 700;
        text-transform: capitalize;
        padding: 6px 14px;
        border-radius: 20px;
        display: inline-block;
        background: rgba(0,0,0,0.08);
        transition: color 0.3s;
        color: ${color};
        box-shadow: 0 0 10px ${color}44;
    }
    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${color};
        margin-right: 6px;
        box-shadow: 0 0 6px ${color};
    }

    .probabilities h3 {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 10px;
    }
    .proba-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 7px;
    }
    .state-label {
        font-size: 11px;
        width: 110px;
        flex-shrink: 0;
        text-transform: capitalize;
        color: var(--vscode-editor-foreground);
    }
    .bar-bg {
        flex: 1;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        height: 7px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
    }
    .pct-label {
        font-size: 11px;
        width: 38px;
        text-align: right;
        color: var(--vscode-descriptionForeground);
    }
    .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        text-align: center;
    }
</style>
</head>
<body>
    <div class="header">
        <div class="logo">🧠</div>
        <h2>NeuroMentor</h2>
        <p>Real-time Cognitive State Detection</p>
    </div>

    <div class="state-card">
        <div class="state-label-sm">Current Cognitive State</div>
        <div class="state-value">
            <span class="status-dot"></span>${prediction}
        </div>
    </div>

    <div class="probabilities">
        <h3>Confidence Scores</h3>
        ${probaRows}
    </div>
</body>
</html>`;
    }
}

async function sendEventToBackend(event) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`,
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            console.warn('[Cognitive] Backend responded with', response.status);
            return;
        }

        const data = await response.json();

        if (data.prediction) {
            currentPrediction = data.prediction;
            currentProbabilities = data.probabilities || null;

            if (userViewProvider) {
                userViewProvider.updateView();
            }

            updateStatusBar(data.prediction);
        }
    } catch (err) {
        console.error('[Cognitive] Error sending event:', err.message);
    }
}

function updateStatusBar(prediction) {
    if (!statusBarItem) return;
    const icon = {
        confused: '$(warning)',
        relaxed: '$(check)',
        focused: '$(eye)',
        active_thinking: '$(lightbulb)',
        neutral: '$(circle-outline)',
    }[prediction] || '$(circle-outline)';

    statusBarItem.text = `${icon} ${prediction}`;
    statusBarItem.tooltip = `Cognitive State: ${prediction}`;
    statusBarItem.color = stateColors[prediction] || undefined;
}

async function activate(context) {
    console.log('🧠 NeuroMentor Cognitive Tracker Activated');

    // Register sidebar webview
    userViewProvider = new CognitiveStateViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('varkUserView', userViewProvider)
    );

    // Status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(circle-outline) Cognitive: Waiting...';
    statusBarItem.tooltip = 'NeuroMentor Cognitive State';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Track text changes (code_edit / backspace_pressed)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            for (const change of event.contentChanges) {
                const eventType = change.text === '' ? 'backspace_pressed' : 'code_edit';
                sendEventToBackend({
                    event_timestamp: Date.now() / 1000,
                    event_type: eventType,
                    event_details: {
                        length: change.text.length,
                        range: change.range,
                        text: change.text,
                    },
                });
            }
        })
    );

    // Track cursor movement
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            const pos = event.selections[0]?.active;
            if (!pos) return;
            sendEventToBackend({
                event_timestamp: Date.now() / 1000,
                event_type: 'cursor_move',
                event_details: {
                    position: { lineNumber: pos.line + 1, column: pos.character + 1 },
                },
            });
        })
    );

    // Track editor focus
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor) return;
            sendEventToBackend({
                event_timestamp: Date.now() / 1000,
                event_type: 'editor_focus',
                event_details: {},
            });
        })
    );

    // Link hinting module if present
    try {
        require('./hinting.js').activateHinting(context);
    } catch (e) {
        console.log('[Init] hinting.js not found, skipping.');
    }
}

function deactivate() {
    console.log('🧠 NeuroMentor deactivated');
}

module.exports = { activate, deactivate };
