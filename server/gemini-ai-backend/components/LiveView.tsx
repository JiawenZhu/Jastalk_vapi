import React, { useState } from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';
import { saveTranscriptToFile } from '../utils/transcriptUtils';
import { MicrophoneIcon, MicrophoneStopIcon, DocumentDownloadIcon } from './icons/PlaybackIcons';
import Spinner from './Spinner';
import PersonaSelector from './PersonaSelector';
import { AVAILABLE_PERSONAS } from '../constants';
import type { Persona } from '../types';

const LiveView: React.FC = () => {
  // Default to JasTalk AI Interviewer or fallback to first persona
  const defaultPersona = AVAILABLE_PERSONAS.find(p => p.id === 'jastalk-interviewer') || AVAILABLE_PERSONAS[0];
  const [selectedPersona, setSelectedPersona] = useState<Persona>(defaultPersona);
  const {
    isConnecting,
    isSessionActive,
    error,
    transcript,
    startConversation,
    stopConversation,
  } = useLiveConversation();

  const handleToggleConversation = () => {
    if (isSessionActive) {
      stopConversation();
    } else {
      startConversation(selectedPersona.systemInstruction);
    }
  };

  const handleSaveTranscript = () => {
    saveTranscriptToFile(transcript);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-full mb-6">
          <PersonaSelector 
            personas={AVAILABLE_PERSONAS}
            selectedPersona={selectedPersona}
            onSelectPersona={setSelectedPersona}
            disabled={isConnecting || isSessionActive}
          />
      </div>

      <div className="w-full h-64 bg-slate-900/50 rounded-lg border border-slate-700 p-4 mb-6 overflow-y-auto flex flex-col gap-4">
        {transcript.length === 0 && (
          <div className="flex-grow flex items-center justify-center text-slate-500 text-center px-4">
            {isSessionActive ? "Listening..." : `Ready to start a conversation as a "${selectedPersona.name}".`}
          </div>
        )}
        {transcript.map((entry, index) => (
          <div key={index} className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${entry.speaker === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
              <p className="text-sm">{entry.text}</p>
            </div>
             <p className="text-xs text-slate-500 mt-1 capitalize">{entry.speaker}</p>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-center text-sm w-full">
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-center items-center gap-4 w-full">
        <button
          onClick={handleToggleConversation}
          disabled={isConnecting}
          className={`group relative flex items-center justify-center h-16 flex-grow px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 ease-in-out overflow-hidden
            ${isConnecting ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 
            isSessionActive ? 'bg-red-600 hover:bg-red-700 text-white' : 
            'bg-sky-500 hover:bg-sky-600 text-white'}`}
        >
          <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></span>
          {isConnecting ? (
            <>
              <Spinner />
              <span className="ml-3">Connecting...</span>
            </>
          ) : isSessionActive ? (
            <>
              <MicrophoneStopIcon className="h-6 w-6 mr-3" />
              <span>Stop Conversation</span>
            </>
          ) : (
            <>
              <MicrophoneIcon className="h-6 w-6 mr-3" />
              <span>Start Conversation</span>
            </>
          )}
        </button>
        <button
          onClick={handleSaveTranscript}
          disabled={transcript.length === 0 || isSessionActive}
          aria-label="Save conversation transcript"
          className="group relative flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ease-in-out bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed enabled:hover:bg-slate-600"
        >
          <DocumentDownloadIcon className="h-7 w-7 text-slate-300 group-enabled:group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default LiveView;
