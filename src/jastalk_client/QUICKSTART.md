# Quick Start Guide - Jastalk React Client

Get up and running with the full-featured React client in 5 minutes.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Python 3.10+ with uv installed
- ✅ Pipecat bot dependencies installed
- ✅ Microphone access

## Installation (One-Time Setup)

```bash
# Navigate to client directory
cd server/agent/client

# Install dependencies
npm install
```

## Development Mode (Hot Reload)

### Step 1: Start the Bot

In one terminal:

```bash
cd server/agent
uv run bot.py
```

You should see:
```
🚀 Starting Pipecat bot...
📱 Using custom Jastalk client: Vanilla client (client/)
✅ Custom Jastalk client mounted at /client
```

### Step 2: Start React Dev Server

In another terminal:

```bash
cd server/agent/client
npm run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3003/
  ➜  Network: use --host to expose
```

### Step 3: Open Browser

Navigate to: **http://localhost:3003**

### Step 4: Start Interview

1. Click "Start Interview" button
2. Grant microphone access when prompted
3. Wait for "Bot is ready" status
4. Start speaking!

## Production Mode (Built Version)

### Step 1: Build React App

```bash
cd server/agent/client
npm run build
```

This creates optimized files in `client/dist/`

### Step 2: Start Bot

```bash
cd server/agent
uv run bot.py
```

You should see:
```
📱 Using custom Jastalk client: React build (client/dist/)
✅ Custom Jastalk client mounted at /client
```

### Step 3: Access

Navigate to: **http://localhost:7860/client/**

## What You Get

### 🎯 Complete Features

✅ **Conversation** - Real-time transcription of user and bot
✅ **Metrics** - Duration, latency, bitrate, jitter, packet loss
✅ **Devices** - Camera and microphone selection
✅ **Controls** - Start/stop, mic/cam toggle
✅ **Status** - Connection, speaking, listening indicators
✅ **Languages** - English, Chinese, Spanish

### 🎨 UI Components

- **Header** - Template name, question count, language selector
- **Status Card** - Real-time connection and activity status
- **Conversation Panel** - Message history with timestamps
- **Metrics Panel** - Performance monitoring (toggle to show)
- **Devices Panel** - Device management (toggle to show)
- **Session Controls** - All interview controls

## Testing Features

### Test Conversation

1. Click "Start Interview"
2. Speak: "Hello, how are you?"
3. See your transcript appear in real-time
4. Hear and see bot's response

### Test Metrics

1. During interview, click "Metrics" button
2. See real-time performance data
3. Watch duration counter increment
4. Monitor latency and bitrate

### Test Devices

1. Click "Devices" button
2. See all available microphones
3. See all available cameras
4. Switch between devices

### Test Language Switching

1. Use language dropdown in header
2. Select different language
3. Bot receives language change message
4. Continue in new language

## Troubleshooting

### "Start Interview" button doesn't work

- Check that bot.py is running on port 7860
- Check browser console for errors
- Verify microphone permissions granted

### No audio from bot

- Check browser autoplay policy (Chrome requires user interaction)
- Look for audio element errors in console
- Verify bot audio track is being received

### Devices panel empty

- Grant microphone permissions
- Grant camera permissions (if needed)
- Refresh browser
- Check system privacy settings

### Metrics not updating

- Verify connection is established (green status)
- Check that RTVIObserver is enabled in bot.py
- Look for metrics events in console

## Development Tips

### Hot Reload

Any changes to `.jsx` files automatically reload:

```bash
# Edit src/components/ConversationPanel.jsx
# Browser automatically refreshes
# No restart needed!
```

### Console Logging

All RTVI events are logged:

```javascript
// Check browser console for:
✅ Connected to bot
🎤 User transcript: ...
🤖 Bot transcript: ...
📊 Metrics: { latency: 50, ... }
```

### Component Customization

Each component is independent:

```bash
src/components/
├── Header.jsx              # Edit interview info display
├── StatusCard.jsx          # Edit status indicators
├── ConversationPanel.jsx   # Edit message display
├── MetricsPanel.jsx        # Edit metrics UI
├── DevicesPanel.jsx        # Edit device selection
└── SessionControls.jsx     # Edit control buttons
```

## Next Steps

### Customize Styling

Edit `tailwind.config.js`:

```js
colors: {
  jastalk: {
    purple: {
      light: '#YOUR_COLOR',
      DEFAULT: '#YOUR_COLOR',
      dark: '#YOUR_COLOR',
    }
  }
}
```

### Add Features

All RTVI events available in `InterviewUI.jsx`:

```javascript
useRTVIClientEvent(RTVIEvent.YourEvent, handleYourEvent);
```

### Deploy to Production

```bash
# Build optimized version
npm run build

# Deploy dist/ folder
# OR let bot.py serve it at /client/
```

## Common Workflows

### Workflow 1: Development with Hot Reload

```bash
# Terminal 1
cd server/agent && uv run bot.py

# Terminal 2
cd server/agent/client && npm run dev

# Browser
http://localhost:3003
```

### Workflow 2: Production Testing

```bash
# Build once
cd server/agent/client && npm run build

# Run bot (serves built client)
cd server/agent && uv run bot.py

# Browser
http://localhost:7860/client/
```

### Workflow 3: Integration Testing

```bash
# Start full stack from project root
npm run dev:all

# React client on 3003
# Bot on 7860
# Main app on 3002
```

## Resources

- **SETUP.md** - Detailed architecture and setup
- **README-REACT.md** - Complete feature documentation
- **Pipecat Docs** - https://docs.pipecat.ai

## Support

Issues? Check:
1. Browser console for errors
2. Bot console for connection errors
3. Microphone permissions granted
4. Correct ports (3003 for dev, 7860 for prod)

---

**You're all set! 🎉**

Start the bot, start the dev server, and click "Start Interview" to begin!
