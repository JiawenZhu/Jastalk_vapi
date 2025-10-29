"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCcw, Download } from 'lucide-react';

const serverApi = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SERVER_URL) || '';
const serverBase = serverApi.replace(/\/$/, '');

export default function ResultsPage() {
  const params = useParams();
  const conversationId = Array.isArray(params?.conversationId) ? params.conversationId[0] : params?.conversationId;
  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState([]);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);

  const fetchRecordings = async () => {
    if (!conversationId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${serverBase}/recordings?conversation_id=${conversationId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecordings(json || []);
    } catch (e) {
      setError(e?.message || '加载录制失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecordings(); }, [conversationId]);
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        const r = await fetch(`${serverBase}/conversations/${conversationId}/messages`);
        if (!r.ok) return;
        const data = await r.json();
        const metaMsg = Array.isArray(data?.messages)
          ? data.messages.find((m) => m?.content?.type === 'conversation_metadata')
          : null;
        if (metaMsg?.content?.metadata) setMeta(metaMsg.content.metadata);
      } catch {}
    })();
  }, [conversationId]);

  // If a sessionId is provided via query, fetch interview summary
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const sid = sp.get('sessionId');
    if (!sid) return;
    (async () => {
      try {
        const r = await fetch(`${serverBase}/interview/${sid}/summary`);
        if (!r.ok) return;
        const data = await r.json();
        setSummary(data?.data || null);
      } catch {}
    })();
  }, []);

  const latest = recordings?.[0];

  const handleDownload = async (recId) => {
    try {
      const r = await fetch(`${serverBase}/recordings/${recId}/download-link`);
      if (!r.ok) throw new Error('无法获取下载链接');
      const { download_link } = await r.json();
      if (download_link) window.open(download_link, '_blank');
    } catch (e) { console.error(e); }
  };

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">面试结果</h1>
        <p className="text-sm text-gray-500">会话：{conversationId}</p>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={fetchRecordings} className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
            <RefreshCcw className="h-4 w-4"/> 刷新
          </button>
          {latest && (
            <button onClick={() => handleDownload(latest.recording_id)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded">
              <Download className="h-4 w-4"/> 下载最新录制
            </button>
          )}
        </div>

        {meta && (
          <div className="mt-4 border rounded p-4 bg-gray-50">
            <div className="font-medium mb-2">面试元数据</div>
            {meta.role && (<div className="text-sm text-gray-700">职位：{meta.role}</div>)}
            {meta.interview_type && (<div className="text-sm text-gray-700">面试类型：{meta.interview_type}</div>)}
            {Array.isArray(meta.questions) && meta.questions.length > 0 && (
              <div className="text-sm text-gray-700 mt-2">
                <div className="font-medium">题目：</div>
                <ol className="list-decimal ms-5">
                  {meta.questions.map((q, i) => (<li key={i}>{q}</li>))}
                </ol>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-gray-500">加载中…</p>
        ) : error ? (
          <p className="mt-8 text-red-600">{error}</p>
        ) : recordings.length === 0 ? (
          <p className="mt-8 text-gray-500">尚未找到录制。</p>
        ) : (
          <div className="mt-6 grid gap-6">
            {recordings.map((r) => (
              <div key={r.recording_id} className="border rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">录制 {r.recording_id.slice(0,8)}</div>
                    <div className="text-xs text-gray-500">状态：{r.status}，创建时间：{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleDownload(r.recording_id)} className="text-blue-600 text-sm">下载</button>
                </div>
                {r.status === 'ready' && (
                  <RecordingPreview recordingId={r.recording_id} />
                )}
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className="mt-8 border rounded p-4">
            <div className="font-semibold mb-2">面试评分总结</div>
            <div className="text-sm text-gray-700">平均得分：{summary.average_score}/100</div>
            <div className="text-sm text-gray-700 mt-1">答题数：{summary.answered_questions} / {summary.total_questions}</div>
            <div className="text-sm text-gray-700 mt-2">总体反馈：</div>
            <div className="text-sm whitespace-pre-wrap mt-1">{summary.overall_feedback}</div>
            {Array.isArray(summary.question_scores) && summary.question_scores.length > 0 && (
              <div className="mt-3">
                <div className="font-medium">题目得分明细</div>
                <ol className="list-decimal ms-5 mt-1">
                  {summary.question_scores.map((q, i) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">{q.question}</div>
                      <div className="text-gray-600">得分：{q.score}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function RecordingPreview({ recordingId }) {
  const [link, setLink] = useState('');
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${serverBase}/recordings/${recordingId}/download-link`);
        if (!r.ok) return;
        const { download_link } = await r.json();
        if (mounted) setLink(download_link || '');
      } catch {}
    })();
    return () => { mounted = false };
  }, [recordingId]);
  if (!link) return null;
  const isVideo = /\.mp4(\?|$)/i.test(link) || /video/.test(link);
  return (
    <div className="mt-3">
      {isVideo ? (
        <video src={link} controls className="w-full rounded"/>
      ) : (
        <audio src={link} controls className="w-full"/>
      )}
    </div>
  );
}
