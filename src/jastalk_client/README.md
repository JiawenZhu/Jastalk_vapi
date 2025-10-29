# Jastalk Custom Client UI

This directory contains the custom Jastalk-styled client interface for the Pipecat voice interview bot.

## Overview

The custom client replaces the default Pipecat UI with a branded Jastalk interface that matches the main application's design.

## Features

- **Jastalk Branding**: Purple gradient theme matching the main Jastalk app
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Transcription**: Shows conversation between user and interviewer
- **Multi-language Support**: English, Chinese, and Spanish
- **Interview Context**: Displays template name, question count, and language
- **Status Indicators**: Visual feedback for connection status and audio levels
- **Clean UX**: Simplified controls with clear visual states

## How It Works

1. The custom client is automatically served when you run the bot:
   ```bash
   cd server/agent
   uv run bot.py
   ```

2. The bot.py script detects the `client/` directory and mounts it at `/client/`
3. Access the interface at: `http://localhost:7860/client/`

## URL Parameters

The client accepts URL parameters to customize the interview session:

- `template` - Interview template name (e.g., "Software Engineer")
- `language` - Interview language (en, zh, es)
- `questions` - Newline-separated list of questions

Example:
```
http://localhost:7860/client/?template=Product%20Manager&language=en&questions=Tell%20me%20about%20yourself%0AWhat%20are%20your%20strengths?
```

## Integration with Main App

The main Jastalk app (`src/interview_agent_ui.jsx`) automatically redirects to this custom client when:
- Provider is set to "pipecat"
- User clicks "Start Interview"

The redirect includes all necessary parameters for the interview session.

## Customization

To customize the UI further:

1. **Colors**: Edit the Tailwind classes in `index.html`
   - Primary color: `purple-500` to `purple-700`
   - Accent colors: Various color utilities

2. **Layout**: Modify the HTML structure in the `<div id="app">` section

3. **Styling**: Add custom CSS in the `<style>` section

4. **Behavior**: Edit the JavaScript at the bottom of the file

## Technical Details

### Dependencies
- **Tailwind CSS**: Via CDN for rapid styling
- **@pipecat-ai/client-js**: Pipecat WebRTC client library
- **@pipecat-ai/small-webrtc-transport**: Transport layer for local connections

### Client Architecture
1. Parse URL parameters on page load
2. Request microphone permissions
3. Create SmallWebRTC transport pointing to `/api/offer`
4. Establish WebRTC connection with the bot
5. Send initial app message with interview context
6. Handle bidirectional audio and transcription

### Event Handling
- `connected` - Update UI to show active state
- `disconnected` - Clean up and reset UI
- `userTranscript` - Display user's speech
- `botTranscript` - Display interviewer's responses
- `track` - Handle incoming audio stream
- `error` - Show error messages

## Troubleshooting

### Client not loading
- Verify `client/index.html` exists
- Check bot.py logs for "Custom Jastalk client mounted"
- Try clearing browser cache

### Connection fails
- Check microphone permissions in browser
- Verify bot is running on port 7860
- Check console for WebRTC errors

### No audio from bot
- Check browser's audio autoplay policy
- Look for audio element errors in console
- Verify remote track is being received

## Development

To modify the client during development:

1. Edit `index.html`
2. Refresh browser (no restart needed)
3. For bot.py changes, restart the server

## Production Deployment

For production use:
1. Optimize assets (minify JS/CSS)
2. Host static files on CDN
3. Configure proper CORS headers
4. Use production Pipecat Cloud endpoints
