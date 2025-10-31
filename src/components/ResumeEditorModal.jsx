import React, { useEffect, useRef, useState } from 'react';
import { generateResumeSuggestion } from '../services/geminiAIService';

const ResumeEditorModal = ({ isOpen, initialResumeText, onClose, onSave, updateTokenUsage, setError }) => {
  const [editedResume, setEditedResume] = useState(initialResumeText || '');
  const [chatHistory, setChatHistory] = useState([{ role: 'model', text: 'Hello! How can I help you improve your resume today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => { if (isOpen) { setEditedResume(initialResumeText || ''); } }, [isOpen, initialResumeText]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [chatHistory]);

  const parseSuggestion = (text) => {
    const m = text.match(/```txt\n([\s\S]*?)\n```/);
    return m ? m[1] : null;
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const newUser = { role: 'user', text: chatInput };
    const newHistory = [...chatHistory, newUser];
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatLoading(true);
    setError?.(null);
    try {
      const { suggestion, usage } = await generateResumeSuggestion(editedResume, newHistory);
      setChatHistory(prev => [...prev, { role: 'model', text: suggestion }]);
      updateTokenUsage?.(usage);
    } catch (e) {
      setError?.(e.message || 'Failed to get suggestion');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApply = (s) => {
    const suggestion = parseSuggestion(s) || s;
    const lines = suggestion.split('\n');
    const title = lines[0]?.trim().replace(/:$/, '');
    if (!title) { setEditedResume(prev => `${prev.trim()}\n\n${suggestion}`); return; }
    const regex = new RegExp(`(^|\n)\s*${title}\s*:?[\s\S]*?(?=\n[A-Z][A-Z\s]+:|$)`, 'i');
    if (regex.test(editedResume)) {
      setEditedResume(prev => prev.replace(regex, `\n${suggestion}\n`));
    } else {
      setEditedResume(prev => `${prev.trim()}\n\n${suggestion}`);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resume Editor & Assistant</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-3xl">&times;</button>
        </div>
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/2 p-4 flex flex-col">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Your Resume</label>
            <textarea value={editedResume} onChange={(e)=>setEditedResume(e.target.value)} className="w-full flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm" />
            <div className="mt-3 flex gap-2">
              <button onClick={()=>onSave?.(editedResume)} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save</button>
            </div>
          </div>
          <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">AI Assistant</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">e.g., "Rewrite my summary to be more impactful."</p>
            </div>
            <div ref={chatRef} className="flex-grow p-4 overflow-y-auto space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role==='user'?'justify-end':''}`}>
                  <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role==='user'?'bg-indigo-600 text-white':'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                    {msg.text}
                    {msg.role==='model' && (
                      <div className="mt-2 flex gap-2 justify-end">
                        <button className="px-2 py-1 text-xs border rounded" onClick={()=>handleApply(msg.text)}>Apply</button>
                        <button className="px-2 py-1 text-xs border rounded" onClick={()=>{setRegeneratingIndex(idx);generateResumeSuggestion(editedResume, chatHistory.slice(0, idx)).then(({suggestion,usage})=>{setChatHistory(prev=>{const n=[...prev];n[idx]={role:'model',text:suggestion};return n;});updateTokenUsage?.(usage);}).finally(()=>setRegeneratingIndex(null));}}>Regenerate</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && <div className="text-sm text-slate-500">Thinking...</div>}
            </div>
            <form onSubmit={(e)=>{e.preventDefault();handleSend();}} className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <input value={chatInput} onChange={(e)=>setChatInput(e.target.value)} placeholder="Type your message..." className="flex-grow p-2 border rounded-md bg-white dark:bg-slate-900" />
              <button disabled={isChatLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditorModal;

