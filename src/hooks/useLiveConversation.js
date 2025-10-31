import { useState, useRef, useCallback, useEffect } from 'react';
import { ai } from '../services/geminiService';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { Modality } from '@google/genai';

const PRIMING_MESSAGE = "Start speaking immediately. Introduce yourself as JasTalk AI and begin with the first interview question.";

export const useLiveConversation = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState([]);

  const sessionPromiseRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set());
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const displayedInputRef = useRef('');
  const displayedOutputRef = useRef('');
  const lastInputUpdateRef = useRef(0);
  const lastOutputUpdateRef = useRef(0);

  const mergeChunk = (current, chunk) => {
    if (!chunk) return current || '';
    if (!current) return chunk;
    // If the new chunk already exists within current, ignore it
    if (current.includes(chunk) && chunk.length <= current.length) return current;
    // If the chunk is an extension of current, replace with chunk
    if (chunk.startsWith(current)) return chunk;
    // Find the largest overlap between end of current and start of chunk
    const max = Math.min(current.length, chunk.length);
    for (let k = max; k > 0; k--) {
      if (current.slice(-k) === chunk.slice(0, k)) {
        return current + chunk.slice(k);
      }
    }
    return current + chunk;
  };

  const cleanupAudio = useCallback(() => {
    console.log("Cleaning up audio resources...");
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    if (inputAudioContextRef.current?.state !== 'closed') {
      inputAudioContextRef.current?.close().catch(console.error);
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current?.state !== 'closed') {
      outputAudioContextRef.current?.close().catch(console.error);
    }
    outputAudioContextRef.current = null;
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
  }, []);

  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    cleanupAudio();
    setIsSessionActive(false);
  }, [cleanupAudio]);

  const startConversation = useCallback(async (systemInstruction, videoMode = false) => {
    if (isSessionActive) return;

    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      const constraints = {
        audio: true,
        video: videoMode ? { width: 640, height: 480 } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Set up video display if in video mode
      if (videoMode && stream.getVideoTracks().length > 0) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const localVideo = document.getElementById('localVideo');
          if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.play().catch(err => {
              console.warn('Error playing local video:', err);
            });
          }
        }, 100);
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("This browser does not support the Web Audio API, which is required for live conversation.");
      }

      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Session opened.");
            setIsConnecting(false);
            setIsSessionActive(true);
            
            // Send a priming text message to make the AI agent speak first.
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ text: PRIMING_MESSAGE });
            });

            inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message) => {
            // Stream input transcription (user)
            if (message.serverContent?.inputTranscription) {
              const chunk = message.serverContent.inputTranscription.text || '';
              // Build a stable progressive string
              currentInputTranscriptionRef.current = mergeChunk(currentInputTranscriptionRef.current, chunk);
              const now = Date.now();
              if (now - lastInputUpdateRef.current > 80) {
                lastInputUpdateRef.current = now;
                const full = currentInputTranscriptionRef.current;
                setTranscript(prev => {
                  const arr = [...prev];
                  const last = arr[arr.length - 1];
                  if (last && last.speaker === 'user' && !last.isFinal) {
                    last.text = full;
                  } else if (full.trim() && full !== PRIMING_MESSAGE) {
                    arr.push({ speaker: 'user', text: full, isFinal: false });
                  }
                  return arr;
                });
                displayedInputRef.current = full;
              }
            }

            // Stream output transcription (model)
            if (message.serverContent?.outputTranscription) {
              const chunk = message.serverContent.outputTranscription.text || '';
              currentOutputTranscriptionRef.current = mergeChunk(currentOutputTranscriptionRef.current, chunk);
              const now = Date.now();
              if (now - lastOutputUpdateRef.current > 80) {
                lastOutputUpdateRef.current = now;
                const full = currentOutputTranscriptionRef.current;
                setTranscript(prev => {
                  const arr = [...prev];
                  const last = arr[arr.length - 1];
                  if (last && last.speaker === 'model' && !last.isFinal) {
                    last.text = full;
                  } else if (full.trim()) {
                    arr.push({ speaker: 'model', text: full, isFinal: false });
                  }
                  return arr;
                });
                displayedOutputRef.current = full;
              }
            }

            // When a turn completes, mark the ongoing segments as final and reset buffers
            if (message.serverContent?.turnComplete) {
              setTranscript(prev => prev.map(t => (t.isFinal ? t : { ...t, isFinal: true })));
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              displayedInputRef.current = '';
              displayedOutputRef.current = '';
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const outputAudioContext = outputAudioContextRef.current;
              try {
                if (outputAudioContext.state === 'suspended') {
                  await outputAudioContext.resume();
                }
                const rawAudioData = decode(base64Audio);
                if (rawAudioData.length === 0) return;

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

                const audioBuffer = await decodeAudioData(rawAudioData, outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);

                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              } catch (playbackError) {
                console.error("Error processing or playing live audio chunk:", playbackError);
                setError("A playback error occurred. The audio stream may be interrupted.");
                // Reset playback queue to prevent cascading errors
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            }
            
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(source => source.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Session error:", e);
            setError(`Session error: ${e.message}`);
            setIsConnecting(false);
            setIsSessionActive(false);
            cleanupAudio();
          },
          onclose: () => {
            console.log("Session closed.");
            setIsSessionActive(false);
            cleanupAudio();
          },
        },
        config: {
          responseModalities: videoMode && Modality.VIDEO ? [Modality.AUDIO, Modality.VIDEO] : [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
      });

    } catch (err) {
      console.error("Failed to start conversation:", err);
      
      // Provide specific error message for video mode issues
      let errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while setting up the conversation.';
      if (videoMode && (errorMessage.includes('video') || errorMessage.includes('Video'))) {
        errorMessage = 'Video mode is not yet fully supported by the AI model. Please try Audio mode for the best experience.';
      }
      
      setError(errorMessage);
      setIsConnecting(false);
      cleanupAudio();
    }
  }, [isSessionActive, cleanupAudio]);

  useEffect(() => {
    return () => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isConnecting,
    isSessionActive,
    error,
    transcript,
    startConversation,
    stopConversation,
  };
};
