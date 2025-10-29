import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, ExternalLink, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const ChatWithAgent = ({ interview, userInfo, onClose, t }) => {
  const [chatUrl, setChatUrl] = useState('');
  const [isEmbedded, setIsEmbedded] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ mic: 'prompt', camera: 'prompt' });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    // Determine chat URL based on environment
    const PIPECAT_LOCAL = import.meta.env.VITE_PIPECAT_LOCAL === '1';
    const DAILY_CLOUD_URL = import.meta.env.VITE_DAILY_CLOUD_URL || 'https://cloud-1ed6ae37ec654b7ebe32b037fd7c1598.daily.co/hDlT5AA6HrLDmqtdgBLo';
    const LOCAL_URL = import.meta.env.VITE_SERVER_URL?.replace('/api', '') || 'http://0.0.0.0:7860';

    const url = PIPECAT_LOCAL ? LOCAL_URL : DAILY_CLOUD_URL;

    // Prepare comprehensive interview data for the agent
    const interviewData = {
      // Basic interview info
      interview_title: interview?.title || interview?.subTitle || 'Interview',
      interview_company: interview?.company || '',
      interview_difficulty: interview?.difficulty || '',
      interview_duration: interview?.duration_minutes || interview?.duration || '',
      interview_category: interview?.category || '',

      // User information
      user_name: userInfo?.name || 'Candidate',
      user_email: userInfo?.email || '',

      // Interview questions (as JSON string)
      interview_questions: interview?.questions ? JSON.stringify(interview.questions) : '',

      // Context
      context: 'interview_chat',
      mode: 'voice'
    };

    // Remove empty values
    const params = new URLSearchParams();
    Object.entries(interviewData).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    setChatUrl(`${url}?${params.toString()}`);
  }, [interview, userInfo]);

  const handleOpenExternal = () => {
    window.open(chatUrl, '_blank', 'noopener,noreferrer');
  };

  // Request microphone and camera permissions
  const requestPermissions = async () => {
    setIsRequestingPermissions(true);
    try {
      const constraints = {
        audio: true,
        video: cameraEnabled || true // Request camera by default
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      setMicEnabled(true);
      setCameraEnabled(true);
      setPermissionStatus({ mic: 'granted', camera: 'granted' });

      // Note: We don't need to show the stream here, the iframe will handle it
      // But we keep the stream active so permissions are granted
    } catch (error) {
      console.error('Permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionStatus({
          mic: 'denied',
          camera: 'denied'
        });
      }
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  // Toggle microphone
  const toggleMic = async () => {
    if (!micEnabled && !mediaStreamRef.current) {
      await requestPermissions();
    } else if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (!cameraEnabled && !mediaStreamRef.current) {
      await requestPermissions();
    } else if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !cameraEnabled;
      });
      setCameraEnabled(!cameraEnabled);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Chat with JasTalk AI Agent
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time conversation assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Open in new window"
            >
              <ExternalLink size={18} />
              <span className="text-sm font-medium">Open External</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Interview Context Info */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Interview:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {interview?.title || interview?.subTitle || 'N/A'}
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

        {/* Start Instruction Banner with Media Controls */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">👋</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                🎯 How to Enable Camera & Microphone
              </h3>
              <div className="space-y-2 mb-3">
                <p className="text-sm text-gray-700">
                  <strong className="text-orange-600">IMPORTANT:</strong> The chat will ask for permissions when it loads below. Look for the browser popup and <strong>click "Allow"</strong>.
                </p>
                <div className="bg-white border-2 border-orange-300 rounded-lg p-3 mt-2">
                  <p className="text-sm font-semibold text-gray-900 mb-2">📸 When you see the permission prompt:</p>
                  <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
                    <li>Click the <strong className="text-green-700">"Allow"</strong> button in your browser</li>
                    <li>If asked, select <strong className="text-blue-700">"Always allow"</strong> for this site</li>
                    <li>Wait for the chat to connect (you'll see your video)</li>
                    <li>Begin by saying <strong className="text-green-700">"Hey"</strong> to start chatting with the <strong className="text-purple-700">AI Agent</strong>, then share which <strong className="text-orange-700">role</strong> you're interested in</li>
                  </ol>
                </div>
              </div>

              {/* Troubleshooting Section */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900 font-semibold mb-1">🔧 Troubleshooting:</p>
                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                  <li>If you don't see a permission prompt, look for a camera icon 📷 in your browser's address bar</li>
                  <li>Click the icon and select "Allow" for camera and microphone</li>
                  <li>If blocked, you may need to reload the page after allowing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface Toggle */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View Mode:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEmbedded(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isEmbedded
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Embedded
            </button>
            <button
              onClick={() => setIsEmbedded(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isEmbedded
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Direct Link
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {isEmbedded ? (
            <iframe
              src={chatUrl}
              className="w-full h-full border-0"
              allow="camera *; microphone *; autoplay; display-capture; speaker-selection"
              title="JasTalk AI Agent Chat"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
              <MessageCircle size={64} className="text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Open Chat in New Window</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                For the best experience, open the chat in a separate window with full permissions for camera and microphone.
              </p>
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <ExternalLink size={20} />
                Open Chat Window
              </button>
              <p className="text-xs text-gray-500 mt-4">URL: {chatUrl}</p>
            </div>
          )}
        </div>

        {/* Footer with Tips */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-sm font-bold">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
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

export default ChatWithAgent;
