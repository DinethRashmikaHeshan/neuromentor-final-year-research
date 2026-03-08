# VARK Behavior Tracker Extension

This VS Code extension tracks your coding behavior and uses machine learning to predict your VARK learning style. Now with full user authentication!

## Features

- **User Authentication**: Secure login/register with email and password
- **Behavior Tracking**: Automatically tracks:
  - Keystrokes (characters typed)
  - Scroll events
  - Compilation/task execution attempts
  - Code comments ratio
- **VARK Prediction**: ML-powered learning style prediction
- **Behavior History**: Access and analyze previous behavior data
- **Secure Token Storage**: Uses VS Code's secure secret storage
- **Periodic Sync**: Sends data to backend every 5 minutes

## Installation & Setup

### Prerequisites

- Node.js 14+ and npm
- VS Code 1.80.0+
- Backend server (included in this repo)

### Backend Setup

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file in backend directory:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/vark-tracker
JWT_SECRET=your-secret-key-change-in-production
```

3. Start the backend:
```bash
npm start
```
Backend will run on `http://localhost:3000`

### Extension Setup

1. Install extension dependencies:
```bash
cd vscode-extension
npm install
```

2. Launch in VS Code:
   - Press `F5` to start in debug mode, or
   - Use `vsce package && code --install-extension vark-behavior-tracker-1.0.0.vsix`

## Usage

### First-Time Users

1. Launch the extension - login screen appears
2. Click "Register" to create account
3. Enter name, email, and password
4. Confirm password and submit
5. Behavior tracking starts automatically

### Returning Users

1. Click "Login"
2. Enter email and password
3. Previous behavior data loads automatically
4. Coding behavior tracking resumes

### Available Commands

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) and search for:

- **VARK: Login** - Login to your account
- **VARK: Register** - Create new account
- **VARK: Logout** - Logout and disable tracking
- **VARK: Send Behavior Data Now** - Manual data submission

## How It Works

### Data Collection
The extension monitors your VS Code activity:
- **Keystrokes**: Every character you type
- **Scrolling**: Viewport changes while editing
- **Compilation**: Build commands, debug sessions, task runs
- **Comments**: Lines of code that are comments

### Data Processing (Every 5 Minutes)
- Aggregate collected metrics
- Calculate comment ratio
- Send to backend with JWT token

### VARK Prediction
Backend processes data and calls ML service:
- Visual (V) - Tends to scroll more, visual code patterns
- Aural (A) - Collaborative patterns, discussions
- Reading/Writing (R) - Comment-heavy, documentation
- Kinesthetic (K) - Hands-on testing, frequent compilation

### Learning Style Update
Your predicted learning style updates after each analysis cycle.

## Architecture

```
VS Code Extension
    ↓
    ├── Authenticate (Login/Register)
    ├── Secure Token Storage
    ├── Behavior Tracking
    │   ├── Keystrokes
    │   ├── Scrolls
    │   ├── Compile Commands
    │   └── Comments
    ↓
Backend Server (Port 3000)
    ├── JWT Authentication
    ├── User Management
    ├── Behavior Storage (MongoDB)
    ├── Behavior History Retrieval
    ↓
ML Service (Port 8001)
    └── VARK Prediction
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires token)

### Behavior
- `POST /api/behavior` - Submit behavior data
- `GET /api/behavior` - Get user's behavior history (requires token)

## Tracked Metrics Detail

| Metric | Description |
|--------|-------------|
| keystrokes | Total characters typed in session |
| scrollEvents | Number of viewport/scroll changes |
| compileCount | Debug starts or task executions |
| commentRatio | Comment lines / total lines |
| sessionDuration | Seconds since last submission |
| userId | Unique user identifier (from JWT) |

## Troubleshooting

### "Connection refused" error
- **Problem**: Backend not running
- **Solution**: Start backend: `cd backend && npm start`

### "Authentication failed" 
- **Problem**: Wrong credentials or server error
- **Solution**: 
  - Verify email/password
  - Check backend is running
  - Check backend logs for errors

### No behavior data saving
- **Problem**: Network issue or server error
- **Solution**:
  - Check internet connection
  - Verify backend running on port 3000
  - Manually send: `VARK: Send Behavior Data Now`

### VARK prediction shows "unknown"
- **Problem**: ML service not available
- **Solution**: Start ML service or use prediction stub
  - Behavior still saves, prediction attempted next cycle

### Token expired
- **Problem**: Session expired after 7 days
- **Solution**: Logout and login again with `VARK: Logout` then `VARK: Login`

## Development

### Debug Mode
- Press `F5` with this folder open
- New VS Code window opens with extension loaded
- Set breakpoints in `extension.js`
- Use Debug Console for logs

### Key Files
- `extension.js` - Main extension logic
- `package.json` - Extension manifest and dependencies

### Testing Workflow
1. Start backend: `npm start` (in backend/)
2. Press F5 to launch extension
3. Register account in test extension window
4. Type/scroll in files to generate behavior
5. Check backend logs: `[Behavior] ML response:`

## Security

- **Passwords**: Hashed with bcrypt (never stored plaintext)
- **Tokens**: JWT with 7-day expiration
- **Secure Storage**: VS Code's native secure storage (OS-level encryption)
- **HTTPS Ready**: API URLs can be updated for secure connections

## Future Enhancements

- Real-time VARK visualization dashboard
- Peer comparison and leaderboards
- Learning recommendations based on style
- Export behavior data reports
- Multi-workspace support
- IDE plugins for other editors (VS, IntelliJ, etc.)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs: `console.log` output
3. Check VS Code extension output: **Help → Toggle Developer Tools**

## License

Final Year Research Project - Learning Style Identifier
