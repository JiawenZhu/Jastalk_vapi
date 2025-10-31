import React, { useMemo, useState, useEffect } from 'react';
import { listJobs as listJobsFromHistory } from '../services/jobHistoryService';

const Ring = ({ value }) => {
  const size = 112, stroke = 10; const r = (size-stroke)/2; const C = 2*Math.PI*r; const off = C - (value/100)*C;
  const color = value>=75?'stroke-green-500':value>=50?'stroke-yellow-500':'stroke-red-500';
  return (
    <div className="relative" style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={stroke} r={r} cx={size/2} cy={size/2} fill="transparent" />
        <circle className={`${color}`} strokeWidth={stroke} r={r} cx={size/2} cy={size/2} fill="transparent" strokeDasharray={`${C} ${C}`} style={{strokeDashoffset:off}} strokeLinecap="round" />
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
    <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">{label}</span><span className="text-slate-600 dark:text-slate-300">{Math.round(value||0)}%</span></div>
    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
      <div className="h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{width:`${Math.max(0,Math.min(100,value||0))}%`}}></div>
    </div>
  </div>
);

const FeedbackPanel = ({ a }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between text-xs">
      <div className="text-slate-600 dark:text-slate-300">Analysis ID: <span className="font-mono text-indigo-300">{a.id}</span></div>
      <button className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2" onClick={()=>navigator.clipboard.writeText(a.id||'')}>Copy ID</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
      <div className="flex items-center justify-center"><Ring value={a.overallScore||0} /></div>
      <div className="sm:col-span-2">
        <Bar label="Communication" value={a.communicationScore||0} />
        <Bar label="Confidence" value={a.confidenceScore||0} />
        <Bar label="Answer Relevance" value={a.relevanceScore||0} />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
        <div className="text-sm font-semibold mb-1 text-emerald-700 dark:text-emerald-300">Strengths</div>
        <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">{a.strengths || 'N/A'}</div>
      </div>
      <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
        <div className="text-sm font-semibold mb-1 text-rose-700 dark:text-rose-300">Areas for Improvement</div>
        <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">{a.areasForImprovement || 'N/A'}</div>
      </div>
    </div>
  </div>
);

const AIInterviewHistoryModal = ({ job, onClose }) => {
  const [entry, setEntry] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const list = listJobsFromHistory();
    const e = list.find(x => x.id === job.id);
    setEntry(e || null);
    setSelected(e?.interviewHistory?.slice(-1)[0] || null);
  }, [job]);

  if (!job) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Interview History</h2>
            <p className="text-indigo-600 dark:text-indigo-300 font-medium">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-3xl leading-none">&times;</button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
            <ul className="p-3 space-y-2">
              {(entry?.interviewHistory || []).slice().reverse().map((a) => (
                <li key={a.id}>
                  <button onClick={() => setSelected(a)} className={`w-full text-left p-3 rounded-md text-sm transition-colors ${selected?.id===a.id
                    ? 'bg-indigo-100 dark:bg-indigo-600/25 text-indigo-800 dark:text-slate-100 ring-1 ring-indigo-300 dark:ring-indigo-400/60'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}`}>
                    <div className="font-semibold">Session from {new Date(a.timestamp).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(a.timestamp).toLocaleTimeString()}</div>
                  </button>
                </li>
              ))}
              {(entry?.interviewHistory?.length || 0) === 0 && (
                <li className="text-xs text-slate-600 dark:text-slate-400 p-3">No interview sessions yet.</li>
              )}
            </ul>
          </div>
          <div className="w-2/3 overflow-y-auto p-6">
            {selected ? <FeedbackPanel a={selected} /> : <div className="text-sm text-slate-500">Select a session to view the report.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInterviewHistoryModal;
