import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons/PlaybackIcons';

const codeSnippet = `
import React from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';

// Example system instruction for a "Help Desk" persona
const helpDeskInstruction = \`You are the AI Help Desk for 'Innovate Inc.'...
- Office Hours: Monday to Friday, 9:00 AM to 6:00 PM.
- Wi-Fi Access: The guest network is 'InnovateGuest'.
Your Task: Greet the person and provide an answer from your knowledge base.\`;

const MyConversationComponent: React.FC = () => {
  const {
    isConnecting,
    isSessionActive,
    error,
    transcript,
    startConversation,
    stopConversation,
  } = useLiveConversation();

  const handleStart = () => {
    startConversation(helpDeskInstruction);
  }

  return (
    <div>
      <p>
        Status: 
        {isConnecting ? 'Connecting...' : isSessionActive ? 'Active' : 'Idle'}
      </p>
      
      <button 
        onClick={isSessionActive ? stopConversation : handleStart}
        disabled={isConnecting}
      >
        {isSessionActive ? 'Stop' : 'Start Help Desk Conversation'}
      </button>

      <div>
        <h3>Transcript:</h3>
        {transcript.map((entry, index) => (
          <p key={index}>
            <strong>{entry.speaker}:</strong> {entry.text}
          </p>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
};

export default MyConversationComponent;
`;

const returnValues = [
    { name: 'isConnecting', type: 'boolean', description: 'True while the initial connection to the Gemini API is being established.' },
    { name: 'isSessionActive', type: 'boolean', description: 'True when the session is open, the microphone is active, and the system is listening.' },
    { name: 'error', type: 'string | null', description: 'Contains any error message that occurs during the session.' },
    { name: 'transcript', type: 'TranscriptEntry[]', description: 'An array of transcript objects, each containing a `speaker` (\'user\' or \'model\') and their spoken `text`.' },
    { name: 'startConversation', type: '(systemInstruction: string) => Promise<void>', description: 'Function to initiate the session. It requires a `systemInstruction` string to define the AI\'s persona and knowledge base.' },
    { name: 'stopConversation', type: '() => void', description: 'Function to gracefully close the session and release all audio resources.' },
];

const ApiView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet.trim())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  };

  return (
    <div className="text-slate-300">
      <h2 className="text-2xl font-semibold text-sky-400 mb-2">Live Conversation API</h2>
      <p className="text-slate-400 mb-6">
        Integrate real-time, role-playing voice conversations into your React app using the{' '}
        <code className="bg-slate-900/50 text-sky-400 font-mono text-sm px-1.5 py-1 rounded-md">useLiveConversation</code> hook.
        By passing a <code className="bg-slate-900/50 text-slate-300 font-mono text-sm px-1 py-0.5 rounded-md">systemInstruction</code>, you can provide a knowledge base and define a specific persona for the AI, such as an interviewer or a help desk agent.
      </p>

      <div className="bg-slate-900/70 rounded-lg border border-slate-700 overflow-hidden mb-8">
        <div className="flex justify-between items-center px-4 py-2 bg-slate-800/50 border-b border-slate-700">
          <p className="text-sm font-semibold text-slate-300">Example: <code className="font-mono">MyConversationComponent.tsx</code></p>
          <button onClick={handleCopy} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50" disabled={copied}>
            {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <pre className="p-4 text-sm overflow-x-auto">
          <code className="font-mono text-slate-300 language-tsx">
            {codeSnippet.trim()}
          </code>
        </pre>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-200 mb-4">Hook Signature</h3>
        <div className="space-y-4">
            {returnValues.map(item => (
                <div key={item.name} className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <p className="font-semibold text-sky-400 font-mono" dangerouslySetInnerHTML={{ __html: item.name.replace(/ /g, '&nbsp;') + ': <span class="text-amber-400">' + item.type.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' }}></p>
                    <p className="text-slate-400 mt-1">{item.description}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ApiView;
