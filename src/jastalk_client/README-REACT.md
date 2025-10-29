# Jastalk Pipecat React Client

A **complete React-based client** for the Jastalk Interview Agent, built with Pipecat's RTVI framework. This client implements **all** components from bot.py including conversation management, real-time metrics, device controls, and session management.

## 🌟 Features

### Complete RTVI Integration

✅ **Conversation Panel** - Real-time transcript display with user/bot messages
✅ **Metrics Tracking** - Performance monitoring (latency, bitrate, jitter, packet loss)
✅ **Device Management** - Camera and microphone selection
✅ **Session Controls** - Connect, disconnect, mic/cam toggle
✅ **Status Indicators** - Connection state, speaking/listening feedback
✅ **Multi-language** - English, Chinese, Spanish support

### React Hooks from @pipecat-ai/client-react

This client uses **all available Pipecat React hooks**:

- `usePipecatClient` - Client instance access
- `useRTVIClientEvent` - Event subscriptions (12+ events)
- `usePipecatClientMediaDevices` - Device enumeration
- `usePipecatClientTransportState` - Connection state
- `usePipecatClientCamControl` - Camera control
- `usePipecatClientMicControl` - Microphone control
- `usePipecatClientMediaTrack` - Media track access

### Jastalk Design System

- 🎨 Purple gradient theme (#667eea to #764ba2)
- 📱 Fully responsive layout
- ✨ Smooth animations and transitions
- 🎯 Professional, clean interface

## 🚀 Quick Start

### Installation

```bash
cd server/agent/client
npm install
```

### Development

```bash
npm run dev
```

Access at: `http://localhost:3003`

### Production Build

```bash
npm run build
```

Built files in `dist/` are automatically served by bot.py at `/client/`

## 📁 Project Structure

```
client/
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # PipecatClientProvider setup
│   ├── index.css                   # Global styles
│   └── components/
│       ├── InterviewUI.jsx         # Main component with RTVI hooks
│       ├── Header.jsx              # Interview info header
│       ├── StatusCard.jsx          # Connection status
│       ├── ConversationPanel.jsx   # Message history
│       ├── MetricsPanel.jsx        # Performance metrics
│       ├── DevicesPanel.jsx        # Device selection
│       └── SessionControls.jsx     # Control buttons
├── package.json                    # Dependencies
├── vite.config.js                  # Vite config
├── tailwind.config.js              # Tailwind config
└── index-react.html                # HTML entry
```

## 🎯 Components

### InterviewUI (Main Component)

Integrates all RTVI functionality:

```jsx
// All RTVI hooks
const client = usePipecatClient();
const transportState = usePipecatClientTransportState();
const { enableCam, isCamEnabled } = usePipecatClientCamControl();
const { enableMic, isMicEnabled } = usePipecatClientMicControl();
const { availableCams, availableMics } = usePipecatClientMediaDevices();

// Event handlers for all RTVI events
useRTVIClientEvent(RTVIEvent.Connected, handleConnected);
useRTVIClientEvent(RTVIEvent.UserTranscript, handleUserTranscript);
useRTVIClientEvent(RTVIEvent.BotTranscript, handleBotTranscript);
// ... 10+ more events
```

### ConversationPanel

- Real-time message display
- User/bot message distinction
- Typing indicators
- Auto-scroll
- Timestamps

### MetricsPanel

Tracks:
- Session duration (live counter)
- Audio latency (ms)
- Network bitrate (kbps)
- Jitter (ms)
- Packet loss (count)

### DevicesPanel

- Lists available cameras
- Lists available microphones
- Real-time device switching
- Device count display

### SessionControls

- Start/End interview
- Mic on/off toggle
- Camera on/off toggle
- Show/hide metrics
- Show/hide devices

## 🔧 Configuration

### Tailwind Colors

Edit `tailwind.config.js`:

```js
colors: {
  jastalk: {
    purple: {
      light: '#667eea',
      DEFAULT: '#6366f1',
      dark: '#764ba2',
    }
  }
}
```

### Vite Proxy

`vite.config.js` proxies `/api` to bot.py:

```js
proxy: {
  '/api': {
    target: 'http://localhost:7860',
    changeOrigin: true
  }
}
```

## 🎤 Usage

1. **Start bot.py**: `uv run bot.py`
2. **Start client**: `npm run dev`
3. **Open browser**: `http://localhost:3003`
4. **Click "Start Interview"**
5. **Grant microphone access**
6. **Start speaking!**

## 📊 Events Handled

All RTVI events from bot.py:

| Event | Description | Handler |
|-------|-------------|---------|
| Connected | Session established | Updates connection status |
| Disconnected | Session ended | Clears state |
| BotReady | Bot initialized | Shows ready status |
| UserTranscript | User speech | Adds to messages |
| BotTranscript | Bot response | Adds to messages |
| UserStartedSpeaking | User began speaking | Shows listening indicator |
| UserStoppedSpeaking | User stopped | Hides listening indicator |
| BotStartedSpeaking | Bot began speaking | Shows speaking indicator |
| BotStoppedSpeaking | Bot stopped | Hides speaking indicator |
| Metrics | Performance data | Updates metrics panel |
| Error | Error occurred | Shows error message |

## 🔗 Integration with Main App

The main Jastalk app (`src/interview_agent_ui.jsx`) can redirect to this client:

```javascript
// In startVoiceInterview()
if (provider === 'pipecat') {
  const params = new URLSearchParams({
    template: activeInterview.subTitle,
    language: currentLang,
    questions: activeInterview.questions.join('\n')
  });
  window.open(`http://localhost:3003?${params}`, '_blank');
}
```

## 🐛 Troubleshooting

### Connection Issues

- ✅ Verify bot.py is running on port 7860
- ✅ Check `/api/offer` endpoint is accessible
- ✅ Grant microphone permissions
- ✅ Check browser console for errors

### No Audio

- ✅ Check browser autoplay policy
- ✅ Verify bot audio track received
- ✅ Look for WebRTC errors

### Devices Not Showing

- ✅ Grant camera/microphone permissions
- ✅ Refresh browser
- ✅ Check device privacy settings

## 📦 Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@pipecat-ai/client-js": "^0.4.1",
  "@pipecat-ai/client-react": "^0.4.1",
  "@pipecat-ai/small-webrtc-transport": "^0.1.1",
  "vite": "^6.0.5",
  "tailwindcss": "^3.4.17"
}
```

## 🌐 Browser Support

- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

Requires WebRTC and modern JavaScript support.

## 📖 Documentation

- **SETUP.md** - Detailed setup and architecture guide
- **README.md** - Original vanilla client documentation
- See also: [Pipecat Docs](https://docs.pipecat.ai)

## 🎨 Customization

All components are modular and can be customized:

1. **Colors**: Edit Tailwind config
2. **Layout**: Modify component JSX
3. **Styling**: Update CSS in `index.css`
4. **Features**: Add new hooks/events

## 🚢 Deployment

### Option 1: Vite Dev Server (Development)

```bash
npm run dev  # Hot reload on port 3003
```

### Option 2: Built with bot.py (Production)

```bash
npm run build  # Outputs to dist/
# bot.py serves dist/ at /client/
```

### Option 3: Deploy Separately

```bash
npm run build
# Deploy dist/ to CDN or static hosting
# Update CORS in bot.py
```

## 📝 License

Same as main Jastalk project.

## 🤝 Contributing

1. Make changes to components
2. Test with `npm run dev`
3. Build with `npm run build`
4. Test built version with bot.py

---

**Built with ❤️ using React + Pipecat RTVI**

For questions, see SETUP.md or check the Pipecat documentation.
