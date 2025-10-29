# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jastalk Vapi Interview Agent is an AI-powered voice interview platform built with React and Vapi for job preparation and practice interviews. The app supports multiple languages (English, Chinese, Spanish) and offers both voice and video interview modes with real-time transcription.

## Development Commands

### Core Commands
```bash
# Start development server
npm run dev                    # Starts Vite dev server on port 3002 (uses current .env)

# Environment-specific development
npm run dev:local              # Start with local Pipecat environment
npm run dev:cloud              # Start with cloud Pipecat environment

# Full stack development (frontend + backend)
npm run dev:all                # Run frontend + backend (uses current .env)
npm run dev:all:local          # Run full stack with local environment
npm run dev:all:cloud          # Run full stack with cloud environment

# Environment switching
npm run env:local              # Switch to local environment (.env.local → .env)
npm run env:cloud              # Switch to cloud environment (.env.cloud → .env)

# Build and preview
npm run build                  # Build for production using Vite
npm run preview                # Preview production build on port 3002

# Backend services
npm run pipecat:dev            # Start Pipecat development server only

# Vercel deployment commands
npm run vercel:dev             # Start Vercel dev server
npm run dev:vercel             # Run Vercel dev with proxy
npm run deploy:preview         # Deploy to Vercel preview
npm run deploy:prod            # Deploy to Vercel production
```

### Pipecat Commands (Backend Agent)
```bash
# Navigate to server/agent directory first
cd server/agent

# Set up Python environment (requires Python 3.10+)
uv sync                        # Install dependencies with uv package manager
uv run bot.py                  # Run Pipecat bot locally on port 7860

# Production deployment
uv run pcc auth login          # Login to Pipecat Cloud
uv run pcc deploy              # Deploy to Pipecat Cloud
```

## Project Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite build system
- **Styling**: Tailwind CSS with PostCSS
- **Entry Point**: `src/index.jsx` → `src/interview_agent_ui.jsx`
- **Main Component**: `InterviewAgentUI` - handles entire application state and UI

### Voice Integration Architecture
The app supports dual voice providers:

1. **Vapi Integration** (Primary)
   - SDK: `@vapi-ai/web`
   - Configuration: Environment variables for API keys and model settings
   - Voice Models: Supports Gemini 2.5 Flash, Gemini 2.0 Flash, and fallback models
   - Modes: Separate assistant IDs for voice-only and video modes

2. **Pipecat Integration** (Alternative)
   - SDK: `@pipecat-ai/client-js` with `@pipecat-ai/daily-transport`
   - Local Development: Connects to localhost:7860 via `/api/offer` endpoint
   - Cloud: Uses Pipecat Cloud via Daily transport with room URLs and tokens

### Interview System Architecture
- **Templates**: Stored in `interview_templates.json` and loaded dynamically
- **Flow Control**: Guided by `interview_flow_prompt.md` for AI interviewer behavior
- **Question Management**: Auto-detection of question progression from AI responses
- **Multi-language**: English, Chinese (zh), Spanish (es) with localized voice models

### State Management
The main component manages complex state including:
- Interview templates and categories
- Active interview session with question tracking
- Voice call state (Vapi/Pipecat connection status)
- Real-time transcription and AI responses
- User answers collection and progress tracking

## Environment Configuration

The project supports both cloud and local development environments with easy switching.

### Environment Files
- `.env` - Current active environment (automatically managed by npm scripts)
- `.env.cloud` - Cloud environment configuration (Pipecat Cloud)
- `.env.local` - Local environment configuration (Local Docker/Pipecat)

### Environment Variables
```bash
# Vapi Configuration (Frontend)
VITE_VAPI_PUBLIC_KEY=pk_your_public_key_here
VITE_VAPI_ASSISTANT_ID=optional_assistant_id
VITE_VAPI_ASSISTANT_ID_VOICE=optional_voice_assistant_id
VITE_VAPI_ASSISTANT_ID_VIDEO=optional_video_assistant_id

# Pipecat Server Configuration
VITE_SERVER_URL=https://cloud.pipecat.dev/api    # Cloud
# VITE_SERVER_URL=http://127.0.0.1:7860/api      # Local

# Model Configuration
VITE_VAPI_MODEL_PROVIDER=google           # Default: google
VITE_VAPI_MODEL=gemini-2.5-flash          # Primary model
VITE_VAPI_MODEL_PRIMARY=gemini-2.5-flash  # Primary model
VITE_VAPI_MODEL_FALLBACK=gemini-2.0-flash # Fallback model

# Voice/Audio Configuration
VITE_VAPI_VOICE_PROVIDER=playht           # Default: playht
VITE_VAPI_VOICE_ID=jennifer-playht        # Default voice
VITE_VAPI_TRANSCRIBER_PROVIDER=google     # Default: google
VITE_VAPI_TRANSCRIBER_MODEL=gemini-2.0-flash

# Provider Selection
VITE_PROVIDER=pipecat                     # 'vapi' or 'pipecat'
VITE_PIPECAT_LOCAL=1                      # '1' for local, '0' for cloud

# External Templates (Optional)
VITE_TEMPLATES_URL=https://example.com/templates.json

# Pipecat Cloud Keys
PIPECATCLOUD_PUBLIC_KEY=pk_your_public_key
PIPECATCLOUD_PRIVATE_KEY=sk_your_private_key
```

### Quick Environment Switching
```bash
# Switch to cloud environment
npm run env:cloud
npm run dev:cloud

# Switch to local environment  
npm run env:local
npm run dev:local

# Or use direct commands (automatically switches environment)
npm run dev:all:cloud    # Full stack cloud development
npm run dev:all:local    # Full stack local development
```

### Pipecat Backend Configuration
```bash
# In server/agent/.env
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
CARTESIA_API_KEY=your_cartesia_api_key
```

## Key Files and Their Purposes

### Frontend Core Files
- `src/interview_agent_ui.jsx` - Main application component with all UI and logic
- `src/index.jsx` - React application entry point
- `interview_templates.json` - Interview questions database
- `interview_flow_prompt.md` - AI interviewer behavior instructions
- `vapi_config.js` - Vapi SDK configuration and helper functions

### Backend Files
- `server/agent/bot.py` - Pipecat voice bot implementation
- `server/pipecat-dev.js` - Development server for Pipecat integration
- `api/pipecat/start.js` - API endpoint for starting Pipecat sessions

### Configuration Files
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

## Development Guidelines

### Voice Integration Testing
- The app automatically falls back to mock mode if no Vapi public key is provided
- Test both Vapi and Pipecat providers using the provider toggle in the UI
- Voice/video mode selection affects model routing and capabilities

### Interview Flow Development
- Interview questions are defined in JSON format with metadata (difficulty, duration, etc.)
- The AI interviewer follows structured prompts from `interview_flow_prompt.md`
- Question progression can be automatic (AI-driven) or manual (user-controlled)

### Adding New Interview Categories
1. Add category to `interview_templates.json` with appropriate structure
2. Update category styling in `interviewCategories` object in main component
3. Ensure category icons and colors are defined

### Multi-language Support
- All UI text uses translation function `getTranslations()`
- Voice models are automatically selected based on `currentLang` state
- Interview prompts should be internationalized for different languages

## Common Development Tasks

### Running Tests
No specific test framework is configured. Test manually by:
1. Starting the development server
2. Testing voice functionality with both providers
3. Verifying interview flow with different templates
4. Testing multi-language switching

### Adding New Voice Providers
1. Extend the provider selection logic in `startVoiceInterview()`
2. Add appropriate SDK imports and configuration
3. Update environment variable handling for new provider settings

### Debugging Voice Issues
1. Check browser console for Vapi/Pipecat connection errors
2. Verify microphone permissions are granted
3. Test with different voice models if primary fails
4. Use mock mode to isolate frontend vs. voice integration issues