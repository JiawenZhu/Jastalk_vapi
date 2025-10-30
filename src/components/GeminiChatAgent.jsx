import React, { useState, useEffect, useRef } from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';
import { Mic, MicOff, Download, Video, VideoOff } from 'lucide-react';

const GeminiChatAgent = ({ interview, userInfo, onClose, t }) => {
  const [videoMode, setVideoMode] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const videoTranscriptRef = useRef(null);
  
  const {
    isConnecting,
    isSessionActive,
    error,
    transcript,
    startConversation,
    stopConversation,
  } = useLiveConversation();

  // Create interview-specific system instruction
  const createSystemInstruction = () => {
    const interviewQuestions = interview?.questions || [];
    const firstQuestion = interviewQuestions.length > 0 ? interviewQuestions[0] : '';
    const questionsText = interviewQuestions.length > 0 
      ? `The interview questions are: ${interviewQuestions.join('; ')}`
      : '';

    return `You are JasTalk AI, an expert interview coach helping ${userInfo?.name || 'the candidate'} prepare for their ${interview?.title || 'interview'} at ${interview?.company || 'the company'}.

**Interview Context:**
- Position: ${interview?.title || 'Not specified'}
- Company: ${interview?.company || 'Not specified'}
- Difficulty: ${interview?.difficulty || 'Not specified'}
- Duration: ${interview?.duration_minutes || interview?.duration || 'Not specified'} minutes
${questionsText}

**Your Role:**
- Conduct a practice interview session
- Help the candidate practice their answers and build confidence
- Provide specific, actionable feedback on their responses
- Ask follow-up questions to help them think deeper
- Suggest improvements for clarity, impact, and relevance
- Use frameworks like STAR (Situation, Task, Action, Result) when appropriate
- Be encouraging and supportive while maintaining professionalism

**CRITICAL: YOU MUST SPEAK FIRST**
As soon as the conversation begins, immediately start speaking with this exact introduction:
"Hello! I'm JasTalk AI, your interview coach. I'm here to help you prepare for your ${interview?.title || 'interview'} position${interview?.company ? ` at ${interview.company}` : ''}. 

I'll be conducting a ${videoMode ? 'video interview' : 'voice interview'} practice session with you today. We'll go through the questions one by one, and I'll provide feedback to help you improve your responses.

Let's begin with the first question: ${firstQuestion}"

DO NOT wait for the user to speak first. YOU must initiate the conversation immediately.

**Your Approach After Opening:**
- Wait for their answer to the first question
- Listen actively to their responses
- Provide constructive feedback with specific suggestions
- Help them structure better answers using frameworks like STAR
- Ask follow-up questions when appropriate
- After they've practiced the first question sufficiently, move to the next question
- Keep responses concise to encourage dialogue
- Be their supportive interview practice partner

**Your Personality:**
- Professional yet warm and encouraging
- Knowledgeable about interview best practices
- Focused on building their confidence
- Patient and supportive

IMPORTANT INSTRUCTIONS:
1. YOU SPEAK FIRST - Do not wait for user input
2. Start IMMEDIATELY with the introduction and first question 
3. Begin speaking as soon as the conversation session opens
4. The user should hear you talking first, not silence

Begin now with your introduction and first question.`;
  };

  const handleStartConversation = async () => {
    const systemInstruction = createSystemInstruction();
    
    if (videoMode) {
      try {
        // Request video permissions and set up stream before starting conversation
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { width: 640, height: 480 } 
        });
        setVideoStream(stream);
        
        // Set video stream to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to get video stream:', err);
        // Fall back to audio mode if video fails
        setVideoMode(false);
      }
    }
    
    startConversation(systemInstruction, videoMode);
  };
  
  // Clean up video stream when component unmounts or video mode changes
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);
  
  // Handle video mode changes
  useEffect(() => {
    if (!videoMode && videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  }, [videoMode, videoStream]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Auto-scroll for regular chat view
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-scroll for video transcript overlay (scroll to bottom)
    if (videoTranscriptRef.current) {
      videoTranscriptRef.current.scrollTop = videoTranscriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleSaveTranscript = () => {
    if (transcript.length === 0) return;

    const userName = userInfo?.name || 'Candidate';
    const transcriptText = transcript
      .map(entry => {
        const speaker = entry.speaker === 'model' ? 'JasTalk Interviewer' : userName;
        return `${speaker}: ${entry.text}`;
      })
      .join('\n\n');

    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-practice-${interview?.title || 'session'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Chat with JasTalk AI Agent
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time conversation assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Interview Mode:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVideoMode(false)}
                disabled={isSessionActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !videoMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                } ${isSessionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mic className="w-4 h-4" />
                Audio Only
              </button>
              <button
                onClick={() => setVideoMode(true)}
                disabled={isSessionActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  videoMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                } ${isSessionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Video className="w-4 h-4" />
                Video Call
              </button>
            </div>
          </div>
        </div>

        {/* Interview Context */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Interview:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {interview?.title || 'N/A'}
              </span>
            </div>
            {interview?.company && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Company:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{interview.company}</span>
              </div>
            )}
            {interview?.difficulty && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Difficulty:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  interview.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                  interview.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {interview.difficulty}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">👋</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                🎯 AI Interview Coach Ready
              </h3>
              <p className="text-sm text-gray-700">
                <strong className="text-green-600">Click "Start Conversation"</strong> and the AI coach will immediately introduce herself and ask the first question. 
                {videoMode ? (
                  <span className="block mt-1 text-blue-600">
                    📹 Video mode: Your camera will be enabled for a face-to-face interview experience.
                    <span className="block text-xs text-amber-600 mt-1">⚠️ Note: Video mode is experimental and may fall back to audio-only.</span>
                  </span>
                ) : (
                  <span className="block mt-1">
                    🎤 Audio mode: Voice-only conversation for focused interview practice.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className={`h-full rounded-lg border border-gray-200 dark:border-gray-700 ${videoMode ? 'bg-black' : 'bg-gray-50 dark:bg-gray-900'}`}>
            {videoMode ? (
              <div className="h-full flex flex-col">
                {/* Video Preview Area */}
                <div className="flex-1 relative">
                  {videoStream || isSessionActive ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-t-lg">
                      <div className="text-center text-white">
                        <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">Video Preview</p>
                        <p className="text-sm opacity-75">Camera will activate when you start the conversation</p>
                      </div>
                    </div>
                  )}
                  
                  {isSessionActive && (
                    <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded-lg border-2 border-white">
                      <video
                        id="remoteVideo"
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
                
                {/* Video Transcript Overlay */}
                {isSessionActive && (
                  <div className="h-32 bg-black bg-opacity-75 p-4 overflow-y-auto" ref={videoTranscriptRef}>
                    <div className="space-y-2">
                      {transcript.slice(-2).map((entry, index) => {
                        const userName = userInfo?.name || 'You';
                        const displayName = entry.speaker === 'user' ? userName : 'JasTalk Interviewer';
                        
                        return (
                          <div key={index} className="text-white text-sm">
                            <span className="font-semibold">{displayName}:</span> {entry.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Video Mode Instructions when not active */}
                {!isSessionActive && (
                  <div className="h-24 bg-black bg-opacity-50 p-4 flex items-center justify-center">
                    <p className="text-white text-center">
                      <Video className="w-5 h-5 inline mr-2" />
                      Video interview mode ready. Click "Start Video Call" to begin.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full p-4 overflow-y-auto flex flex-col gap-4">
                {transcript.length === 0 && !isSessionActive && (
                  <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400 text-center px-4">
                    <div>
                      <div className="text-6xl mb-4">🎯</div>
                      <p className="text-lg font-medium mb-2">Ready to practice your interview?</p>
                      <p className="text-sm">Click "Start Conversation" and begin speaking with your AI interview coach.</p>
                    </div>
                  </div>
                )}
                
                {transcript.length === 0 && isSessionActive && (
                  <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400 text-center px-4">
                    <div>
                      <div className="text-6xl mb-4 animate-pulse">👂</div>
                      <p className="text-lg font-medium">Listening...</p>
                      <p className="text-sm">Your AI coach is ready. Start speaking!</p>
                    </div>
                  </div>
                )}

                {transcript.map((entry, index) => {
                  const userName = userInfo?.name || 'You';
                  const displayName = entry.speaker === 'user' ? userName : 'JasTalk Interviewer';
                  
                  return (
                    <div key={index} className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        entry.speaker === 'user' 
                          ? 'bg-purple-500 text-white rounded-br-none' 
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none shadow-md'
                      }`}>
                        <p className="text-sm">{entry.text}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {displayName}
                      </p>
                    </div>
                  );
                })}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-center text-sm">
            <p>{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="px-6 pb-6">
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={isSessionActive ? stopConversation : handleStartConversation}
              disabled={isConnecting}
              className={`group relative flex items-center justify-center h-16 flex-grow px-8 py-4 text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg text-lg ${
                isConnecting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isSessionActive
                  ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-xl hover:scale-105'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105'
              }`}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span>Connecting...</span>
                </>
              ) : isSessionActive ? (
                <>
                  {videoMode ? <VideoOff className="h-6 w-6 mr-3" /> : <MicOff className="h-6 w-6 mr-3" />}
                  <span>Stop {videoMode ? 'Video' : 'Audio'} Call</span>
                </>
              ) : (
                <>
                  {videoMode ? <Video className="h-6 w-6 mr-3" /> : <Mic className="h-6 w-6 mr-3" />}
                  <span>Start {videoMode ? 'Video' : 'Audio'} Call</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSaveTranscript}
              disabled={transcript.length === 0 || isSessionActive}
              aria-label="Save conversation transcript"
              className="group relative flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ease-in-out bg-gray-200 dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-gray-300 dark:enabled:hover:bg-gray-600"
            >
              <Download className="h-6 w-6 text-gray-600 dark:text-gray-300 group-enabled:group-hover:text-gray-900 dark:group-enabled:group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Footer Tip */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-bold">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Tip:</strong> Use the AI agent to practice your answers, get instant feedback, or ask questions about the interview process.
                The agent has full context of your interview.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatAgent;