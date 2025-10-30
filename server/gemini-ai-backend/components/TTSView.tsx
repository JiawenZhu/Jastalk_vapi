import React, { useState, useRef, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData, createWavBlob } from '../utils/audioUtils';
import { AVAILABLE_VOICES } from '../constants';
import type { Voice } from '../types';
import VoiceSelector from './VoiceSelector';
import Spinner from './Spinner';
import { SpeakerIcon, StopIcon, DownloadIcon } from './icons/PlaybackIcons';

const TTSView: React.FC = () => {
  const [text, setText] = useState<string>('Hello! I am a friendly AI assistant powered by Gemini. You can type any text here and I will read it aloud for you.');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(AVAILABLE_VOICES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null; // Prevent onended from firing on manual stop
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate speech.');
      return;
    }
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioData(null);
    stopPlayback(); // Ensure any previous state is cleared

    try {
      const base64Audio = await generateSpeech(text, selectedVoice.id);

      if (!base64Audio) {
        throw new Error('API did not return audio data.');
      }
      
      const rawAudioData = decode(base64Audio);
      if (rawAudioData.length === 0) {
        throw new Error("Received empty audio data. Please try a different text or voice.");
      }
      setAudioData(rawAudioData);
      
      if (!audioContextRef.current) {
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         if (!AudioContextClass) {
            throw new Error("This browser does not support the Web Audio API, which is required for audio playback.");
         }
         audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audioBuffer = await decodeAudioData(
        rawAudioData,
        audioContext,
        24000,
        1,
      );

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
          setIsPlaying(false);
          sourceNodeRef.current = null;
      };
      source.start();
      sourceNodeRef.current = source;
      
      setIsPlaying(true);

    } catch (err) {
      console.error("Error in generate/play process:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!audioData) return;
    
    try {
      const blob = createWavBlob(audioData, 24000, 1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'gemini-tts-speech.wav';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
       console.error("Error creating download link:", err);
       setError("Failed to prepare audio for download.");
    }
  };

  return (
    <>
      <div className="mb-6">
        <label htmlFor="text-input" className="block text-sm font-medium text-slate-300 mb-2">
          Your Text
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to speak..."
          className="w-full h-40 p-4 bg-slate-900/50 rounded-lg border border-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-300 placeholder-slate-500 resize-none"
          rows={5}
          disabled={isLoading || isPlaying}
        />
      </div>

      <div className="mb-8">
        <VoiceSelector
          voices={AVAILABLE_VOICES}
          selectedVoice={selectedVoice}
          onSelectVoice={setSelectedVoice}
          disabled={isLoading || isPlaying}
        />
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-center text-sm">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={handleGenerateAndPlay}
          disabled={isLoading || !text.trim()}
          className={`group relative flex items-center justify-center h-16 flex-grow px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 ease-in-out overflow-hidden
            ${isLoading || !text.trim() ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 
             isPlaying ? 'bg-red-600 hover:bg-red-700 text-white' : 
             'bg-sky-500 hover:bg-sky-600 text-white'}`}
        >
          <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></span>
          {isLoading ? (
            <>
              <Spinner />
              <span className="ml-3">Generating...</span>
            </>
          ) : isPlaying ? (
             <>
              <StopIcon className="h-6 w-6 mr-3" />
              <span>Stop</span>
             </>
          ) : (
            <>
              <SpeakerIcon className="h-6 w-6 mr-3" />
              <span>Speak</span>
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          disabled={!audioData || isLoading || isPlaying}
          aria-label="Download generated audio as WAV file"
          className="group relative flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ease-in-out bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed enabled:hover:bg-slate-600"
        >
          <DownloadIcon className="h-7 w-7 text-slate-300 group-enabled:group-hover:text-white transition-colors" />
        </button>
      </div>
    </>
  );
};

export default TTSView;