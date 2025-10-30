import React, { useState } from 'react';
import TTSView from './components/TTSView';
import LiveView from './components/LiveView';
import ApiView from './components/ApiView';
import { SpeakerIcon, MicrophoneIcon, CodeIcon } from './components/icons/PlaybackIcons';


type Tab = 'tts' | 'live' | 'api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('tts');

  const TabButton: React.FC<{tabId: Tab, currentTab: Tab, children: React.ReactNode, onClick: () => void}> = ({tabId, currentTab, children, onClick}) => (
     <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
          currentTab === tabId
            ? 'bg-sky-500 text-white'
            : 'text-slate-300 hover:bg-slate-700'
        }`}
      >
        {children}
      </button>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-sky-400 selection:text-slate-900">
      <div className="w-full max-w-2xl bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-2xl shadow-slate-950/50 ring-1 ring-white/10 overflow-hidden">
        <div className="p-6 sm:p-8">
          <header className="text-center mb-6">
            <h1 className="text-4xl font-bold text-sky-400">Gemini AI Studio</h1>
            <p className="text-slate-400 mt-2">Your gateway to generative voice and conversation.</p>
          </header>
          
          <nav className="flex justify-center mb-6 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700">
              <TabButton tabId="tts" currentTab={activeTab} onClick={() => setActiveTab('tts')}>
                <SpeakerIcon className="h-5 w-5" />
                TTS Studio
              </TabButton>
              <TabButton tabId="live" currentTab={activeTab} onClick={() => setActiveTab('live')}>
                <MicrophoneIcon className="h-5 w-5" />
                Live Conversation
              </TabButton>
              <TabButton tabId="api" currentTab={activeTab} onClick={() => setActiveTab('api')}>
                <CodeIcon className="h-5 w-5" />
                Live API
              </TabButton>
          </nav>

          <main>
            {activeTab === 'tts' && <TTSView />}
            {activeTab === 'live' && <LiveView />}
            {activeTab === 'api' && <ApiView />}
          </main>
        </div>
      </div>
       <footer className="text-center mt-8 text-slate-500 text-sm">
            <p>Powered by Google Gemini API</p>
       </footer>
    </div>
  );
};

export default App;