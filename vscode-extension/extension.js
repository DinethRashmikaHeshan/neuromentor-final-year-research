const vscode = require('vscode');
const axios = require('axios');

const API_BASE_URL = 'https://neuromentor-backend--8u5ar44.thankfulcoast-1d37f0d2.eastasia.azurecontainerapps.io/api';
const AUTH_URL = 'https://neuromentor-backend--8u5ar44.thankfulcoast-1d37f0d2.eastasia.azurecontainerapps.io/api/auth';

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

class VarkUserViewProvider {
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

        // Set up message listener
        this.setupMessageListener(webviewView);
    }

    setupMessageListener(webviewView) {
        webviewView.webview.onDidReceiveMessage((message) => {
            console.log('[View] Message received:', message.command);
            
            if (message.command === 'logout') {
                console.log('[View] Logout requested from sidebar');
                logout(this._context);
            } else if (message.command === 'sendBehavior') {
                console.log('[View] Send behavior requested from sidebar');
                sendBehaviorData().then(() => {
                    this.updateView();
                });
            } else if (message.command === 'openAuth') {
                console.log('[View] Open authentication requested from sidebar');
                openWebAuthenticator(this._context);
            } else {
                console.log('[View] Unknown command:', message.command);
            }
        });
    }

    updateView() {
        if (this._webviewView) {
            console.log('[View] Updating webview content');
            this._webviewView.webview.html = this.getHtml();
            // Re-establish message listener after HTML update
            this.setupMessageListener(this._webviewView);
        }
    }

    getHtml() {
        if (!authToken || !currentUser) {
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
            text-align: center;
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
        h2 { font-size: 18px; margin-bottom: 10px; font-weight: 600; }
        p { font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 25px; }
        .button-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    </style>
</head>
<body>
    <div class="logo">◎</div>
    <h2>VARK Learning</h2>
    <p>Track your learning style through your coding behavior</p>
    <div class="button-group">
        <button onclick="login()">Login</button>
        <button class="secondary" onclick="register()">Register</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function login() {
            console.log('User clicked login');
            vscode.postMessage({ command: 'openAuth' });
        }

        function register() {
            console.log('User clicked register');
            vscode.postMessage({ command: 'openAuth' });
        }
    </script>
</body>
</html>`;
        }

        const learningStyle = currentUser?.learningStyle || 'Not Identified';
        const styleDescription = getLearningStyleDescription(learningStyle);

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 100vh;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            background: linear-gradient(135deg, #003f87 0%, #00a8e8 50%, #00d9ff 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            font-weight: bold;
        }
        .header h2 {
            font-size: 16px;
            margin-bottom: 5px;
        }
        .header p {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .content {
            flex: 1;
        }
        .learning-style-section {
            background: var(--vscode-list-activeSelectionBackground);
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            text-align: center;
        }
        .learning-style-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .learning-style {
            font-size: 28px;
            font-weight: 700;
            color: var(--vscode-terminal-ansiBlue);
            text-transform: uppercase;
        }
        .learning-style.not-identified {
            color: var(--vscode-descriptionForeground);
            font-size: 18px;
        }
        .style-description {
            font-size: 12px;
            color: var(--vscode-editor-foreground);
            line-height: 1.5;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid var(--vscode-list-activeSelectionBackground);
        }
        .footer {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        button {
            padding: 9px 15px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-danger {
            background: #d93439;
            color: white;
        }
        .btn-danger:hover {
            background: #c91f27;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">◎</div>
        <h2>${currentUser?.name || 'User'}</h2>
        <p>${currentUser?.email || 'user@example.com'}</p>
    </div>

    <div class="content">
        <div class="learning-style-section">
            <div class="learning-style-label">Your Learning Style</div>
            <div class="learning-style ${learningStyle === 'Not Identified' ? 'not-identified' : ''}">
                ${learningStyle}
            </div>
            ${styleDescription ? `<div class="style-description">${styleDescription}</div>` : ''}
        </div>
    </div>

    <div class="footer">
        <button class="btn-primary" onclick="sendBehavior()">Send Data Now</button>
        <button class="btn-danger" onclick="logout()">Logout</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                vscode.postMessage({ command: 'logout' });
            }
        }

        function sendBehavior() {
            vscode.postMessage({ command: 'sendBehavior' });
        }
    </script>
</body>
</html>`;
    }
}

async function activate(context) {
    console.log('👤 VARK Behavior Tracker Activated');
    
    // Try to load existing token from secure storage
    const secretStorage = context.secrets;
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

    // Create and register the user view provider
    userViewProvider = new VarkUserViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('varkUserView', userViewProvider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('varkBehavior.login', () => {
            console.log('[Command] Login triggered');
            openWebAuthenticator(context);
        }),
        vscode.commands.registerCommand('varkBehavior.register', () => {
            console.log('[Command] Register triggered');
            openWebAuthenticator(context);
        }),
        vscode.commands.registerCommand('varkBehavior.logout', () => {
            console.log('[Command] Logout triggered');
            logout(context);
        }),
        vscode.commands.registerCommand('varkBehavior.showPanel', () => {
            console.log('[Command] Show panel triggered');
        }),
        vscode.commands.registerCommand('varkBehavior.sendNow', sendBehaviorData)
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
        textChangeDisposable,
        visibleRangeDisposable,
        debugSessionDisposable,
        idleCheckDisposable,
        timerDisposable
    );
}

async function sendBehaviorData() {
    if (!authToken || !currentUser) {
        console.log('[Tracking] Not authenticated, skipping behavior send');
        return;
    }

    const sessionDuration = (Date.now() - startTime) / 1000;
    const timestamp = new Date().toISOString();

    const payload = {
        userId: currentUser.id,
        keystrokes,
        scrollEvents,
        idleTime,
        compileCount,
        commentLines,
        sessionDuration,
        timestamp
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/behavior`, payload, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('[Tracking] Behavior data sent successfully:', payload);

        // Update VARK style from response if available
        if (response.data?.predicted_style) {
            currentUser.learningStyle = response.data.predicted_style;
            console.log('[Tracking] VARK Style updated:', currentUser.learningStyle);
        }

        vscode.window.showInformationMessage(
            `Behavior logged! Current Learning Style: ${currentUser.learningStyle || 'Calculating...'}`
        );

        // Reset counters for next tracking period
        keystrokes = scrollEvents = idleTime = compileCount = commentLines = 0;
        startTime = Date.now();
        lastActivityTime = Date.now();
    } catch (error) {
        console.log('[Tracking] Failed to send behavior data:', error.message);
        vscode.window.showErrorMessage(`Failed to send behavior data: ${error.message}`);
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