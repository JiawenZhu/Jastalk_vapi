import React from 'react';
import type { Persona } from '../types';

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  disabled: boolean;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ personas, selectedPersona, onSelectPersona, disabled }) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-300 mb-3">Choose a Persona</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onSelectPersona(persona)}
            disabled={disabled}
            className={`flex flex-col items-center justify-start p-3 rounded-lg border-2 text-center transition-all duration-200 h-full
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500 hover:bg-sky-500/10'}
              ${selectedPersona.id === persona.id ? 'border-sky-500 bg-sky-500/20' : 'border-slate-700 bg-slate-900/50'}`
            }
          >
            <span className="text-3xl mb-2">{persona.emoji}</span>
            <span className="font-semibold text-sm text-slate-200">{persona.name}</span>
            <span className="text-xs text-slate-400 mt-1">{persona.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PersonaSelector;
