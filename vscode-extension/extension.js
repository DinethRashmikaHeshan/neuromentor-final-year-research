const vscode = require('vscode');
const axios = require('axios');
const http = require('http');

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
let authCallbackServer = null;
let userViewProvider = null;

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
    console.log('[Auth] Opening web authenticator');
    
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

        // Start callback server to listen for auth messages
        await startAuthCallbackServer(context);

        // Open browser to authentication URL
        console.log('[Auth] Opening browser to', AUTH_URL);
        const uri = vscode.Uri.parse(AUTH_URL);
        await vscode.env.openExternal(uri);

        vscode.window.showInformationMessage(
            'Authentication page opened in your browser. Please login or register.',
            'Opening...'
        );

    } catch (error) {
        console.error('[Auth] Error opening web authenticator:', error);
        vscode.window.showErrorMessage(`Failed to open authentication: ${error.message}`);
    }
}

function startAuthCallbackServer(context) {
    return new Promise((resolve) => {
        if (authCallbackServer) {
            console.log('[Auth] Callback server already running');
            resolve();
            return;
        }

        const server = http.createServer(async (req, res) => {
            console.log('[Callback] Received request:', req.url);

            if (req.url.startsWith('/auth-callback')) {
                const urlParams = new URLSearchParams(req.url.split('?')[1]);
                const token = urlParams.get('token');
                const userJson = urlParams.get('user');

                if (token && userJson) {
                    try {
                        authToken = token;
                        currentUser = JSON.parse(decodeURIComponent(userJson));

                        // Store securely
                        await context.secrets.store('vark-auth-token', authToken);
                        await context.secrets.store('vark-user', JSON.stringify(currentUser));

                        console.log('[Auth] Successfully authenticated:', currentUser.email);

                        // Send success response
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                            <head><title>Authentication Success</title></head>
                            <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
                                <div style="text-align: center;">
                                    <h1 style="color: #667eea;">✓ Authentication Successful!</h1>
                                    <p style="color: #666; font-size: 16px;">Welcome, ${currentUser.name}!</p>
                                    <p style="color: #999; margin-top: 20px;">You can close this window and return to VS Code.</p>
                                </div>
                            </body>
                            </html>
                        `);

                        // Get latest VARK style and start tracking
                        await updateUserVarkStyle();
                        startBehaviorTracking(context);
                        if (userViewProvider) {
                            userViewProvider.updateView();
                        }

                        vscode.window.showInformationMessage(
                            `Welcome, ${currentUser.name}! VS Code will now track your learning behavior.`
                        );

                    } catch (error) {
                        console.error('[Auth] Error processing callback:', error);
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Error</h1><p>Failed to process authentication.</p></body></html>');
                    }
                } else {
                    console.log('[Auth] Missing token or user data in callback');
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Parameter Error</h1><p>Missing token or user data.</p></body></html>');
                }
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        const PORT = 7777;
        server.listen(PORT, 'localhost', () => {
            console.log(`[Callback] Server listening on http://localhost:${PORT}`);
            authCallbackServer = server;
            resolve();
        });
    });
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
        
        authToken = null;
        currentUser = null;
        
        console.log('[Auth] Cleared auth variables');
        
        // Clear secure storage
        try {
            await context.secrets.delete('vark-auth-token');
            await context.secrets.delete('vark-user');
            console.log('[Auth] Cleared secure storage');
        } catch (error) {
            console.log('[Auth] Error clearing secure storage:', error.message);
        }
        
        console.log('[Auth] User logged out, auth data cleared');
        
        // Force view update to show login prompt FIRST
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
    if (authCallbackServer) {
        console.log('[Server] Closing callback server');
        authCallbackServer.close();
    }

    if (authToken && currentUser) {
        try {
            await sendBehaviorData();
        } catch (error) {
            console.log('[Tracking] Could not send final data on deactivation');
        }
    }
}

module.exports = { activate, deactivate };