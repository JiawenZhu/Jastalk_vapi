# Chat with JasTalk AI Agent - Implementation Summary

## Overview

Added a real-time chat feature to the interview page that allows users to chat with the JasTalk AI Agent during their interview. The chat opens in a modal overlay and connects to either a local Pipecat server or Daily.co cloud instance.

---

## Features Implemented

### 1. **Chat Button on Interview Page**
- Located next to "Close Interview" button
- Blue-purple gradient styling matching app theme
- MessageCircle icon from lucide-react
- Opens modal overlay when clicked

### 2. **ChatWithAgent Modal Component**
- Full-screen modal overlay (90vh height, max-width 6xl)
- Interview context display showing:
  - Interview title
  - Company name
  - Difficulty level
- Two view modes:
  - **Embedded**: iframe with camera/microphone permissions
  - **Direct Link**: Option to open in new window
- "Open External" button to launch chat in separate browser window
- Clean close functionality

### 3. **Environment-Based URL Routing**
- Automatically selects URL based on `VITE_PIPECAT_LOCAL` environment variable
- **Local Mode** (`VITE_PIPECAT_LOCAL=1`):
  - Uses `VITE_SERVER_URL` (default: http://0.0.0.0:7860)
  - Strips `/api` suffix if present
- **Cloud Mode** (`VITE_PIPECAT_LOCAL=0`):
  - Uses `VITE_DAILY_CLOUD_URL` or default Daily.co URL
  - Default: https://cloud-1ed6ae37ec654b7ebe32b037fd7c1598.daily.co/hDlT5AA6HrLDmqtdgBLo

### 4. **Context Passing via URL Parameters**
Comprehensive interview and user information is passed to the chat interface via URL parameters:
- `interview_title`: Interview title or subtitle
- `interview_company`: Company name (if available)
- `interview_difficulty`: Difficulty level (Easy/Medium/Hard)
- `interview_duration`: Duration in minutes
- `interview_category`: Interview category (Software, Data Science, etc.)
- `interview_questions`: Full list of interview questions (JSON string)
- `user_name`: Candidate name
- `user_email`: Candidate email
- `context`: Set to "interview_chat"
- `mode`: Set to "voice"

**Note**: Empty values are automatically filtered out to keep URLs clean.

---

## Files Created/Modified

### Created Files

#### `/src/pages/ChatWithAgent.jsx`
**Purpose**: Modal component for AI chat interface

**Key Features**:
- Environment-aware URL configuration
- Animated "Say Hey to Start" instruction banner
- iframe embedding with full permissions
- Toggle between embedded and external views
- Interview context display
- Comprehensive URL parameter construction (including questions)

**Props**:
```javascript
{
  interview: Object,    // Interview details
  userInfo: Object,     // User information (name, email)
  onClose: Function,    // Close modal callback
  t: Object            // Translations
}
```

### Modified Files

#### `/src/pages/InterviewPage.jsx`
**Changes**:
1. Added imports:
   ```javascript
   import ChatWithAgent from './ChatWithAgent';
   import { MessageCircle } from 'lucide-react';
   ```

2. Added state:
   ```javascript
   const [showChat, setShowChat] = useState(false);
   ```

3. Updated component signature:
   ```javascript
   const InterviewPage = ({ interview, onExit, t, userInfo = {} }) => {
   ```

4. Added chat button in action buttons section (line 89-95)

5. Added conditional modal rendering (line 248-256):
   ```javascript
   {showChat && (
     <ChatWithAgent
       interview={interview}
       userInfo={userInfo}
       onClose={() => setShowChat(false)}
       t={t}
     />
   )}
   ```

#### `/src/App.jsx`
**Changes**:
1. Added userInfo state (line 47-51):
   ```javascript
   const [userInfo] = useState({
     name: 'Candidate',
     email: ''
   });
   ```

2. Updated InterviewPage rendering to pass userInfo (line 348):
   ```javascript
   <InterviewPage
     interview={activeInterview}
     userInfo={userInfo}
     onExit={...}
     t={t}
   />
   ```

---

## Environment Variables

### Required for Chat Integration

```bash
# Local Development
VITE_PIPECAT_LOCAL=1                    # '1' for local, '0' for cloud
VITE_SERVER_URL=http://127.0.0.1:7860/api  # Local server (auto-strips /api)

# Cloud Configuration
VITE_DAILY_CLOUD_URL=https://cloud-1ed6ae37ec654b7ebe32b037fd7c1598.daily.co/hDlT5AA6HrLDmqtdgBLo
```

---

## User Flow

### Opening Chat
1. User starts an interview
2. User clicks "Chat with JasTalk AI" button
3. Modal overlay appears with chat interface
4. **Prominent instruction banner** tells user to say "Hey" to start
5. Chat connects to appropriate server (local or cloud)
6. Interview context automatically passed to AI agent

### Granting Permissions & Activating Voice AI
1. Once the chat modal opens, user sees clear instruction banner with:
   - Green gradient background with pulsing wave emoji 👋
   - **Step-by-step permission instructions**
   - Orange highlighted important notice
   - Numbered checklist in bordered box

2. **When chat interface loads:**
   - Browser automatically displays permission prompt
   - Prompt asks for camera and microphone access
   - User clicks **"Allow"** button
   - Optionally select "Always allow" to skip future prompts

3. **After permissions granted:**
   - Chat connects and shows user's video feed
   - User begins by saying **"Hey"** to start chatting with the AI Agent
   - User shares which **role** they're interested in
   - Voice AI Agent responds and begins conversation with full context
   - Agent has complete interview information (questions, difficulty, company, etc.)

4. **Troubleshooting (if permissions not working):**
   - Look for camera icon 📷 in browser's address bar
   - Click icon and select "Allow" for camera and microphone
   - Reload page if permissions were previously blocked
   - Blue troubleshooting box provides these tips inline

5. **iframe Configuration:**
   - Proper `allow` attributes for camera, microphone, autoplay
   - Sandbox permissions for scripts, forms, and popups
   - Ensures smooth permission flow

### Using Chat
1. **Embedded Mode** (default):
   - Chat loads in iframe within modal
   - Camera and microphone permissions requested
   - Full real-time interaction

2. **Direct Link Mode**:
   - Shows "Open Chat Window" button
   - Displays full URL for reference
   - Opens in new browser window with full permissions

### Closing Chat
- Click X button in modal header
- Click anywhere outside modal (if implemented)
- Returns to interview page seamlessly

---

## Technical Details

### URL Construction

Example generated URL (local):
```
http://0.0.0.0:7860?interview_title=Senior%20Software%20Engineer&interview_company=TechCorp&interview_difficulty=Hard&interview_duration=45&interview_category=Software&interview_questions=%5B%22Tell%20me%20about%20yourself%22%2C%22What%20are%20your%20strengths%22%5D&user_name=Candidate&context=interview_chat&mode=voice
```

Example generated URL (cloud):
```
https://cloud-1ed6ae37ec654b7ebe32b037fd7c1598.daily.co/hDlT5AA6HrLDmqtdgBLo?interview_title=Senior%20Software%20Engineer&interview_company=TechCorp&interview_difficulty=Hard&interview_questions=%5B...%5D&...
```

**Note**: The `interview_questions` parameter contains the full JSON array of questions, URL-encoded. The backend can parse this to provide context-aware assistance.

### iframe Permissions

The iframe has comprehensive permissions configured:
```html
<iframe
  src={chatUrl}
  allow="camera *; microphone *; autoplay; display-capture; speaker-selection"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
  title="JasTalk AI Agent Chat"
/>
```

**Key permissions:**
- `camera *` - Allows camera access from any origin within iframe
- `microphone *` - Allows microphone access from any origin within iframe
- `autoplay` - Enables automatic media playback
- `display-capture` - Allows screen sharing if needed
- `speaker-selection` - Enables audio output device selection

**Sandbox permissions:**
- `allow-same-origin` - Allows same-origin requests
- `allow-scripts` - Enables JavaScript execution
- `allow-forms` - Allows form submission
- `allow-popups` - Enables popup windows for auth/permissions
- `allow-modals` - Allows modal dialogs
- `allow-popups-to-escape-sandbox` - Allows popups to open without sandbox restrictions

This ensures full WebRTC functionality for real-time communication.

---

## Styling

### Chat Button
- Gradient background: `from-blue-500 to-purple-600`
- Hover effect: `from-blue-600 to-purple-700`
- Icon: MessageCircle (size 20)
- Shadow: `shadow-md` → `shadow-lg` on hover
- Rounded corners: `rounded-xl`

### Modal
- Overlay: Black with 50% opacity
- Modal: White with `rounded-2xl`
- Size: Full width, 90vh height, max-width 6xl
- Shadow: `shadow-2xl`

### Instruction Banner (NEW)
- Gradient background: `from-green-50 to-emerald-50`
- Border: `border-green-200`
- Wave emoji: 👋 with pulsing animation
- Gradient circle: `from-green-500 to-emerald-500`
- Bold "Hey" text in green-700 color
- Prominent placement between context info and chat interface

### Context Info Bar
- Gradient background: `from-blue-50 to-purple-50`
- Difficulty badges with contextual colors:
  - Easy: Green
  - Medium: Yellow
  - Hard: Red

---

## Future Enhancements

### Potential Improvements:
1. **Persistent Chat State**: Keep chat open across page navigation
2. **Chat History**: Save and restore chat conversations
3. **Notifications**: Alert user when AI responds
4. **Minimize/Maximize**: Allow chat to be minimized while continuing interview
5. **Split View**: Show interview and chat side-by-side
6. **Voice Commands**: "Open chat", "Close chat" voice triggers
7. **User Authentication**: Pass real user credentials from auth system
8. **Analytics**: Track chat usage and effectiveness

### Known Limitations:
1. Chat closes when interview exits
2. No message persistence
3. Basic userInfo (hardcoded "Candidate")
4. No offline fallback

---

## Testing Checklist

### Local Development Testing
- [ ] Start local Pipecat server (`npm run pipecat:dev`)
- [ ] Set `VITE_PIPECAT_LOCAL=1` in .env
- [ ] Start frontend (`npm run dev`)
- [ ] Open interview
- [ ] Click "Chat with JasTalk AI"
- [ ] Verify URL points to localhost:7860
- [ ] Test embedded mode
- [ ] Test external window mode
- [ ] Verify interview context passed correctly

### Cloud Testing
- [ ] Set `VITE_PIPECAT_LOCAL=0` in .env
- [ ] Start frontend
- [ ] Open interview
- [ ] Click "Chat with JasTalk AI"
- [ ] Verify URL points to Daily.co
- [ ] Test chat functionality
- [ ] Verify camera/microphone permissions

### UI Testing
- [ ] Chat button visible next to Close button
- [ ] Chat button hover effects work
- [ ] Modal opens smoothly
- [ ] Modal close button works
- [ ] Interview context displays correctly
- [ ] View mode toggle works
- [ ] External window opens correctly
- [ ] Modal responsive on different screen sizes

---

## Troubleshooting

### Issue: Chat modal doesn't open
**Solution**: Check browser console for errors, verify ChatWithAgent import

### Issue: iframe blocked or blank
**Solution**: Check browser permissions for camera/microphone, verify URL is correct

### Issue: Wrong server URL
**Solution**: Verify `VITE_PIPECAT_LOCAL` and `VITE_SERVER_URL` environment variables

### Issue: Interview context not passed
**Solution**: Verify interview object has title/subTitle and difficulty fields

### Issue: Close button doesn't work
**Solution**: Check `onClose` callback is wired correctly with `setShowChat(false)`

---

## Summary

The chat integration provides users with real-time AI assistance during interviews. The implementation:

- ✅ Seamlessly integrates with existing interview UI
- ✅ Supports both local and cloud deployment
- ✅ Passes full interview context to AI agent
- ✅ Provides flexible viewing options (embedded or external)
- ✅ Maintains consistent styling with app theme
- ✅ Built with error handling and fallbacks
- ✅ No breaking changes to existing functionality

**Status**: ✅ Complete and ready for testing

---

*Implementation completed: October 25, 2025*
*All files created and integrated successfully*
*Build verified: No errors*
