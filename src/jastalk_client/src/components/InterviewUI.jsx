import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  usePipecatClient,
  useRTVIClientEvent,
  usePipecatClientMediaDevices,
  usePipecatClientTransportState,
  usePipecatClientCamControl,
  usePipecatClientMicControl,
  usePipecatClientMediaTrack
} from '@pipecat-ai/client-react';
import { RTVIEvent } from '@pipecat-ai/client-js';

// Sub-components
import Header from './Header';
import StatusCard from './StatusCard';
import ConversationPanel from './ConversationPanel';
import MetricsPanel from './MetricsPanel';
import DevicesPanel from './DevicesPanel';
import SessionControls from './SessionControls';

function InterviewUI() {
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const templateName = urlParams.get('template') || '';
  const initialLanguage = urlParams.get('language') || 'en';
  const questionsParam = urlParams.get('questions') || '';
  const questions = questionsParam ? questionsParam.split('\n').filter(q => q.trim()) : [];

  // Pipecat hooks
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const { enableCam, isCamEnabled } = usePipecatClientCamControl();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  const {
    availableCams,
    availableMics,
    selectedCam,
    selectedMic,
    updateCam,
    updateMic
  } = usePipecatClientMediaDevices();

  // Get media tracks
  const localAudioTrack = usePipecatClientMediaTrack('audio', 'local');
  const botAudioTrack = usePipecatClientMediaTrack('audio', 'bot');

  // Local state
  const [language, setLanguage] = useState(initialLanguage);
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [metrics, setMetrics] = useState({
    latency: 0,
    packetsLost: 0,
    jitter: 0,
    bitrate: 0,
    duration: 0
  });
  const [sessionStatus, setSessionStatus] = useState({
    connected: false,
    botReady: false,
    error: null
  });
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDevices, setShowDevices] = useState(false);

  const audioRef = useRef(null);
  const metricsIntervalRef = useRef(null);

  // Event handlers using RTVI hooks
  const handleConnected = useCallback(() => {
    console.log('✅ Connected to bot');
    setSessionStatus(prev => ({ ...prev, connected: true }));

    // Send initial app message with interview details
    setTimeout(() => {
      try {
        client.sendAppMessage({
          template: templateName,
          language: language,
          questions: questions
        });
      } catch (error) {
        console.error('Failed to send app message:', error);
      }
    }, 500);
  }, [client, templateName, language, questions]);

  const handleDisconnected = useCallback(() => {
    console.log('❌ Disconnected from bot');
    setSessionStatus(prev => ({ ...prev, connected: false, botReady: false }));
    setIsSpeaking(false);
    setIsListening(false);
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, []);

  const handleBotReady = useCallback(() => {
    console.log('🤖 Bot is ready');
    setSessionStatus(prev => ({ ...prev, botReady: true }));
  }, []);

  const handleUserTranscript = useCallback((data) => {
    console.log('🎤 User transcript:', data);
    if (data.text && data.text.trim()) {
      setMessages(prev => [...prev, {
        role: 'user',
        text: data.text,
        timestamp: new Date().toISOString(),
        isFinal: data.final || false
      }]);
    }
  }, []);

  const handleBotTranscript = useCallback((data) => {
    console.log('🤖 Bot transcript:', data);
    if (data.text && data.text.trim()) {
      setMessages(prev => {
        // Update last bot message if it's not final, otherwise add new
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.isFinal) {
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, text: data.text, isFinal: data.final || false }
          ];
        }
        return [...prev, {
          role: 'assistant',
          text: data.text,
          timestamp: new Date().toISOString(),
          isFinal: data.final || false
        }];
      });
    }
  }, []);

  const handleUserStartedSpeaking = useCallback(() => {
    console.log('🎤 User started speaking');
    setIsListening(true);
  }, []);

  const handleUserStoppedSpeaking = useCallback(() => {
    console.log('🎤 User stopped speaking');
    setIsListening(false);
  }, []);

  const handleBotStartedSpeaking = useCallback(() => {
    console.log('🗣️ Bot started speaking');
    setIsSpeaking(true);
  }, []);

  const handleBotStoppedSpeaking = useCallback(() => {
    console.log('🗣️ Bot stopped speaking');
    setIsSpeaking(false);
  }, []);

  const handleMetrics = useCallback((data) => {
    console.log('📊 Metrics:', data);
    if (data.metrics) {
      setMetrics(prev => ({ ...prev, ...data.metrics }));
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('❌ Error:', error);
    setSessionStatus(prev => ({
      ...prev,
      error: error.message || 'An error occurred'
    }));
  }, []);

  // Register event listeners
  useRTVIClientEvent(RTVIEvent.Connected, handleConnected);
  useRTVIClientEvent(RTVIEvent.Disconnected, handleDisconnected);
  useRTVIClientEvent(RTVIEvent.BotReady, handleBotReady);
  useRTVIClientEvent(RTVIEvent.UserTranscript, handleUserTranscript);
  useRTVIClientEvent(RTVIEvent.BotTranscript, handleBotTranscript);
  useRTVIClientEvent(RTVIEvent.UserStartedSpeaking, handleUserStartedSpeaking);
  useRTVIClientEvent(RTVIEvent.UserStoppedSpeaking, handleUserStoppedSpeaking);
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, handleBotStartedSpeaking);
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, handleBotStoppedSpeaking);
  useRTVIClientEvent(RTVIEvent.Metrics, handleMetrics);
  useRTVIClientEvent(RTVIEvent.Error, handleError);

  // Handle bot audio track
  useEffect(() => {
    if (botAudioTrack && audioRef.current) {
      const stream = new MediaStream([botAudioTrack]);
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
    }
  }, [botAudioTrack]);

  // Start metrics collection when connected
  useEffect(() => {
    if (sessionStatus.connected && !metricsIntervalRef.current) {
      metricsIntervalRef.current = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    }

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  }, [sessionStatus.connected]);

  // Connect/Disconnect handlers
  const handleConnect = useCallback(async () => {
    try {
      await client.connect();
    } catch (error) {
      console.error('Connection failed:', error);
      setSessionStatus(prev => ({
        ...prev,
        error: error.message || 'Connection failed'
      }));
    }
  }, [client]);

  const handleDisconnect = useCallback(() => {
    try {
      client.disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [client]);

  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    if (sessionStatus.connected) {
      try {
        client.sendClientMessage('language-change', { language: newLang });
      } catch (error) {
        console.error('Failed to send language change:', error);
      }
    }
  }, [client, sessionStatus.connected]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden audio element for bot audio */}
      <audio ref={audioRef} autoPlay playsInline />

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <Header
          templateName={templateName}
          questionCount={questions.length}
          language={language}
          onLanguageChange={handleLanguageChange}
        />

        {/* Status Card */}
        <StatusCard
          transportState={transportState}
          sessionStatus={sessionStatus}
          isSpeaking={isSpeaking}
          isListening={isListening}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Session Controls & Devices */}
          <div className="space-y-6">
            <SessionControls
              isConnected={sessionStatus.connected}
              isMicEnabled={isMicEnabled}
              isCamEnabled={isCamEnabled}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onToggleMic={() => enableMic(!isMicEnabled)}
              onToggleCam={() => enableCam(!isCamEnabled)}
              onToggleMetrics={() => setShowMetrics(!showMetrics)}
              onToggleDevices={() => setShowDevices(!showDevices)}
            />

            {showDevices && (
              <DevicesPanel
                availableCams={availableCams}
                availableMics={availableMics}
                selectedCam={selectedCam}
                selectedMic={selectedMic}
                onUpdateCam={updateCam}
                onUpdateMic={updateMic}
              />
            )}

            {showMetrics && (
              <MetricsPanel metrics={metrics} />
            )}
          </div>

          {/* Right Column - Conversation */}
          <div className="lg:col-span-2">
            <ConversationPanel
              messages={messages}
              isConnected={sessionStatus.connected}
              isSpeaking={isSpeaking}
              isListening={isListening}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewUI;
