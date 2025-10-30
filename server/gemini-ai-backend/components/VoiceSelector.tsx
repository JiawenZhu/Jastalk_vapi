
import React from 'react';
import type { Voice } from '../types';

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  disabled: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, selectedVoice, onSelectVoice, disabled }) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-300 mb-3">Choose a Voice</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelectVoice(voice)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500 hover:bg-sky-500/10'}
              ${selectedVoice.id === voice.id ? 'border-sky-500 bg-sky-500/20' : 'border-slate-700 bg-slate-900/50'}`
            }
          >
            <span className="text-2xl mb-1">{voice.emoji}</span>
            <span className="font-semibold text-sm text-slate-200">{voice.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
