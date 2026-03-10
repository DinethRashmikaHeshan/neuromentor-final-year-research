const vscode = require('vscode');
const axios = require('axios');

const BACKEND_URL = 'https://Urindu-Cognitive-Load-Inference-Engine.hf.space/predict';
const HF_TOKEN = '';

// Behavior tracking variables
let keystrokes = 0;
let scrollEvents = 0;
let idleTime = 0;
let compileCount = 0;
let commentLines = 0;
let startTime = Date.now();
let lastActivityTime = Date.now();
let currentUser = null;
let authToken = null;
let userViewProvider = null;
let authPanel = null;

class AuthWebviewProvider {
    constructor(context) {
        this._context = context;
    }

    async show() {
        if (authPanel) {
            authPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        authPanel = vscode.window.createWebviewPanel(
            'varkAuth',
            'VARK Authentication',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        authPanel.webview.html = this.getHtml();
        authPanel.onDidDispose(() => {
            authPanel = null;
        });

        authPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'login') {
                await this.handleLogin(message.email, message.password);
            } else if (message.command === 'register') {
                await this.handleRegister(message.name, message.email, message.password, message.passwordConfirm);
            }
        });
    }

    async handleLogin(email, password) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/auth/login`,
                { email, password }
            );

            if (response.data?.token) {
                authToken = response.data.token;
                currentUser = response.data.user;

                // Store securely
                await this._context.secrets.store('vark-auth-token', authToken);
                await this._context.secrets.store('vark-user', JSON.stringify(currentUser));

                console.log('[Auth] Successfully logged in:', currentUser.email);
                authPanel?.dispose();

                // Update UI
                await updateUserVarkStyle();
                startBehaviorTracking(this._context);
                if (userViewProvider) {
                    userViewProvider.updateView();
                }

                vscode.window.showInformationMessage(`Welcome, ${currentUser.name}! VS Code will now track your learning behavior.`);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            authPanel?.webview.postMessage({ command: 'error', error: errorMsg });
        }
    }

    async handleRegister(name, email, password, passwordConfirm) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/auth/signup`,
                { name, email, password, passwordConfirm }
            );

            if (response.data?.token) {
                authToken = response.data.token;
                currentUser = response.data.user;

                // Store securely
                await this._context.secrets.store('vark-auth-token', authToken);
                await this._context.secrets.store('vark-user', JSON.stringify(currentUser));

                console.log('[Auth] Successfully registered:', currentUser.email);
                authPanel?.dispose();

                // Update UI
                await updateUserVarkStyle();
                startBehaviorTracking(this._context);
                if (userViewProvider) {
                    userViewProvider.updateView();
                }

                vscode.window.showInformationMessage(`Welcome, ${currentUser.name}! VS Code will now track your learning behavior.`);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            authPanel?.webview.postMessage({ command: 'error', error: errorMsg });
        }
    }

    getHtml() {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            width: 100%;
            max-width: 400px;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: linear-gradient(135deg, #003f87 0%, #0078d4 50%, #00a8e8 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            font-weight: bold;
        }
        h2 { text-align: center; font-size: 20px; margin-bottom: 10px; font-weight: 600; }
        p { text-align: center; font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 14px;
        }
        input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab-btn {
            flex: 1;
            padding: 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            text-transform: uppercase;
            transition: all 0.2s;
        }
        .tab-btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .error {
            background: #d93439;
            color: white;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 12px;
            display: none;
        }
        .error.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">◎</div>
        <h2>VARK Learning</h2>
        <p>Track your learning style through your coding behavior</p>
        
        <div class="error" id="errorMsg"></div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('login')">Login</button>
            <button class="tab-btn" onclick="switchTab('register')">Register</button>
        </div>

        <div id="login" class="tab-content active">
            <div class="form-group">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="loginPassword">Password</label>
                <input type="password" id="loginPassword" placeholder="Enter your password">
            </div>
            <button class="btn-primary" onclick="login()" style="width: 100%; padding: 10px;">Login</button>
        </div>

        <div id="register" class="tab-content">
            <div class="form-group">
                <label for="registerName">Name</label>
                <input type="text" id="registerName" placeholder="Enter your name">
            </div>
            <div class="form-group">
                <label for="registerEmail">Email</label>
                <input type="email" id="registerEmail" placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="registerPassword">Password</label>
                <input type="password" id="registerPassword" placeholder="Enter your password">
            </div>
            <div class="form-group">
                <label for="registerPasswordConfirm">Confirm Password</label>
                <input type="password" id="registerPasswordConfirm" placeholder="Confirm your password">
            </div>
            <button class="btn-primary" onclick="register()" style="width: 100%; padding: 10px;">Register</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function switchTab(tab) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            event.target.classList.add('active');
            document.getElementById('errorMsg').classList.remove('show');
        }

        function login() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            vscode.postMessage({
                command: 'login',
                email,
                password
            });
        }

        function register() {
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            if (!name || !email || !password || !passwordConfirm) {
                showError('Please fill in all fields');
                return;
            }

            if (password !== passwordConfirm) {
                showError('Passwords do not match');
                return;
            }

            vscode.postMessage({
                command: 'register',
                name,
                email,
                password,
                passwordConfirm
            });
        }

        function showError(message) {
            const errorEl = document.getElementById('errorMsg');
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'error') {
                showError(message.error);
            }
        });
    </script>
</body>
</html>`;
    }
}

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
        authToken = await secretStorage.get('vark-auth-token');
        currentUser = JSON.parse(await secretStorage.get('vark-user') || '{}');
        console.log('[Init] Loaded existing auth:', currentUser?.email);
        // authToken = null;
        // currentUser = null;
        // console.log('[Init] Starting fresh - no cached auth');
        if (authToken && currentUser?.id) {
            await updateUserVarkStyle();  // Fetch latest VARK style
        }
    } catch (error) {
        console.log('[Init] No existing auth found:', error.message);
    }

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

    // Show login/register if not authenticated
    if (!authToken) {
        console.log('[Init] No auth token found, opening web authenticator');
        await openWebAuthenticator(context);
    } else {
        console.log('[Init] Auth token found, starting behavior tracking');
        startBehaviorTracking(context);
        if (userViewProvider) {
            userViewProvider.updateView();
        }
        vscode.window.showInformationMessage(`Welcome back, ${currentUser.name}!`);
    }// THE ONLY ADDED LINE: Link your hinting module!
    require('./hinting.js').activateHinting(context);
}

async function openWebAuthenticator(context) {
    console.log('[Auth] Opening authentication webview');
    
    try {
        // Check if backend is running
        try {
            await axios.get(`${API_BASE_URL.replace('/api', '')}`, { timeout: 5000 });
        } catch (error) {
            console.error('[Auth] Backend not responding');
            vscode.window.showErrorMessage(
                `Cannot connect to backend: ${API_BASE_URL}`
            );
            return;
        }

        const authProvider = new AuthWebviewProvider(context);
        await authProvider.show();

    } catch (error) {
        console.error('[Auth] Error opening authentication:', error);
        vscode.window.showErrorMessage(`Failed to open authentication: ${error.message}`);
    }
}

function getLearningStyleDescription(style) {
    const descriptions = {
        'VISUAL': 'You learn best through visual aids like diagrams, charts, and color-coded information.',
        'AURAL': 'You learn best through listening and verbal instruction. You prefer discussions and audio content.',
        'READING/WRITING': 'You learn best through reading and writing. You prefer text-based learning materials.',
        'KINESTHETIC': 'You learn best through hands-on experience and practical application.',
        'MULTIMODAL': 'You have multiple strong learning preferences and adapt well to different learning styles.'
    };
    
    return descriptions[style?.toUpperCase()] || null;
}



async function updateUserVarkStyle() {
    try {
        const response = await axios.get(`${API_BASE_URL}/behavior/vark-style`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.data?.predicted_style) {
            currentUser.learningStyle = response.data.predicted_style;
            console.log('[VARK] Updated VARK style:', currentUser.learningStyle);
        }
    } catch (error) {
        console.log('[VARK] Could not fetch VARK style:', error.message);
    }
}

function startBehaviorTracking(context) {
    console.log('[Tracking] Starting behavior tracking...');
    
    const textChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
        for (const change of event.contentChanges) {
            keystrokes += change.text.length;
            const trimmed = change.text.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                commentLines++;
            }
            lastActivityTime = Date.now();
        }
    });

    const visibleRangeDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(() => {
        scrollEvents++;
        lastActivityTime = Date.now();
    });

    // Track debug sessions for compile count
    const debugSessionDisposable = vscode.debug.onDidStartDebugSession(() => {
        compileCount++;
        lastActivityTime = Date.now();
    });

    // Track idle time - check every 10 seconds if idle (no activity for last 30 seconds)
    const idleCheckInterval = setInterval(() => {
        const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000;
        if (timeSinceLastActivity > 30) {
            idleTime += 10; // Add 10 seconds to idle counter
        }
    }, 10000);
    const idleCheckDisposable = { dispose: () => clearInterval(idleCheckInterval) };

    // Send behavior every 5 minutes
    const timer = setInterval(() => sendBehaviorData(), 300000);
    const timerDisposable = { dispose: () => clearInterval(timer) };

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

async function logout(context) {
    try {
        console.log('[Auth] Starting logout process');

        // Clear secure storage FIRST before clearing in-memory variables
        try {
            await context.secrets.delete('vark-auth-token');
            await context.secrets.delete('vark-user');
            console.log('[Auth] Cleared secure storage');

            // Double-check the secret is actually gone
            const checkToken = await context.secrets.get('vark-auth-token');
            if (checkToken && checkToken.trim() !== '') {
                // Fallback: overwrite with empty values if delete didn't work
                await context.secrets.store('vark-auth-token', '');
                await context.secrets.store('vark-user', '{}');
                console.warn('[Auth] Secret persisted after delete — overwrote with empty string');
            }
        } catch (error) {
            console.error('[Auth] Error clearing secure storage:', error.message);
        }

        // Now clear in-memory state AFTER storage is confirmed cleared
        authToken = null;
        currentUser = null;
        console.log('[Auth] Cleared in-memory auth variables');

        // Force view update to show login prompt
        if (userViewProvider) {
            console.log('[Auth] Updating view after logout');
            userViewProvider.updateView();
        } else {
            console.log('[Auth] userViewProvider not available');
        }

        // Small delay to ensure view updates before showing message
        await new Promise(resolve => setTimeout(resolve, 300));

        vscode.window.showInformationMessage('Logged out successfully. Click Login/Register in the sidebar to sign in again.');
        console.log('[Auth] Logout completed successfully');

    } catch (error) {
        console.error('[Auth] Logout error:', error);
        vscode.window.showErrorMessage(`Logout error: ${error.message}`);
    }
}

async function deactivate() {
    if (authToken && currentUser) {
        try {
            await sendBehaviorData();
        } catch (error) {
            console.log('[Tracking] Could not send final data on deactivation');
        }
    }
}

module.exports = { activate, deactivate };
