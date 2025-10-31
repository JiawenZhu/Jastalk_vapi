import React, { useMemo, useState } from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';
import { analyzeInterviewTranscript } from '../services/geminiAIService';
import { addAnalysisToJob } from '../services/jobHistoryService';
import { MicrophoneIcon, StopCircleIcon, DocumentTextIcon, AcademicCapIcon, ArrowPathIcon } from '../components/AIJobFitIcons';

const AIInterviewModal = ({ job, questions = [], onClose, onAnalysisComplete, onOpenHistory }) => {
  const { isConnecting, isSessionActive, error, transcript, startConversation, stopConversation } = useLiveConversation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const USER_NAME = 'Evan';
  const INTERVIEWER_LABEL = 'JasTalk Interviewer';

  const systemInstruction = useMemo(() => {
    const qList = questions.map((q, i) => `\n${i + 1}. ${q}`).join('');
    return `You are a professional interviewer for the position of "${job.title}" at ${job.company}. Start by greeting the candidate and then ask the first question from the list. Proceed through the list of questions. You can ask one or two relevant follow-up questions if the candidate's response is interesting. After the last question, thank the candidate and conclude the interview. Here are the questions: ${qList}`;
  }, [job, questions]);

  const handleStart = () => startConversation(systemInstruction, false);
  const handleEnd = () => stopConversation();

  const handleGetFeedback = async () => {
    setIsAnalyzing(true);
    try {
      const { analysis, usage } = await analyzeInterviewTranscript(job.id, transcript);
      setAnalysis(analysis);
      try {
        const { id, timestamp, ...rest } = analysis || {};
        addAnalysisToJob(job.id, rest);
      } catch (e) { /* ignore local save errors */ }
      onAnalysisComplete?.(usage);
      setActiveTab('feedback');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Derive a simple status indicator from transcript
  const last = transcript[transcript.length - 1];
  const lastIsAi = last?.speaker === 'ai' || last?.speaker === 'model';
  const status = isConnecting
    ? 'Connecting…'
    : !isSessionActive
      ? (transcript.length > 0 ? 'Interview Ended' : 'Ready')
      : (lastIsAi ? 'Speaking…' : 'Listening…');

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Interview Agent</h2>
            <a href={job.url || '#'} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 decoration-indigo-500/40 text-sm font-medium">
              {job.title} at {job.company}
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl"><span className="font-semibold">Description:</span> {job.description?.slice(0, 220)}{job.description && job.description.length > 220 ? '…' : ''}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300 mt-1">
              <span className={`inline-block h-3 w-3 rounded-full ${status.startsWith('Speak') ? 'bg-blue-500 animate-pulse' : status.startsWith('Listen') ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{status}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-3xl leading-none">&times;</button>
        </div>

        {/* Tabs appear only after feedback is generated */}
        {analysis && (
          <div className="px-5 pt-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('transcript')} className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-2 ${activeTab==='transcript'?'bg-indigo-600 text-white border-indigo-600':'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>
                <AcademicCapIcon className="h-4 w-4" /> Transcript
              </button>
              <button onClick={() => setActiveTab('feedback')} className={`px-3 py-1.5 rounded-md border inline-flex items-center gap-2 ${activeTab==='feedback'?'bg-indigo-600 text-white border-indigo-600':'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>
                <DocumentTextIcon className="h-4 w-4" /> Feedback Report
              </button>
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {transcript.length === 0 && (
                <div className="text-slate-500 text-sm">Ready to practice? Click "Start Interview" to begin your mock interview.</div>
              )}
              {transcript.map((t, i) => (
                <div key={i} className={`flex ${(t.speaker === 'ai' || t.speaker === 'model') ? 'justify-start' : 'justify-end'}`}>
                  {(t.speaker === 'ai' || t.speaker === 'model') ? (
                    <div className="max-w-[85%] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 p-3 rounded-lg">
                      <div className="text-xs font-semibold mb-1">{INTERVIEWER_LABEL}</div>
                      <div className="whitespace-pre-wrap text-sm">{t.text}</div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] bg-indigo-600 text-white p-3 rounded-lg">
                      <div className="text-xs font-semibold mb-1">{USER_NAME}</div>
                      <div className="whitespace-pre-wrap text-sm">{t.text}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'feedback' && (
            <FeedbackPanel analysis={analysis} />
          )}
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex gap-2">
            {/* Single primary action shown here depending on state */}
            {isSessionActive ? (
              <button onClick={handleEnd} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md inline-flex items-center gap-2">
                <StopCircleIcon className="h-4 w-4" /> End Interview
              </button>
            ) : transcript.length === 0 ? (
              <button onClick={handleStart} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md inline-flex items-center gap-2" disabled={isConnecting}>
                <MicrophoneIcon className="h-4 w-4" /> Start Interview
              </button>
            ) : (
              <button onClick={handleGetFeedback} className={`px-4 py-2 ${isAnalyzing ? 'bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-md inline-flex items-center gap-2`} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Analyzing…' : 'Get Feedback'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onOpenHistory?.(job)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200">Interview History</button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Feedback visuals
const Ring = ({ value }) => {
  const size = 112, stroke = 10; const r = (size-stroke)/2; const C = 2*Math.PI*r; const off = C - (value/100)*C;
  const color = value>=75?'stroke-green-500':value>=50?'stroke-yellow-500':'stroke-red-500';
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={stroke} r={r} cx={size/2} cy={size/2} fill="transparent" />
        <circle className={`${color} transition-all duration-700`} strokeWidth={stroke} r={r} cx={size/2} cy={size/2} fill="transparent" strokeDasharray={`${C} ${C}`} style={{strokeDashoffset:off}} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold">{Math.round(value||0)}</div>
        <div className="text-xs text-slate-500">Overall</div>
      </div>
    </div>
  );
};

const Bar = ({ label, value }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{label}</span><span className="text-slate-500">{Math.round(value||0)}%</span></div>
    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
      <div className="h-2 rounded-full bg-indigo-500" style={{width:`${Math.max(0,Math.min(100,value||0))}%`}}></div>
    </div>
  </div>
);

const FeedbackPanel = ({ analysis }) => {
  if (!analysis) return (
    <div className="text-sm text-slate-500">No feedback yet. Click "Get Feedback" to analyze the transcript.</div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-600 dark:text-slate-300">Analysis ID: <span className="font-mono text-indigo-500">{analysis.id}</span></div>
        <button className="text-indigo-500 hover:underline" onClick={()=>navigator.clipboard.writeText(analysis.id||'')}>Copy ID</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="flex items-center justify-center"><Ring value={analysis.overallScore||0} /></div>
        <div className="sm:col-span-2">
          <Bar label="Communication" value={analysis.communicationScore||0} />
          <Bar label="Confidence" value={analysis.confidenceScore||0} />
          <Bar label="Answer Relevance" value={analysis.relevanceScore||0} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-semibold mb-1 text-emerald-700 dark:text-emerald-300">Strengths</div>
          <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{analysis.strengths || 'N/A'}</div>
        </div>
        <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-semibold mb-1 text-rose-700 dark:text-rose-300">Areas for Improvement</div>
          <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{analysis.areasForImprovement || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default AIInterviewModal;
