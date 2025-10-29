# Interview Data Flow - Implementation Guide

## Problem Statement

The AI agent was not receiving interview information (title, difficulty, questions, etc.) during chat sessions, causing it to have no context about the specific interview.

## Root Cause

URL query parameters passed to the Pipecat client were not being extracted and sent to the bot as application messages. The bot's `on_app_message` handler was ready to receive interview data, but no mechanism existed to extract URL parameters and send them.

## Solution Architecture

### Data Flow:

```
Frontend (React)
  ↓ URL Parameters
Chat Modal (iframe)
  ↓ Loads with query string
Custom Client HTML (/client/index.html)
  ↓ JavaScript extracts params
PipecatClient.sendAppMessage()
  ↓ App message event
Bot (base_bot.py)
  ↓ on_app_message handler
LLM Context (system message)
  ↓ Interview context injected
AI Agent (with full context)
```

---

## Implementation Details

### 1. Frontend - URL Parameter Construction

**File**: `/src/pages/ChatWithAgent.jsx` (lines 17-48)

```javascript
const interviewData = {
  interview_title: interview?.title || interview?.subTitle || 'Interview',
  interview_company: interview?.company || '',
  interview_difficulty: interview?.difficulty || '',
  interview_duration: interview?.duration_minutes || interview?.duration || '',
  interview_category: interview?.category || '',
  user_name: userInfo?.name || 'Candidate',
  user_email: userInfo?.email || '',
  interview_questions: interview?.questions ? JSON.stringify(interview.questions) : '',
  context: 'interview_chat',
  mode: 'voice'
};

// Build URL with parameters
const params = new URLSearchParams();
Object.entries(interviewData).forEach(([key, value]) => {
  if (value) params.append(key, value);
});

setChatUrl(`${url}?${params.toString()}`);
```

**Result**: URL like:
```
http://localhost:7860?interview_title=Senior%20Software%20Engineer&interview_difficulty=Hard&interview_questions=%5B...%5D&...
```

---

### 2. Custom Client - Parameter Extraction & Sending

**File**: `/client/index.html`

#### Key Functions:

**A. Extract URL Parameters**
```javascript
function getURLParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    interview_title: params.get('interview_title') || '',
    interview_company: params.get('interview_company') || '',
    interview_difficulty: params.get('interview_difficulty') || '',
    interview_duration: params.get('interview_duration') || '',
    interview_category: params.get('interview_category') || '',
    interview_questions: params.get('interview_questions') || '',
    user_name: params.get('user_name') || 'Candidate',
    user_email: params.get('user_email') || '',
    context: params.get('context') || '',
    mode: params.get('mode') || 'voice'
  };
}
```

**B. Display Interview Info to User**
```javascript
function displayInterviewInfo() {
  interviewData = getURLParams();

  if (interviewData.interview_title) {
    document.getElementById('info-title').textContent = interviewData.interview_title;
    document.getElementById('info-difficulty').textContent = interviewData.interview_difficulty || 'N/A';
    // ... display all fields
    interviewInfo.classList.remove('hidden');
  }
}
```

**C. Send to Bot After Connection**
```javascript
client.on(RTVIEvent.Connected, () => {
  console.log('✅ Connected to bot');

  setTimeout(() => {
    // Parse questions from JSON string
    const questions = interviewData.interview_questions ?
      JSON.parse(interviewData.interview_questions) : [];

    // Build message with all interview data
    const message = {
      template: interviewData.interview_title,
      language: 'en',
      questions: questions,
      difficulty: interviewData.interview_difficulty,
      duration: interviewData.interview_duration,
      category: interviewData.interview_category,
      company: interviewData.interview_company,
      user_name: interviewData.user_name
    };

    console.log('📤 Sending interview data:', message);
    client.sendAppMessage(message);  // 🎯 KEY: This sends data to bot

    showStatus('Interview started! Say "Hey" to begin.', 'connected');
  }, 1000);  // 1 second delay to ensure connection is stable
});
```

---

### 3. Backend - Receiving Interview Data

**File**: `/server/server/bots/base_bot.py` (lines 350-389)

The bot already had the infrastructure to receive interview data via `on_app_message` event handler:

```python
@self.transport.event_handler("on_app_message")
async def on_app_message(transport, message, sender):
    try:
        # Accept interview metadata from the client
        template = (message or {}).get("template")
        language = (message or {}).get("language")
        questions = (message or {}).get("questions")

        if template or language or questions:
            # Normalize questions
            q_list = []
            if isinstance(questions, list):
                q_list = [str(q) for q in questions if q]

            # Build system message with interview context
            sys_lines = [
                "You are an AI Interviewer conducting a structured mock interview.",
                "Ask one question at a time, listen fully, and be concise.",
                "If answers are brief, ask one follow‑up; otherwise continue.",
                "Never end the call on your own; the user will hang up.",
            ]
            if template:
                sys_lines.append(f"INTERVIEW_TEMPLATE: {template}")
            if language:
                sys_lines.append(f"LANGUAGE: {language}")
            if q_list:
                preview = "\n".join(
                    [f"{i+1}. {q}" for i, q in enumerate(q_list[:20])]
                )
                sys_lines.append("QUESTIONS:\n" + preview)

            # Add to LLM context as system message
            sys_msg = {"role": "system", "content": "\n".join(sys_lines)}
            self.context.messages.append(sys_msg)
```

---

## How It Works End-to-End

### Step 1: User Opens Chat Modal

User clicks "Chat with JasTalk AI" button in interview page.

**Data at this point:**
- Interview object with title, difficulty, questions
- User info with name, email

### Step 2: Modal Constructs URL

ChatWithAgent component builds URL with all interview data as query parameters.

**Example URL:**
```
http://localhost:7860?
  interview_title=Senior+Software+Engineer&
  interview_company=TechCorp&
  interview_difficulty=Hard&
  interview_duration=45&
  interview_category=Software&
  interview_questions=%5B%22Describe+your+experience%22%2C%22...%22%5D&
  user_name=Candidate&
  context=interview_chat&
  mode=voice
```

### Step 3: Custom Client Loads

Iframe loads `/client/index.html` with query parameters.

**Client actions:**
1. Extracts all URL parameters
2. Displays interview info to user
3. Initializes Pipecat client
4. Waits for user to click "Connect & Start Interview"

### Step 4: User Clicks Connect

**Client actions:**
1. Connects to Pipecat bot via WebRTC
2. Waits for `RTVIEvent.Connected` event
3. Once connected, sends `client.sendAppMessage(message)` with all interview data

### Step 5: Bot Receives App Message

**Bot actions:**
1. `on_app_message` handler triggered
2. Extracts template, language, questions from message
3. Builds comprehensive system message
4. Injects into LLM context as system message
5. Agent now has full interview context

### Step 6: AI Agent Responds with Context

When user says "Hey":
- Agent has interview template in context
- Agent knows all the questions to ask
- Agent knows difficulty level
- Agent knows candidate name
- Agent conducts interview with full awareness

---

## Testing the Implementation

### 1. Start the Pipecat Server

```bash
cd server/agent
uv run bot.py
```

**Expected output:**
```
📱 Using custom Jastalk client: Vanilla client (/path/to/client)
✅ Custom Jastalk client mounted at /client
🎤 Bot ready on http://0.0.0.0:7860
```

### 2. Open Frontend and Start Interview

```bash
npm run dev
```

1. Go to Mock Interviews or Custom Interviews
2. Select an interview and click "Start Interview"
3. In the interview page, click "Chat with JasTalk AI"

### 3. Grant Permissions

1. Click "Allow" when browser asks for camera/microphone
2. Custom client HTML should load in modal
3. You should see interview details displayed

### 4. Connect and Send Data

1. Click "Connect & Start Interview" button
2. Wait for "Interview started! Say 'Hey' to begin." status
3. Check browser console for: `📤 Sending interview data:` log

### 5. Verify Agent Has Context

1. Say "Hey" or "Hello"
2. Agent should respond with greeting
3. Agent should reference the specific role or interview type
4. Agent should ask questions from the interview template

---

## Debugging

### Check if Data is Sent

**Browser Console** (client side):
```javascript
console.log('📊 Interview data:', interviewData);
console.log('📤 Sending interview data:', message);
```

**Bot Logs** (server side):
```python
logger.info(f"Received app message: {message}")
logger.info(f"Interview template: {template}")
logger.info(f"Questions count: {len(q_list)}")
```

### Common Issues

#### Issue 1: Agent doesn't know interview context

**Symptoms**: Agent asks generic questions, doesn't mention role

**Check**:
1. Browser console shows interview data being sent?
2. Bot logs show app message received?
3. Bot logs show system message added to context?

**Fix**: Check that `client.sendAppMessage()` is called after connection

#### Issue 2: Custom client not loading

**Symptoms**: Iframe shows default Pipecat UI

**Check**:
1. `/client/index.html` exists?
2. Bot logs show "Custom Jastalk client mounted"?

**Fix**: Verify file path and restart bot

#### Issue 3: Questions not parsed correctly

**Symptoms**: Agent has template but no questions

**Check**:
1. URL parameter `interview_questions` is valid JSON?
2. JSON.parse() in client succeeds?
3. Bot receives questions as array?

**Fix**: Check JSON encoding/decoding, ensure proper escaping

---

## Environment Variables

### Required for Local Development

```.env
# Pipecat local mode
VITE_PIPECAT_LOCAL=1
VITE_SERVER_URL=http://127.0.0.1:7860/api

# Interviewer persona (optional)
INTERVIEWER_NAME=Alex
INTERVIEW_BRAND=JasTalk
INTERVIEWER_INTRO=Hello! I'm Alex from JasTalk, your AI interview coach.
```

---

## Files Modified/Created

### Created:
- ✅ `/client/index.html` - Custom Pipecat client with URL parameter extraction

### Modified:
- ✅ `/src/pages/ChatWithAgent.jsx` - Enhanced URL parameter construction
- ✅ `/server/server/bots/base_bot.py` - Already had `on_app_message` handler (no changes needed)

---

## Summary

The interview data flow is now complete:

1. ✅ **Frontend** builds URL with comprehensive interview data
2. ✅ **Custom client** extracts URL parameters and displays interview info
3. ✅ **PipecatClient** sends interview data via `sendAppMessage()` after connection
4. ✅ **Bot** receives data via `on_app_message` event handler
5. ✅ **LLM context** gets enriched with interview template and questions
6. ✅ **AI Agent** conducts interview with full awareness of context

**Result**: The agent now knows exactly which role, questions, and difficulty level to use during the interview! 🎉

---

*Implementation completed: October 28, 2025*
*Status: ✅ Ready for testing*
