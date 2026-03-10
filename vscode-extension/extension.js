const vscode = require("vscode");
const axios = require("axios");

const API_BASE_URL =
  "https://neuromentor-backend--8u5ar44.thankfulcoast-1d37f0d2.eastasia.azurecontainerapps.io/api";
const COGNITIVE_BACKEND_URL =
  "https://Urindu-Cognitive-Load-Inference-Engine.hf.space/predict";
const ERROR_BACKEND_URL =
  "https://vishwak03-error-driven-learning-reinforcement-engine.hf.space/predict";
const DASHBOARD_URL = "https://neuromentor-dashboard.vercel.app/";
const HF_TOKEN = "";

// Cognitive state colors
const stateColors = {
  confused: "#e74c3c",
  relaxed: "#27ae60",
  focused: "#2980b9",
  active_thinking: "#f39c12",
  neutral: "#7f8c8d",
};

// --- YOUR ERROR HIGHLIGHTING ---
const errorDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(241, 76, 76, 0.2)", // Light red background
  border: "1px solid rgba(241, 76, 76, 0.5)", // Red border
  isWholeLine: true,
  overviewRulerColor: "rgba(241, 76, 76, 0.8)", // Shows red mark on the scrollbar
  overviewRulerLane: vscode.OverviewRulerLane.Right,
});

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

// UI Providers
let userViewProvider = null;
let authPanel = null;
let statusBarItem = null;
let errorAnalyzerProvider = null; // YOUR SIDEBAR

// Cognitive state tracking
let currentPrediction = "Waiting for data...";
let currentProbabilities = null;

// ==========================================
// 🔐 AUTHENTICATION PROVIDER (Team's Code)
// ==========================================
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
      "varkAuth",
      "VARK Authentication",
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    authPanel.webview.html = this.getHtml();
    authPanel.onDidDispose(() => {
      authPanel = null;
    });

    authPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "login") {
        await this.handleLogin(message.email, message.password);
      } else if (message.command === "register") {
        await this.handleRegister(
          message.name,
          message.email,
          message.password,
          message.passwordConfirm,
        );
      }
    });
  }

  async handleLogin(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data?.token) {
        authToken = response.data.token;
        currentUser = response.data.user;

        // Store securely
        await this._context.secrets.store("vark-auth-token", authToken);
        await this._context.secrets.store(
          "vark-user",
          JSON.stringify(currentUser),
        );

        console.log("[Auth] Successfully logged in:", currentUser.email);
        authPanel?.dispose();

        // Update UI
        await updateUserVarkStyle();
        startBehaviorTracking(this._context);
        if (userViewProvider) {
          userViewProvider.updateView();
        }

        vscode.window.showInformationMessage(
          `Welcome, ${currentUser.name}! VS Code will now track your learning behavior.`,
        );
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      authPanel?.webview.postMessage({ command: "error", error: errorMsg });
    }
  }

  async handleRegister(name, email, password, passwordConfirm) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        name,
        email,
        password,
        passwordConfirm,
      });

      if (response.data?.token) {
        authToken = response.data.token;
        currentUser = response.data.user;

        // Store securely
        await this._context.secrets.store("vark-auth-token", authToken);
        await this._context.secrets.store(
          "vark-user",
          JSON.stringify(currentUser),
        );

        console.log("[Auth] Successfully registered:", currentUser.email);
        authPanel?.dispose();

        // Update UI
        await updateUserVarkStyle();
        startBehaviorTracking(this._context);
        if (userViewProvider) {
          userViewProvider.updateView();
        }

        vscode.window.showInformationMessage(
          `Welcome, ${currentUser.name}! VS Code will now track your learning behavior.`,
        );
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      authPanel?.webview.postMessage({ command: "error", error: errorMsg });
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

// ==========================================
// 🧠 COGNITIVE STATE PROVIDER (Team's Code)
// ==========================================
class CognitiveStateViewProvider {
  constructor(context) {
    this._context = context;
    this._webviewView = null;
  }

  resolveWebviewView(webviewView) {
    this._webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "logout") {
        await logout(this._context);
      } else if (message.command === "sendBehavior") {
        await sendBehaviorData();
      } else if (message.command === "openAuth") {
        await openWebAuthenticator(this._context);
      } else if (message.command === "openDashboard") {
        vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
      }
    });
  }

  updateView() {
    if (this._webviewView) {
      this._webviewView.webview.html = this.getHtml();
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
        .btn-dash { background: #0078D4; color: white; border: 1px solid #005A9E; }
    </style>
</head>
<body>
    <div class="logo">◎</div>
    <h2>NeuroMentor</h2>
    <p>Track your learning style through your coding behavior</p>
    <div class="button-group">
        <button onclick="login()">Login</button>
        <button class="secondary" onclick="register()">Register</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function login() {
            vscode.postMessage({ command: 'openAuth' });
        }

        function register() {
            vscode.postMessage({ command: 'openAuth' });
        }
    </script>
</body>
</html>`;
    }

    const learningStyle = currentUser?.learningStyle || "Not Identified";
    const styleDescription = getLearningStyleDescription(learningStyle);
    const prediction = currentPrediction;
    const probabilities = currentProbabilities;
    const color = stateColors[prediction] || "#555";

    const probaRows = probabilities
      ? Object.entries(probabilities)
          .map(([state, val]) => {
            const pct = (val * 100).toFixed(1);
            const barColor = stateColors[state] || "#999";
            return `
                        <div class="proba-row">
                            <span class="state-label">${state}</span>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width:${pct}%; background:${barColor};"></div>
                            </div>
                            <span class="pct-label">${pct}%</span>
                        </div>`;
          })
          .join("")
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
        padding: 15px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 100vh;
    }
    .header {
        text-align: center;
        margin-bottom: 15px;
    }
    .logo {
        width: 60px;
        height: 60px;
        margin: 0 auto 10px;
        background: linear-gradient(135deg, #003f87 0%, #00a8e8 50%, #00d9ff 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        color: white;
        font-weight: bold;
    }
    .header h2 { font-size: 16px; margin-bottom: 5px; }
    .header p { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .content { flex: 1; }
    
    .section {
        background: var(--vscode-list-activeSelectionBackground);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 12px;
        text-align: center;
    }
    .section-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 6px;
    }
    .learning-style {
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-terminal-ansiBlue);
        text-transform: uppercase;
    }
    .learning-style.not-identified {
        color: var(--vscode-descriptionForeground);
        font-size: 16px;
    }
    .style-description {
        font-size: 11px;
        color: var(--vscode-editor-foreground);
        line-height: 1.4;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.1);
    }
    
    .state-value {
        font-size: 20px;
        font-weight: 700;
        text-transform: capitalize;
        padding: 6px 12px;
        border-radius: 20px;
        display: inline-block;
        background: rgba(0,0,0,0.08);
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
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
    }
    .proba-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 5px;
        font-size: 11px;
    }
    .state-label {
        width: 90px;
        flex-shrink: 0;
        text-transform: capitalize;
        color: var(--vscode-editor-foreground);
    }
    .bar-bg {
        flex: 1;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        height: 6px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
    }
    .pct-label {
        width: 32px;
        text-align: right;
        color: var(--vscode-descriptionForeground);
        font-size: 10px;
    }
    .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        text-align: center;
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
    .btn-dash { 
        background: #0078D4; 
        color: white; 
        border: 1px solid #005A9E; 
    }
    .btn-dash:hover { 
        background: #005A9E; 
    }
</style>
</head>
<body>
    <div class="header">
        <div class="logo">🧠</div>
        <h2>${currentUser?.name || "User"}</h2>
        <p>${currentUser?.email || "user@example.com"}</p>
    </div>

    <div class="content">
        <div class="section">
            <div class="section-label">Your Learning Style</div>
            <div class="learning-style ${learningStyle === "Not Identified" ? "not-identified" : ""}">
                ${learningStyle}
            </div>
            ${styleDescription ? `<div class="style-description">${styleDescription}</div>` : ""}
        </div>

        <div class="section">
            <div class="section-label">Current Cognitive State</div>
            <div class="state-value">
                <span class="status-dot"></span>${prediction}
            </div>
        </div>

        <div class="section">
            <div class="probabilities">
                <h3>Confidence Scores</h3>
                ${probaRows}
            </div>
        </div>
    </div>

    <div class="footer">
        <button class="btn-dash" onclick="openDash()">📊 View Analytics Dashboard</button>
        <button class="btn-primary" onclick="sendBehavior()">Send Data Now</button>
        <button class="btn-danger" onclick="logout()">Logout</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openDash() {
            vscode.postMessage({ command: 'openDashboard' });
        }

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

// ==========================================
// 🛠️ ERROR ANALYZER PROVIDER (YOUR UI CODE!)
// ==========================================
class ErrorAnalyzerProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "openUrl") {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
    });

    this._view.webview.html = this._getHtmlForWebview(null);
  }

  showLoading() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview("loading");
    }
  }

  showError() {
    if (this._view) {
      this._view.webview.html = `
            <html><body style="color: white; padding: 10px; font-family: sans-serif;">
                <h3>❌ Connection Failed</h3>
                <p>Could not connect to the cloud server.</p>
                <p style="font-size: 10px; opacity: 0.7;">Check VS Code Debug Console for details.</p>
            </body></html>`;
    }
  }

  updateContent(data) {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(data);
    }
  }

  _getHtmlForWebview(data) {
    if (data === "loading") {
      return `
            <html><body style="color: white; font-family: var(--vscode-font-family); padding: 20px; text-align: center;">
                <h2>🧠 Thinking...</h2>
                <p>Analyzing logic & syntax...</p>
            </body></html>`;
    }

    if (!data) {
      return `
            <html>
            <head>
                <style>
                    body {
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        text-align: center; /* Centers the heading and text */
                    }
                    .dash-btn {
                        display: block;
                        width: 100%;
                        box-sizing: border-box; /* FIXES THE ALIGNMENT OVERFLOW */
                        padding: 10px;
                        background: #0078D4;
                        color: white;
                        border-radius: 4px;
                        text-align: center;
                        margin-top: 20px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 12px;
                        border: 1px solid #005A9E;
                        transition: background 0.2s;
                    }
                    .dash-btn:hover {
                        background: #005A9E;
                    }
                </style>
            </head>
            <body>
                <h2>👋 NeuroMentor Ready</h2>
                <p style="opacity: 0.8; font-size: 13px;">Open a C file and click "Analyze Code".</p>
                
                <div class="dash-btn" onclick="vscode.postMessage({ command: 'openUrl', url: '${DASHBOARD_URL}' })">
                    📊 View My Analytics Dashboard
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                </script>
            </body>
            </html>`;
    }

    const tut = data.tutorial;
    const isError = data.error_type !== "No Error";
    const color = isError ? "#F14C4C" : "#4EC9B0";
    const icon = isError ? "⚠️" : "✅";

    let hintText = (data.recommendation || "")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");

    const showVideo =
      hintText.toLowerCase().includes("youtube") ||
      hintText.toLowerCase().includes("watch") ||
      (data.source && data.source.includes("GenAI"));

    const videoQuery = tut
      ? `${tut.title} C programming fix`
      : "C programming tutorial";
    const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`;

    const errorBadge =
      isError && data.total_errors
        ? `<div style="float: right; background: rgba(241, 76, 76, 0.2); color: #F14C4C; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                 ${data.total_errors} Error${data.total_errors > 1 ? "s" : ""} Found
               </div>`
        : "";

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); }
                .card { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 6px; padding: 12px; margin-bottom: 15px; }
                .header { font-size: 14px; font-weight: bold; color: ${color}; margin-bottom: 5px; }
                .conf { font-size: 11px; opacity: 0.8; margin-bottom: 10px; }
                .hint { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; margin-top: 10px; border-left: 3px solid ${color}; line-height: 1.4; }
                
                h3 { margin-top: 0; font-size: 13px; text-transform: uppercase; opacity: 0.7; }
                .code-box { font-family: 'Courier New', monospace; padding: 8px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; overflow-x: auto; }
                .bad { background: rgba(241, 76, 76, 0.1); border: 1px solid rgba(241, 76, 76, 0.3); }
                .good { background: rgba(78, 201, 176, 0.1); border: 1px solid rgba(78, 201, 176, 0.3); }
                
                .btn { 
                    display: block; width: 100%; box-sizing: border-box; padding: 10px; 
                    background: #FF0000; color: white; border: none; border-radius: 4px; 
                    cursor: pointer; text-align: center; margin-top: 10px; text-decoration: none; 
                    font-weight: bold; font-size: 12px; transition: 0.2s;
                }
                .btn:hover { background: #CC0000; }
                
                .btn-dash { background: #0078D4; border: 1px solid #005A9E; margin-top: 25px; }
                .btn-dash:hover { background: #005A9E; }
                
                .fix-section { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
            </style>
        </head>
        <body>
            <div class="card" style="border-color: ${color};">
                ${errorBadge}
                <div class="header">${icon} ${data.error_type}</div>
                <div class="conf">Source: ${data.source} | Conf: ${data.confidence}</div>
                
                ${
                  isError && data.error_line && data.error_line > 0
                    ? `<div style="font-size: 11px; color: #F14C4C; margin-bottom: 8px;">📍 Issue found near line ${data.error_line}</div>`
                    : ""
                }

                ${
                  hintText
                    ? `
                <div class="hint">
                    <b>Mentor Tip:</b><br>
                    ${hintText}
                </div>`
                    : ""
                }
                
                ${showVideo && isError ? `<div onclick="openLink('${videoUrl}')" class="btn">▶️ Watch Video Tutorial</div>` : ""}
            </div>

            ${
              isError && tut
                ? `
            <div class="card">
                <h3>🎓 Micro-Tutorial</h3>
                <p><b>${tut.title}</b></p>
                <p style="font-size: 12px; opacity: 0.9;">${tut.concept}</p>
                
                <div class="fix-section">
                    <p style="font-size: 12px; margin-bottom: 5px;"><b>🛠️ How to Fix:</b></p>
                    <p style="font-size: 12px; opacity: 0.9;">${tut.fix}</p>
                </div>
                
                ${tut.bad ? `<div style="font-size: 11px; margin-top: 10px; margin-bottom: 2px;">❌ Avoid This:</div><div class="code-box bad">${tut.bad}</div>` : ""}
                ${tut.good ? `<div style="font-size: 11px; margin-bottom: 2px;">✅ Try This:</div><div class="code-box good">${tut.good}</div>` : ""}
            </div>
            `
                : !isError
                  ? `
                <div class="card" style="border-color: #4EC9B0;">
                    <h3>🎉 Great Job!</h3>
                    <p>Your code logic looks solid. The AI Supervisor verified that your code is correct.</p>
                </div>
            `
                  : ""
            }

            <!-- DASHBOARD BUTTON FOR ERROR ANALYZER SIDEBAR -->
            <div onclick="openLink('${DASHBOARD_URL}')" class="btn btn-dash">
                📊 View My Analytics Dashboard
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                function openLink(url) {
                    vscode.postMessage({ command: 'openUrl', url: url });
                }
            </script>
        </body>
        </html>`;
  }
}

// ==========================================
// 🚀 EXTENSION ACTIVATION
// ==========================================
async function activate(context) {
  console.log("🧠 NeuroMentor with VARK Behavior Tracker Activated");

  // 1. Register Team's Cognitive Webview
  userViewProvider = new CognitiveStateViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("varkUserView", userViewProvider),
  );

  // 2. Register YOUR Error Analyzer Webview
  errorAnalyzerProvider = new ErrorAnalyzerProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "neuromentor.errorAnalyzer",
      errorAnalyzerProvider,
    ),
  );

  // 3. Status bar item for cognitive state
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(circle-outline) Cognitive: Waiting...";
  statusBarItem.tooltip = "NeuroMentor Cognitive State";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Try to load existing token from secure storage
  const secretStorage = context.secrets;
  try {
    authToken = await secretStorage.get("vark-auth-token");
    currentUser = JSON.parse((await secretStorage.get("vark-user")) || "{}");
    if (authToken && currentUser?.id) {
      await updateUserVarkStyle();
    }
  } catch (error) {
    console.log("[Init] No existing auth found:", error.message);
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("varkBehavior.login", () => {
      openWebAuthenticator(context);
    }),
    vscode.commands.registerCommand("varkBehavior.register", () => {
      openWebAuthenticator(context);
    }),
    vscode.commands.registerCommand("varkBehavior.logout", () => {
      logout(context);
    }),
    vscode.commands.registerCommand("varkBehavior.sendNow", sendBehaviorData),
  );

  // 🔴 REGISTER YOUR ANALYZE COMMAND 🔴
  let disposable = vscode.commands.registerCommand(
    "neuromentor.analyze",
    async () => {
      // We use the team's currentUser logic instead of globalState!
      if (!currentUser || !currentUser.email) {
        vscode.window.showWarningMessage("Please log in to NeuroMentor first!");
        openWebAuthenticator(context);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const code = editor.document.getText();

      // Auto-focus your specific sidebar window
      vscode.commands.executeCommand("neuromentor.errorAnalyzer.focus");
      errorAnalyzerProvider.showLoading();

      // Clear previous highlights before analyzing
      editor.setDecorations(errorDecorationType, []);

      try {
        console.log(
          `Sending to cloud server for user: ${currentUser.email}...`,
        );

        // 🔗 Sending Code AND Cognitive State to your Hugging Face Backend
        const response = await axios.post(ERROR_BACKEND_URL, {
          code: code,
          user_id: currentUser.email,
          cognitive_state: currentPrediction,
        });

        const data = response.data;

        // HIGHLIGHT THE ERROR LINE
        if (
          data.error_type !== "No Error" &&
          data.error_line &&
          data.error_line > 0
        ) {
          const lineIndex = data.error_line - 1;
          if (lineIndex < editor.document.lineCount) {
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            editor.setDecorations(errorDecorationType, [range]);
          }
        }

        // Update the sidebar UI with the response data
        errorAnalyzerProvider.updateContent(data);
      } catch (error) {
        console.error("Frontend caught an error:", error);
        errorAnalyzerProvider.showError();
      }
    },
  );

  context.subscriptions.push(disposable);

  // Show login/register if not authenticated
  if (!authToken) {
    await openWebAuthenticator(context);
  } else {
    startBehaviorTracking(context);
    if (userViewProvider) {
      userViewProvider.updateView();
    }
  }

  // Track text changes for cognitive backend
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const change of event.contentChanges) {
        keystrokes += change.text.length;
        const trimmed = change.text.trim();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*")
        ) {
          commentLines++;
        }
        lastActivityTime = Date.now();

        // Send to cognitive backend
        sendEventToBackend({
          type: "code_edit",
          text_length: change.text.length,
        });
      }
    }),
  );

  // Track cursor movement
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.selections.length > 0) {
        sendEventToBackend({
          type: "cursor_move",
          selections_count: event.selections.length,
        });
      }
    }),
  );

  // Track editor focus
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        sendEventToBackend({
          type: "editor_focus",
          language: editor.document.languageId,
        });
      }
    }),
  );

  // Link hinting module if present
  try {
    require("./hinting.js").activateHinting(context);
  } catch (e) {
    console.log("[Init] hinting.js not found, skipping.");
  }
}

// ==========================================
// ⚙️ HELPER FUNCTIONS (Team's Code)
// ==========================================
async function sendEventToBackend(event) {
  try {
    const response = await fetch(COGNITIVE_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (data.prediction) {
      currentPrediction = data.prediction;
      currentProbabilities = data.probabilities;
      updateStatusBar(currentPrediction);

      // Optional: You could refresh the UI here if you wanted the cognitive state to be live
      if (userViewProvider) {
        userViewProvider.updateView();
      }
    }
  } catch (err) {
    // console.error('[Cognitive] Error sending event:', err.message);
  }
}

function updateStatusBar(prediction) {
  if (!statusBarItem) return;
  const icon =
    {
      confused: "$(warning)",
      relaxed: "$(check)",
      focused: "$(eye)",
      active_thinking: "$(lightbulb)",
      neutral: "$(circle-outline)",
    }[prediction] || "$(circle-outline)";

  statusBarItem.text = `${icon} ${prediction}`;
  statusBarItem.tooltip = `Cognitive State: ${prediction}`;
  statusBarItem.color = stateColors[prediction] || undefined;
}

async function openWebAuthenticator(context) {
  try {
    try {
      await axios.get(`${API_BASE_URL.replace("/api", "")}`, { timeout: 5000 });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Cannot connect to backend: ${API_BASE_URL}`,
      );
      return;
    }

    const authProvider = new AuthWebviewProvider(context);
    await authProvider.show();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open authentication: ${error.message}`,
    );
  }
}

function getLearningStyleDescription(style) {
  const descriptions = {
    VISUAL:
      "You learn best through visual aids like diagrams, charts, and color-coded information.",
    AURAL:
      "You learn best through listening and verbal instruction. You prefer discussions and audio content.",
    "READING/WRITING":
      "You learn best through reading and writing. You prefer text-based learning materials.",
    KINESTHETIC:
      "You learn best through hands-on experience and practical application.",
    MULTIMODAL:
      "You have multiple strong learning preferences and adapt well to different learning styles.",
  };
  return descriptions[style?.toUpperCase()] || null;
}

async function updateUserVarkStyle() {
  try {
    const response = await axios.get(`${API_BASE_URL}/behavior/vark-style`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.data?.predicted_style) {
      currentUser.learningStyle = response.data.predicted_style;
    }
  } catch (error) {}
}

function startBehaviorTracking(context) {
  const textChangeDisposable = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      for (const change of event.contentChanges) {
        keystrokes += change.text.length;
        const trimmed = change.text.trim();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*")
        ) {
          commentLines++;
        }
        lastActivityTime = Date.now();
      }
    },
  );

  const visibleRangeDisposable =
    vscode.window.onDidChangeTextEditorVisibleRanges(() => {
      scrollEvents++;
      lastActivityTime = Date.now();
    });

  const debugSessionDisposable = vscode.debug.onDidStartDebugSession(() => {
    compileCount++;
    lastActivityTime = Date.now();
  });

  const idleCheckInterval = setInterval(() => {
    const timeSinceLastActivity = (Date.now() - lastActivityTime) / 1000;
    if (timeSinceLastActivity > 30) {
      idleTime += 10;
    }
  }, 10000);
  const idleCheckDisposable = {
    dispose: () => clearInterval(idleCheckInterval),
  };

  const timer = setInterval(() => sendBehaviorData(), 300000);
  const timerDisposable = { dispose: () => clearInterval(timer) };

  context.subscriptions.push(
    textChangeDisposable,
    visibleRangeDisposable,
    debugSessionDisposable,
    idleCheckDisposable,
    timerDisposable,
  );
}

async function sendBehaviorData() {
  if (!authToken || !currentUser) return;

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
    timestamp,
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/behavior`, payload, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.data?.predicted_style) {
      currentUser.learningStyle = response.data.predicted_style;
    }

    vscode.window.showInformationMessage(
      `Behavior logged! Current Learning Style: ${currentUser.learningStyle || "Calculating..."}`,
    );

    keystrokes = scrollEvents = idleTime = compileCount = commentLines = 0;
    startTime = Date.now();
    lastActivityTime = Date.now();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to send behavior data: ${error.message}`,
    );
  }
}

async function logout(context) {
  try {
    try {
      await context.secrets.delete("vark-auth-token");
      await context.secrets.delete("vark-user");
    } catch (error) {}

    authToken = null;
    currentUser = null;

    if (userViewProvider) {
      userViewProvider.updateView();
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    vscode.window.showInformationMessage(
      "Logged out successfully. Click Login/Register to sign in again.",
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Logout error: ${error.message}`);
  }
}

async function deactivate() {
  if (authToken && currentUser) {
    try {
      await sendBehaviorData();
    } catch (error) {}
  }
}

module.exports = { activate, deactivate };
