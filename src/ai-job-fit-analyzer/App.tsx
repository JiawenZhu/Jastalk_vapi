import React, { useState, useCallback, useRef, useEffect } from 'react';
// Fix: Replaced deprecated `LiveSession` with `Session` for live chat connections.
import { GoogleGenAI, Modality, Session, LiveServerMessage, Blob } from "@google/genai";
import type { ResumeAnalysis, Job, GroundingSource, PDFDocumentProxy, PDFPageProxy, TextContent, TextItem, TranscriptEntry, InterviewStatus, TokenUsage, InterviewAnalysis, JobHistoryEntry, ChatMessage } from './types';
import { analyzeResume, searchJobs, generateInterviewQuestions, analyzeInterviewTranscript, generateResumeSuggestion } from './services/geminiService';
import { addJob as addJobToHistory, listJobs as listJobsFromHistory, clearJobs as clearJobsFromHistory, getAnalysisById } from './services/jobHistoryService';
import { BriefcaseIcon, LightbulbIcon, CheckCircleIcon, ClockIcon, AcademicCapIcon, BookmarkIcon, ShareIcon, ExternalLinkIcon, ArrowPathIcon, ArrowUpTrayIcon, MicrophoneIcon, StopCircleIcon, DocumentTextIcon, CalculatorIcon, PaperClipIcon, LinkIcon, ArrowUturnLeftIcon, DocumentDuplicateIcon, SparklesIcon, PaperAirplaneIcon, ClipboardIcon } from './components/icons';

// --- Audio Utility Functions ---
// These functions are used for handling raw audio data for the Live API.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

type LoadingState = {
  analysis: boolean;
  jobs: boolean;
  questions: boolean;
  parsing: boolean;
};


// --- Resume Editor Modal ---
interface ResumeEditorModalProps {
  isOpen: boolean;
  initialResumeText: string;
  onClose: () => void;
  onSave: (newText: string) => void;
  updateTokenUsage: (usage: TokenUsage) => void;
  setError: (error: string | null) => void;
}

const ResumeEditorModal: React.FC<ResumeEditorModalProps> = ({ isOpen, initialResumeText, onClose, onSave, updateTokenUsage, setError }) => {
    const [editedResume, setEditedResume] = useState(initialResumeText);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setEditedResume(initialResumeText);
            setChatHistory([{role: 'model', text: "Hello! How can I help you improve your resume today?"}]);
            setChatInput('');
            setIsChatLoading(false);
            setRegeneratingIndex(null);
        }
    }, [isOpen, initialResumeText]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [chatHistory]);

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        
        const newUserMessage: ChatMessage = { role: 'user', text: chatInput };
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);
        setChatInput('');
        setIsChatLoading(true);
        setError(null);

        try {
            const { suggestion, usage } = await generateResumeSuggestion(editedResume, newHistory);
            setChatHistory(prev => [...prev, { role: 'model', text: suggestion }]);
            updateTokenUsage(usage);
        } catch (e: any) {
            setError(e.message || "Failed to get suggestion.");
            setChatHistory(prev => prev.slice(0, -1));
        } finally {
            setIsChatLoading(false);
        }
    };
    
    const parseSuggestion = (text: string): string | null => {
        const match = text.match(/```txt\n([\s\S]*?)\n```/);
        return match ? match[1] : null;
    };
    
    const handleApplySuggestion = (suggestion: string) => {
        const suggestionLines = suggestion.split('\n');
        const suggestionTitle = suggestionLines[0].trim().replace(/:/g, '');

        if (!suggestionTitle) {
            setEditedResume(prev => prev.trim() + '\n\n' + suggestion);
            return;
        }

        const resumeLines = editedResume.split('\n');
        const normalizedTitle = suggestionTitle.replace(/s$/i, '').toLowerCase();
        let sectionStartIndex = -1;

        for (let i = 0; i < resumeLines.length; i++) {
            const normalizedLine = resumeLines[i].trim().replace(/:/g, '').replace(/s$/i, '').toLowerCase();
            if (normalizedLine.includes(normalizedTitle)) {
                sectionStartIndex = i;
                break;
            }
        }

        if (sectionStartIndex === -1) {
            setEditedResume(prev => prev.trim() + '\n\n' + suggestion);
            return;
        }

        let sectionEndIndex = resumeLines.length;
        for (let i = sectionStartIndex + 1; i < resumeLines.length; i++) {
            const line = resumeLines[i].trim();
            if (line.length > 3 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
                sectionEndIndex = i;
                break;
            }
        }
        
        const newResumeLines = [
            ...resumeLines.slice(0, sectionStartIndex),
            ...suggestionLines,
            ...resumeLines.slice(sectionEndIndex)
        ];

        setEditedResume(newResumeLines.join('\n'));
    };
    
    const handleRegenerate = async (messageIndex: number) => {
        const historyToResend = chatHistory.slice(0, messageIndex);
        if (historyToResend.length === 0 || historyToResend[historyToResend.length - 1].role !== 'user') {
            return;
        }
        
        setRegeneratingIndex(messageIndex);
        setError(null);

        try {
            const { suggestion, usage } = await generateResumeSuggestion(editedResume, historyToResend);
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[messageIndex] = { role: 'model', text: suggestion };
                return newHistory;
            });
            updateTokenUsage(usage);
        } catch (e: any) {
            setError(e.message || "Failed to regenerate suggestion.");
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const handleCopy = (textToCopy: string, index: number) => {
        navigator.clipboard.writeText(textToCopy);
        setCopiedStates({ ...copiedStates, [index]: true });
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [index]: false }));
        }, 2000);
    };

    const handleSave = () => {
        onSave(editedResume);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resume Editor & Assistant</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-3xl font-light">&times;</button>
                </div>
                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    <div className="w-full md:w-1/2 p-4 flex flex-col">
                        <label htmlFor="resume-editor" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Your Resume</label>
                        <textarea
                            id="resume-editor"
                            value={editedResume}
                            onChange={(e) => setEditedResume(e.target.value)}
                            className="w-full flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 transition resize-none font-mono text-sm"
                        />
                    </div>
                    <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                <SparklesIcon className="h-5 w-5 mr-2 text-indigo-500" /> AI Assistant
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">e.g., "Rewrite my summary to be more impactful."</p>
                        </div>
                        <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                     {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold">AI</div>}
                                     {msg.role === 'model' ? (
                                        regeneratingIndex === index ? (
                                            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                                                    <span>Regenerating...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg max-w-[85%] text-sm bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                                {msg.text.split(/(```txt\n[\s\S]*?\n```)/g).filter(part => part.trim()).map((part, i) => {
                                                    const suggestion = parseSuggestion(part);
                                                    if (suggestion) {
                                                        return (
                                                            <div key={i} className="my-2 p-3 bg-slate-200 dark:bg-slate-800 rounded-md">
                                                                <pre className="whitespace-pre-wrap font-mono text-xs">{suggestion}</pre>
                                                                <div className="mt-2 flex justify-end items-center flex-wrap gap-2">
                                                                    <button onClick={() => handleApplySuggestion(suggestion)} disabled={isChatLoading || regeneratingIndex !== null} className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                                                                        <CheckCircleIcon className="h-4 w-4"/> Apply
                                                                    </button>
                                                                    <button onClick={() => handleRegenerate(index)} disabled={isChatLoading || regeneratingIndex !== null} className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">
                                                                        <ArrowPathIcon className="h-4 w-4"/> Regenerate
                                                                    </button>
                                                                    <button onClick={() => handleCopy(suggestion, index)} className="inline-flex items-center gap-1 px-2 py-1 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-600">
                                                                        <ClipboardIcon className="h-4 w-4" /> {copiedStates[index] ? 'Copied!' : 'Copy'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return <p key={i} className="whitespace-pre-wrap">{part}</p>;
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        <div className="p-3 rounded-lg max-w-[85%] text-sm bg-indigo-600 dark:bg-indigo-500 text-white">
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    )}
                                    {msg.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-sm font-bold">You</div>}
                                </div>
                            ))}
                             {isChatLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold">AI</div>
                                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                                            <span>Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={isChatLoading || regeneratingIndex !== null}
                                    className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={isChatLoading || regeneratingIndex !== null || !chatInput.trim()}
                                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex-shrink-0"
                                    aria-label="Send message"
                                >
                                    <PaperAirplaneIcon className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 font-medium">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Save Changes</button>
                </div>
            </div>
        </div>
    );
};


// --- Sub-components ---

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: (jobId: string) => void;
  onShare: (job: Job) => void;
  onPrepInterview: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isSaved, onSave, onShare, onPrepInterview }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDescription = job.description.length > 150;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{job.title}</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium">{job.company}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{job.location}</p>
        </div>
        <button onClick={() => onSave(job.id)} className={`p-2 rounded-full transition-colors ${isSaved ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
          <BookmarkIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="mt-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed flex-grow">
        <p className={`whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : 'block'}`}>
          {job.description}
        </p>
        {isLongDescription && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium mt-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Apply <ExternalLinkIcon className="ml-2 h-4 w-4" />
        </a>
        <button onClick={() => onPrepInterview(job)} className="flex-1 min-w-[120px] inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Prep Interview <AcademicCapIcon className="ml-2 h-4 w-4" />
        </button>
        <button onClick={() => onShare(job)} className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// --- Feedback Visualization Components ---

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const [displayScore, setDisplayScore] = useState(0);
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayScore / 100) * circumference;

    useEffect(() => {
        const animation = requestAnimationFrame(() => setDisplayScore(score));
        return () => cancelAnimationFrame(animation);
    }, [score]);

    const scoreColor = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';
    const ringColor = score >= 75 ? 'stroke-green-500' : score >= 50 ? 'stroke-yellow-500' : 'stroke-red-500';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    className="stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`${ringColor} transition-all duration-1000 ease-out`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset: offset }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{Math.round(displayScore)}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Score</span>
            </div>
        </div>
    );
};

const MetricBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDisplayScore(score), 100);
        return () => clearTimeout(timeout);
    }, [score]);

    return (
        <div>
            <div className="flex justify-between items-center text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                <span>{label}</span>
                <span className="font-mono">{Math.round(displayScore)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-2 bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${displayScore}%` }}
                />
            </div>
        </div>
    );
};

const FeedbackReportView: React.FC<{ analysis: InterviewAnalysis }> = ({ analysis }) => {
    return (
        <div className="space-y-6 p-2">
            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center">
                    <PaperClipIcon className="h-5 w-5 mr-2 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Analysis ID:</span>
                    <code className="ml-2 text-sm text-indigo-600 dark:text-indigo-400 font-mono break-all">{analysis.id}</code>
                </div>
                <button
                    onClick={() => navigator.clipboard.writeText(analysis.id!)}
                    className="text-sm text-indigo-600 hover:underline font-medium px-2 py-1"
                >
                    Copy ID
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-100 dark:bg-slate-900 p-6 rounded-lg">
                <div className="md:col-span-1 flex justify-center">
                    <ScoreRing score={analysis.overallScore} />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <MetricBar label="Communication" score={analysis.communicationScore} />
                    <MetricBar label="Confidence" score={analysis.confidenceScore} />
                    <MetricBar label="Answer Relevance" score={analysis.relevanceScore} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <h3>Strengths</h3>
                    <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{analysis.strengths}</p>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <h3>Areas for Improvement</h3>
                    <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{analysis.areasForImprovement}</p>
                </div>
            </div>
        </div>
    );
};

const InterviewHistoryViewer: React.FC<{ job: Job; history: InterviewAnalysis[]; onClose: () => void; }> = ({ job, history, onClose }) => {
    const [selectedAnalysis, setSelectedAnalysis] = useState<InterviewAnalysis | null>(history.length > 0 ? history[history.length - 1] : null);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Interview History</h2>
                        <p className="text-indigo-600 dark:text-indigo-400 font-medium">{job.title}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
                </div>
                <div className="flex-grow flex overflow-hidden">
                    <div className="w-1/4 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                        <ul className="p-2">
                            {history.slice().reverse().map(analysis => (
                                <li key={analysis.id}>
                                    <button 
                                        onClick={() => setSelectedAnalysis(analysis)}
                                        className={`w-full text-left p-3 rounded-md text-sm ${selectedAnalysis?.id === analysis.id ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        <p className="font-semibold">Session from {new Date(analysis.timestamp).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(analysis.timestamp).toLocaleTimeString()}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="w-3/4 overflow-y-auto p-6">
                        {selectedAnalysis ? <FeedbackReportView analysis={selectedAnalysis} /> : <p className="text-center text-slate-500">Select a session to view the report.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


interface AIInterviewAgentModalProps {
  job: Job | null;
  jobHistoryEntry: JobHistoryEntry | null;
  questions: string[];
  isLoading: boolean;
  onClose: () => void;
  setError: (error: string | null) => void;
  onAnalysisComplete: (usage: TokenUsage) => void;
  onHistoryUpdate: () => void;
}

const AIInterviewAgentModal: React.FC<AIInterviewAgentModalProps> = ({ job, jobHistoryEntry, questions, isLoading, onClose, setError, onAnalysisComplete, onHistoryUpdate }) => {
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<InterviewAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'feedback'>('transcript');
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);


  // Fix: Replaced deprecated `LiveSession` with `Session`.
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when job changes
    if (job) {
      setTranscript([]);
      setAnalysisResult(null);
      setIsInterviewing(false);
      setStatus('idle');
      setActiveTab('transcript');
      setIsHistoryVisible(false);
    }
  }, [job]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [transcript]);

  const startInterview = async () => {
    if (!job || questions.length === 0) return;

    setError(null);
    setTranscript([]);
    setAnalysisResult(null);
    setStatus('connecting');
    setIsInterviewing(true);

    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const systemInstruction = `You are a friendly and professional interviewer for the position of "${job.title}". Your task is to conduct a short, focused interview. Start by greeting the candidate and then ask the first question from the list. Proceed through the list of questions. You can ask one or two relevant follow-up questions if the candidate's response is interesting. After the last question, thank the candidate for their time and conclude the interview. Here are the questions: ${questions.map((q, i) => `\n${i+1}. ${q}`).join('')}`;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setStatus('listening');
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);

            // Proactively start the conversation
            sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ text: "Start the interview now." });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: The `isFinal` property does not exist on transcription objects.
            // Logic is updated to append to the last transcript entry until a new speaker starts
            // or the turn is marked complete. New entries are created with `isFinal: false`.
            if (message.serverContent?.inputTranscription) {
              const { text } = message.serverContent.inputTranscription;
              setTranscript(prev => {
                const newTranscript = [...prev];
                const last = newTranscript[newTranscript.length - 1];
                if (last?.speaker === 'user' && !last.isFinal) {
                  last.text += text;
                } else {
                  newTranscript.push({ speaker: 'user', text, isFinal: false });
                }
                return newTranscript;
              });
            }
            // Fix: The `isFinal` property does not exist on transcription objects.
            // Logic is updated to append to the last transcript entry until a new speaker starts
            // or the turn is marked complete. New entries are created with `isFinal: false`.
             if (message.serverContent?.outputTranscription) {
              const { text } = message.serverContent.outputTranscription;
               setTranscript(prev => {
                const newTranscript = [...prev];
                const last = newTranscript[newTranscript.length - 1];
                if (last?.speaker === 'ai' && !last.isFinal) {
                  last.text += text;
                } else {
                  newTranscript.push({ speaker: 'ai', text, isFinal: false });
                }
                return newTranscript;
              });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                setStatus('speaking');
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(source);
                  if (audioSourcesRef.current.size === 0 && status !== 'ended') {
                      setStatus('listening');
                  }
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
            if (message.serverContent?.turnComplete) {
              setTranscript(prev => prev.map(t => ({...t, isFinal: true})));
            }
          },
          onclose: () => {
            setStatus('ended');
            cleanup();
          },
          onerror: (e) => {
            console.error(e);
            setError("An error occurred during the interview session.");
            setStatus('error');
            cleanup();
          },
        },
      });

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        setError("Microphone permission was denied. Please allow microphone access to start the interview.");
      } else {
        setError("Could not start the interview. Please check your microphone and connection.");
      }
      setStatus('error');
      setIsInterviewing(false);
    }
  };
  
  const cleanup = () => {
    setIsInterviewing(false);
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
  };

  const endInterview = () => {
      setStatus('ended');
      cleanup();
  };
  
  const handleGetFeedback = async () => {
    if (transcript.length === 0 || !job) return;
    setIsAnalyzing(true);
    setError(null);
    try {
        const { analysis, usage } = await analyzeInterviewTranscript(job.id, transcript);
        setAnalysisResult(analysis);
        onAnalysisComplete(usage);
        setActiveTab('feedback');
        onHistoryUpdate(); // Notify parent to refresh history
    } catch(e: any) {
        setError(e.message || "Failed to get interview feedback.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (isInterviewing) endInterview();
    onClose();
  }
  
  if (!job) return null;

  const getStatusIndicator = () => {
    switch (status) {
        case 'connecting': return <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400 mr-2"></div>Connecting...</>;
        case 'listening': return <><span className="relative flex h-3 w-3 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>Listening...</>;
        case 'speaking': return <><span className="relative flex h-3 w-3 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>Speaking...</>;
        case 'ended': return "Interview Ended";
        case 'error': return "Connection Error";
        default: return "Ready";
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Interview Agent</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-medium">{job.title} at {job.company}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">**Description:** {job.description}</p>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center">{getStatusIndicator()}</div>
          </div>

          {status === 'ended' && analysisResult && (
              <div className="p-2 bg-slate-100 dark:bg-slate-900 flex justify-center gap-2 border-b border-slate-200 dark:border-slate-700">
                  <TabButton active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')}>
                      <AcademicCapIcon className="h-4 w-4 mr-2 inline" /> Transcript
                  </TabButton>
                  <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')}>
                      <DocumentTextIcon className="h-4 w-4 mr-2 inline" /> Feedback Report
                  </TabButton>
              </div>
          )}
          
          <div ref={chatContainerRef} className="p-6 overflow-y-auto flex-grow bg-slate-50 dark:bg-slate-900/50">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="ml-4 text-slate-500">Loading questions...</p>
              </div>
            ) : (activeTab === 'transcript' || !analysisResult) ? (
              transcript.length === 0 && !isInterviewing ? (
              <div className="text-center text-slate-500 py-8">
                <p className="font-medium">Ready to practice?</p>
                <p>Click "Start Interview" to begin your mock interview.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transcript.map((entry, index) => (
                  <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                    {entry.speaker === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold">AI</div>}
                    <div className={`p-3 rounded-lg max-w-[80%] ${entry.speaker === 'ai' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'bg-indigo-600 dark:bg-indigo-500 text-white'}`}>
                      <p className={`text-sm ${!entry.isFinal ? 'text-slate-400' : ''}`}>{entry.text}</p>
                    </div>
                    {entry.speaker === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-sm font-bold">You</div>}
                  </div>
                ))}
              </div>
            )) : isAnalyzing ? (
                <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="ml-4 text-slate-500">Analyzing your performance...</p>
                </div>
            ) : analysisResult ? (
                <FeedbackReportView analysis={analysisResult} />
            ) : (
                <p>No analysis available.</p>
            )}
          </div>
          <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center flex-wrap gap-2">
              <div>
                {!isInterviewing ? (
                  status !== 'ended' ? (
                      <button onClick={startInterview} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-400 font-medium">
                          <MicrophoneIcon className="h-5 w-5" /> Start Interview
                      </button>
                  ) : (
                      <button onClick={handleGetFeedback} disabled={isAnalyzing || transcript.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400 font-medium">
                          {isAnalyzing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <DocumentTextIcon className="h-5 w-5" />}
                          Get Feedback
                      </button>
                  )
                ) : (
                  <button onClick={endInterview} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                      <StopCircleIcon className="h-5 w-5" /> End Interview
                  </button>
                )}
              </div>
            <div className="flex items-center gap-2">
                {jobHistoryEntry && jobHistoryEntry.interviewHistory.length > 0 && (
                    <button
                        onClick={() => setIsHistoryVisible(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 font-medium"
                    >
                        <ClockIcon className="h-5 w-5" /> Interview History
                    </button>
                )}
                <button onClick={handleClose} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 font-medium">
                    Close
                </button>
            </div>
          </div>
        </div>
      </div>
      {isHistoryVisible && jobHistoryEntry && job && (
          <InterviewHistoryViewer
              job={job}
              history={jobHistoryEntry.interviewHistory}
              onClose={() => setIsHistoryVisible(false)}
          />
      )}
    </>
  );
};

type TabButtonProps = { active: boolean; onClick: () => void; children: React.ReactNode; };
const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${ active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
    {children}
  </button>
);

const MODEL_PRICING: Record<string, { pricePerMillionTokens: number }> = {
    // Illustrative pricing based on public information.
    'gemini-2.5-pro': { pricePerMillionTokens: 1.00 },
    'gemini-2.5-flash': { pricePerMillionTokens: 0.10 },
};

const calculateCost = (model: 'gemini-2.5-pro' | 'gemini-2.5-flash', tokens: number): number => {
    const rate = MODEL_PRICING[model].pricePerMillionTokens;
    return (tokens / 1_000_000) * rate;
};

const UsageSummary: React.FC<{ usage: Record<string, TokenUsage> }> = ({ usage }) => {
    // A type assertion is necessary because TypeScript may infer `val` as `unknown`
    // when using `Object.values` on a `Record<string, ...>` type.
    const totalTokens = Object.values(usage).reduce((sum: number, val) => sum + (val as TokenUsage).totalTokens, 0);

    const analysisCost = calculateCost('gemini-2.5-pro', usage.analysis.totalTokens);
    const jobsCost = calculateCost('gemini-2.5-flash', usage.jobs.totalTokens);
    const questionsCost = calculateCost('gemini-2.5-flash', usage.questions.totalTokens);
    const resumeSuggestionCost = calculateCost('gemini-2.5-flash', usage.resumeSuggestion.totalTokens);
    const interviewAnalysisCost = calculateCost('gemini-2.5-pro', usage.interviewAnalysis.totalTokens);
    const totalCost = analysisCost + jobsCost + questionsCost + interviewAnalysisCost + resumeSuggestionCost;

    const formatCost = (cost: number) => cost > 0 ? `$${cost.toFixed(6)}` : '-';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-4">
                <CalculatorIcon className="h-6 w-6 mr-3 text-indigo-500"/>
                API Usage Summary
            </h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Resume Analysis:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{usage.analysis.totalTokens.toLocaleString()} tokens <span className="text-slate-400">({formatCost(analysisCost)})</span></span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Job Search:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{usage.jobs.totalTokens.toLocaleString()} tokens <span className="text-slate-400">({formatCost(jobsCost)})</span></span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Interview Questions:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{usage.questions.totalTokens.toLocaleString()} tokens <span className="text-slate-400">({formatCost(questionsCost)})</span></span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Resume Assistant:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{usage.resumeSuggestion.totalTokens.toLocaleString()} tokens <span className="text-slate-400">({formatCost(resumeSuggestionCost)})</span></span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Interview Feedback:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{usage.interviewAnalysis.totalTokens.toLocaleString()} tokens <span className="text-slate-400">({formatCost(interviewAnalysisCost)})</span></span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                <div className="flex justify-between font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Total Usage:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-100">{totalTokens.toLocaleString()} tokens</span>
                </div>
                 <div className="flex justify-between font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Total Est. Cost:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-100">{formatCost(totalCost)}</span>
                </div>
            </div>
        </div>
    );
};

const DeveloperApiDemo: React.FC = () => {
    const [analysisId, setAnalysisId] = useState('');
    const [retrievedData, setRetrievedData] = useState<InterviewAnalysis | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFetchAnalysis = () => {
        if (!analysisId.trim()) {
            setFetchError("Please enter an Analysis ID.");
            return;
        }
        setIsLoading(true);
        setFetchError(null);
        setRetrievedData(null);
        
        // Simulate async fetch from localStorage
        setTimeout(() => {
            const data = getAnalysisById(analysisId.trim());
            if (data) {
                setRetrievedData(data);
            } else {
                setFetchError(`No analysis found with ID: ${analysisId.trim()}`);
            }
            setIsLoading(false);
        }, 300); // Simulate network delay
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-4">
                <BriefcaseIcon className="h-6 w-6 mr-3 text-indigo-500"/>
                Developer API Demo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                After an interview analysis is generated, you can retrieve its data using the provided Analysis ID. This simulates a real API call.
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={analysisId}
                    onChange={(e) => setAnalysisId(e.target.value)}
                    placeholder="Paste Analysis ID here"
                    className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <button
                    onClick={handleFetchAnalysis}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 font-medium text-sm"
                >
                    {isLoading ? "Fetching..." : "Fetch Data"}
                </button>
            </div>
            {fetchError && <p className="text-red-500 text-sm mt-2">{fetchError}</p>}
            {retrievedData && (
                <div className="mt-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Retrieved Data:</h4>
                    <pre className="mt-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(retrievedData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};


interface JobHistoryCardProps {
  entry: JobHistoryEntry;
  onRevisit: (entry: JobHistoryEntry) => void;
}

const JobHistoryCard: React.FC<JobHistoryCardProps> = ({ entry, onRevisit }) => {
  const practicedCount = entry.interviewHistory.length;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{entry.job.title}</h3>
            {practicedCount > 0 && (
                <div className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                    Practiced {practicedCount} time{practicedCount !== 1 ? 's' : ''}
                </div>
            )}
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">{entry.job.company}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Last searched: {new Date(entry.timestamp).toLocaleDateString()}</p>
        <p className="mt-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed line-clamp-2">
            {entry.job.description}
        </p>
      </div>
      <div className="mt-4">
        <button onClick={() => onRevisit(entry)} className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
          Revisit Interview Prep <AcademicCapIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};


// --- Main App Component ---

const initialTokenUsage: Record<string, TokenUsage> = {
  analysis: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
  jobs: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
  questions: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
  interviewAnalysis: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
  resumeSuggestion: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
};

export default function App() {
  const [step, setStep] = useState<'resume' | 'results'>('resume');
  const [uploadTab, setUploadTab] = useState<'paste' | 'upload' | 'linkedin' | 'history'>('paste');
  const [resumeText, setResumeText] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [interviewJob, setInterviewJob] = useState<Job | null>(null);
  const [currentJobHistoryEntry, setCurrentJobHistoryEntry] = useState<JobHistoryEntry | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [tokenUsage, setTokenUsage] = useState<Record<string, TokenUsage>>(initialTokenUsage);
  const [jobHistory, setJobHistory] = useState<JobHistoryEntry[]>([]);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  
  const [loading, setLoading] = useState<LoadingState>({ analysis: false, jobs: false, questions: false, parsing: false });
  const [error, setError] = useState<string | null>(null);

  const refreshJobHistory = useCallback(() => {
    setJobHistory(listJobsFromHistory());
  }, []);

  useEffect(() => {
    refreshJobHistory();
  }, [refreshJobHistory]);

  const saveJobsAndQuestions = useCallback(async (jobsToSave: Job[]) => {
    console.log("Starting background job and question saving...");
    try {
      const questionsPromises = jobsToSave.map(job => 
        generateInterviewQuestions(job.title, job.description)
          .catch(err => {
            console.error(`Failed to generate questions for ${job.title}`, err);
            return { questions: [], usage: { totalTokens: 0 } }; // Return empty on failure
          })
      );
      
      const results = await Promise.all(questionsPromises);
  
      jobsToSave.forEach((job, index) => {
        const questions = results[index].questions;
        if (questions.length > 0) {
          addJobToHistory(job, questions);
        }
      });
  
      refreshJobHistory();
      console.log("Background job saving complete.");
    } catch (error) {
      console.error("An error occurred during background job saving:", error);
    }
  }, [refreshJobHistory]);

  const handleAnalyzeResume = useCallback(async () => {
    const hasResumeText = resumeText.trim();
    const hasLinkedInUrl = linkedInUrl.trim();
    
    if (!hasResumeText && !hasLinkedInUrl) {
      setError("Please paste your resume, upload a resume, or provide a LinkedIn URL.");
      return;
    }
    setError(null);
    setLoading({ analysis: true, jobs: true, questions: false, parsing: false });
    setTokenUsage(initialTokenUsage); // Reset usage on new analysis

    try {
      const inputForAnalysis = hasLinkedInUrl ? { linkedInUrl } : { resumeText };
      const { analysis: analysisResult, usage: analysisUsage } = await analyzeResume(inputForAnalysis);
      setAnalysis(analysisResult);
      setTokenUsage(prev => ({ ...prev, analysis: analysisUsage }));

      const jobQuery = analysisResult.potentialJobTitles.join(' or ');
      const { jobs: jobResults, sources: jobSources, usage: jobsUsage } = await searchJobs(jobQuery);
      setJobs(jobResults);
      setSources(jobSources);
      setTokenUsage(prev => ({ ...prev, jobs: jobsUsage }));
      
      setStep('results');
      saveJobsAndQuestions(jobResults); // Fire and forget
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading({ analysis: false, jobs: false, questions: false, parsing: false });
    }
  }, [resumeText, linkedInUrl, saveJobsAndQuestions]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      setFileName(null);
      event.target.value = '';
      return;
    }
    
    setFileName(file.name);
    setResumeText('');
    setLinkedInUrl('');
    setError(null);
    setLoading(prev => ({ ...prev, parsing: true }));

    try {
      const fileBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(fileBuffer);
      const pdf: PDFDocumentProxy = await pdfjsLib.getDocument(typedArray).promise;
      
      const pagePromises: Promise<PDFPageProxy>[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        pagePromises.push(pdf.getPage(i));
      }

      const pages = await Promise.all(pagePromises);
      const textContentPromises = pages.map(page => page.getTextContent());
      const textContents: TextContent[] = await Promise.all(textContentPromises);

      const fullText = textContents.map(content => 
        content.items.map((item: TextItem) => item.str).join(' ')
      ).join('\n\n');

      setResumeText(fullText);
    } catch (err) {
      console.error("Error parsing PDF:", err);
      setError("Failed to read the PDF file. It might be corrupted or protected.");
      setFileName(null);
      setResumeText('');
    } finally {
      setLoading(prev => ({ ...prev, parsing: false }));
      event.target.value = '';
    }
  };
  
  const handleStartOver = () => {
    setStep('resume');
    setAnalysis(null);
    setJobs([]);
    setSources([]);
    setError(null);
    setResumeText('');
    setLinkedInUrl('');
    setFileName(null);
    setUploadTab('paste');
    setTokenUsage(initialTokenUsage);
  };

  const handleBack = () => {
    setStep('resume');
    setAnalysis(null);
    setJobs([]);
    setSources([]);
    setError(null);
    // Preserves resumeText, linkedInUrl, fileName for editing
  };
  
  const handleSaveResume = (newText: string) => {
    setResumeText(newText);
    setIsResumeModalOpen(false);
  };

  const handleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleShareJob = async (job: Job) => {
    const shareData = {
      title: `Job Opening: ${job.title} at ${job.company}`,
      text: `Check out this job opening I found: ${job.title} at ${job.company}`,
      url: job.url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(job.url);
        alert('Job link copied to clipboard!');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Share action was canceled.');
      } else {
        console.error("Share failed:", err);
        alert('Could not share this job.');
      }
    }
  };

  const handlePrepInterview = async (job: Job) => {
    setInterviewJob(job);
    setInterviewQuestions([]);
    setError(null);

    const historyEntry = jobHistory.find(h => h.id === job.id);
    setCurrentJobHistoryEntry(historyEntry || null);

    if (historyEntry) {
      setInterviewQuestions(historyEntry.questions);
      return;
    }
    
    setLoading(prev => ({ ...prev, questions: true }));
    try {
      const { questions, usage } = await generateInterviewQuestions(job.title, job.description);
      setInterviewQuestions(questions);
      setTokenUsage(prev => ({...prev, questions: usage }));
    } catch (e: any) {
      setError(e.message);
      setInterviewJob(null);
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const handleRevisitInterview = (entry: JobHistoryEntry) => {
    setInterviewJob(entry.job);
    setInterviewQuestions(entry.questions);
    setCurrentJobHistoryEntry(entry);
    setError(null);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire job history? This action cannot be undone.")) {
      clearJobsFromHistory();
      refreshJobHistory();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">AI Job-Fit Analyzer</h1>
            <div className="flex items-center gap-2">
              {resumeText && (
                 <button onClick={() => setIsResumeModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  <DocumentDuplicateIcon className="h-4 w-4" /> My Resume
                </button>
              )}
              {step === 'results' && (
                <>
                  <button onClick={handleBack} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <ArrowUturnLeftIcon className="h-4 w-4" /> Back
                  </button>
                  <button onClick={handleStartOver} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <ArrowPathIcon className="h-4 w-4" /> Start Over
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
              <div className="flex justify-between">
                 <div>
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                 </div>
                 <button onClick={() => setError(null)} className="font-bold text-xl">&times;</button>
              </div>
            </div>
          )}

          {step === 'resume' && (
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">Find Your Next Career Move</h2>
              <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">Paste your resume, upload one, or enter your LinkedIn profile to let our AI find the best jobs for you.</p>
              
              <div className="mt-8">
                <div className="flex justify-center gap-2 mb-4 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
                  <TabButton active={uploadTab === 'paste'} onClick={() => setUploadTab('paste')}>Paste Resume</TabButton>
                  <TabButton active={uploadTab === 'upload'} onClick={() => setUploadTab('upload')}>Upload Resume</TabButton>
                  <TabButton active={uploadTab === 'linkedin'} onClick={() => setUploadTab('linkedin')}>LinkedIn URL</TabButton>
                  <TabButton active={uploadTab === 'history'} onClick={() => setUploadTab('history')}>Job History</TabButton>
                </div>

                {uploadTab === 'paste' && (
                  <textarea
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setFileName(null);
                      setLinkedInUrl('');
                    }}
                    placeholder="Paste your full resume text here..."
                    className="w-full h-96 p-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 transition"
                    aria-label="Resume input text area"
                  />
                )}
                {uploadTab === 'upload' && (
                  <div className="mt-4">
                    <input type="file" id="resume-upload" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={loading.parsing} />
                    <label htmlFor="resume-upload" className={`relative block w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 text-center  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${loading.parsing ? 'cursor-wait' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500'}`}>
                      {loading.parsing ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Parsing PDF...</p>
                        </>
                      ) : fileName ? (
                        <>
                          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">{fileName}</span>
                          <span className="text-xs text-slate-500">Click to choose a different file</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">Upload Resume</span>
                          <span className="text-xs text-slate-500">PDF format required &bull; Max 5MB</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
                {uploadTab === 'linkedin' && (
                    <div className="relative mt-4">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <LinkIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="url"
                            value={linkedInUrl}
                            onChange={(e) => {
                                setLinkedInUrl(e.target.value);
                                setResumeText('');
                                setFileName(null);
                            }}
                            placeholder="https://www.linkedin.com/in/your-profile/"
                            className="w-full p-4 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 transition"
                            aria-label="LinkedIn profile URL input"
                        />
                    </div>
                )}
                {uploadTab === 'history' && (
                    <div className="mt-4 text-left">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Previously Searched Jobs</h3>
                            {jobHistory.length > 0 && (
                                <button onClick={handleClearHistory} className="text-sm text-red-500 hover:underline">Clear All History</button>
                            )}
                        </div>
                        {jobHistory.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {jobHistory.map(entry => (
                                    <JobHistoryCard key={entry.id} entry={entry} onRevisit={handleRevisitInterview} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                                <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Job History</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your previously searched jobs will appear here.</p>
                            </div>
                        )}
                    </div>
                )}
              </div>
              
              {uploadTab !== 'history' && (
                <div className="mt-6">
                  <button
                    onClick={handleAnalyzeResume}
                    disabled={loading.analysis || loading.parsing || (!resumeText.trim() && !linkedInUrl.trim())}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading.analysis ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Analyzing...
                      </>
                    ) : "Analyze & Find Jobs"}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {step === 'results' && analysis && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center"><BriefcaseIcon className="h-7 w-7 mr-3 text-indigo-500" />Recommended Jobs</h2>
                    <span className="text-sm font-medium text-slate-500">{jobs.length} jobs found</span>
                </div>
                {loading.jobs ? (
                   <div className="flex justify-center items-center h-64">
                     <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                   </div>
                ) : jobs.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {jobs.map(job => (
                      <JobCard key={job.id} job={job} isSaved={savedJobs.has(job.id)} onSave={handleSaveJob} onShare={handleShareJob} onPrepInterview={handlePrepInterview} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-white">No Jobs Found</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">We couldn't find any jobs matching your profile from our sources.</p>
                  </div>
                )}
                 {sources.length > 0 && (
                  <div className="mt-8 text-xs text-slate-400 dark:text-slate-500">
                    <h4 className="font-semibold mb-2">Job data sourced from:</h4>
                    <ul className="list-disc list-inside">
                      {sources.map(source => source.web && <li key={source.web.uri}><a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 underline">{source.web.title || new URL(source.web.uri).hostname}</a></li>)}
                    </ul>
                  </div>
                 )}
              </div>

              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Career Snapshot</h2>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">{analysis.summary}</p>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-500 dark:text-slate-400 flex items-center text-sm"><CheckCircleIcon className="h-5 w-5 mr-2 text-green-500"/>Key Skills</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysis.skills.map(skill => <span key={skill} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>)}
                      </div>
                    </div>
                     <div>
                      <h3 className="font-semibold text-slate-500 dark:text-slate-400 flex items-center text-sm"><ClockIcon className="h-5 w-5 mr-2 text-blue-500"/>Experience</h3>
                      <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{analysis.experience}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-500 dark:text-slate-400 flex items-center text-sm"><LightbulbIcon className="h-5 w-5 mr-2 text-yellow-500"/>Suggested Roles</h3>
                       <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">{analysis.potentialJobTitles.join(', ')}</p>
                    </div>
                  </div>
                </div>
                <UsageSummary usage={tokenUsage} />
                <DeveloperApiDemo />
              </div>
            </div>
          )}
        </main>
      </div>

      <ResumeEditorModal
        isOpen={isResumeModalOpen}
        initialResumeText={resumeText}
        onClose={() => setIsResumeModalOpen(false)}
        onSave={handleSaveResume}
        updateTokenUsage={(usage) => setTokenUsage(prev => ({...prev, resumeSuggestion: {
            ...prev.resumeSuggestion,
            totalTokens: prev.resumeSuggestion.totalTokens + usage.totalTokens,
        }}))}
        setError={setError}
      />

      <AIInterviewAgentModal 
        job={interviewJob} 
        jobHistoryEntry={currentJobHistoryEntry}
        questions={interviewQuestions} 
        isLoading={loading.questions} 
        onClose={() => setInterviewJob(null)}
        setError={setError}
        onAnalysisComplete={(usage) => setTokenUsage(prev => ({...prev, interviewAnalysis: usage }))}
        onHistoryUpdate={() => {
            refreshJobHistory();
            if (interviewJob) {
                // This is slightly delayed, but we need to find the updated entry
                const updatedEntry = listJobsFromHistory().find(h => h.id === interviewJob.id);
                setCurrentJobHistoryEntry(updatedEntry || null);
            }
        }}
      />
    </>
  );
}