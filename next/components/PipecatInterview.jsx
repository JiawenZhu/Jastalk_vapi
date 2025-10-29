"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Play, StopCircle, Video, VideoOff, Loader2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { RTVIClient, RTVIEvent } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";

const serverApi = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SERVER_URL) || '';
const serverBase = serverApi.replace(/\/$/, '');

export default function PipecatInterview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  // Basic metadata inputs
  const [jobRole, setJobRole] = useState("");
  // Interview type should match server enum values, e.g. 'Frontend Development'
  const [interviewType, setInterviewType] = useState("Frontend Development");
  const [questionsText, setQuestionsText] = useState("");

  const transport = useMemo(() => new DailyTransport(), []);

  // Prefill from query params and optional autostart
  useEffect(() => {
    if (!searchParams) return;
    const role = searchParams.get('role') || '';
    const itype = searchParams.get('interview_type') || '';
    const qs = searchParams.get('questions') || '';
    const autostart = searchParams.get('autostart');
    if (role) setJobRole(role);
    if (itype) setInterviewType(itype);
    if (qs) setQuestionsText(qs.replaceAll('\n', '\n'));
    if (autostart && autostart !== '0' && autostart.toLowerCase() !== 'false') {
      // delay a tick to allow client init
      setTimeout(() => startInterview().catch(()=>{}), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Initialize client when needed
  useEffect(() => {
    const c = new RTVIClient({
      enableCam: false,
      enableMic: true,
      transport,
      params: {
        baseUrl: serverBase.replace(/\/api$/, ''),
        endpoints: {
          connect: "/api/bot/connect",
          action: "/api/bot/action",
        },
        requestData: {
          bot_profile: "interviewer",
        },
      },
    });
    setClient(c);
    return () => {
      try { c.disconnect(); } catch {}
    };
  }, [transport]);

  // Recording events: on stop go to results page
  useEffect(() => {
    if (!client) return;
    const onStarted = () => setRecording(true);
    const onStopped = () => {
      setRecording(false);
      if (conversationId) {
        const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
        router.push(`/results/${conversationId}${qs}`);
      }
    };
    const onError = () => setRecording(false);
    client.on?.(RTVIEvent.RecordingStarted, onStarted);
    client.on?.(RTVIEvent.RecordingStopped, onStopped);
    client.on?.(RTVIEvent.RecordingError, onError);
    return () => {
      try {
        client.off?.(RTVIEvent.RecordingStarted, onStarted);
        client.off?.(RTVIEvent.RecordingStopped, onStopped);
        client.off?.(RTVIEvent.RecordingError, onError);
      } catch {}
    };
  }, [client, conversationId, sessionId, router]);

  // Live transcript and event log
  const [messages, setMessages] = useState([]); // {role: 'user'|'bot', text}
  const [events, setEvents] = useState([]);     // {t, type}
  const logEvent = useCallback((type) => {
    setEvents((evts) => [{ t: new Date().toLocaleTimeString(), type }, ...evts].slice(0, 200));
  }, []);
  useEffect(() => {
    if (!client) return;
    const onUser = (data) => {
      const text = typeof data === 'string' ? data : (data?.text || data?.message || JSON.stringify(data));
      setMessages((m) => [...m, { role: 'user', text }]);
      setAnswerBuffer((buf) => (buf ? `${buf}\n${text}` : text));
      logEvent('user-transcript');
    };
    const onBot = (data) => {
      const text = typeof data === 'string' ? data : (data?.text || data?.message || JSON.stringify(data));
      setMessages((m) => [...m, { role: 'bot', text }]);
      logEvent('bot-transcript');
    };
    const onConnected = () => logEvent('connected');
    const onDisconnected = () => logEvent('disconnected');
    const onBotStarted = () => logEvent('bot-started');
    const onBotStopped = () => logEvent('bot-stopped');
    try {
      client.on?.(RTVIEvent.UserTranscript, onUser);
      client.on?.(RTVIEvent.BotTranscript, onBot);
      client.on?.(RTVIEvent.Connected, onConnected);
      client.on?.(RTVIEvent.Disconnected, onDisconnected);
      client.on?.(RTVIEvent.BotStarted, onBotStarted);
      client.on?.(RTVIEvent.BotStopped, onBotStopped);
    } catch {}
    return () => {
      try {
        client.off?.(RTVIEvent.UserTranscript, onUser);
        client.off?.(RTVIEvent.BotTranscript, onBot);
        client.off?.(RTVIEvent.Connected, onConnected);
        client.off?.(RTVIEvent.Disconnected, onDisconnected);
        client.off?.(RTVIEvent.BotStarted, onBotStarted);
        client.off?.(RTVIEvent.BotStopped, onBotStopped);
      } catch {}
    };
  }, [client, logEvent]);

  const createConversation = useCallback(async (title) => {
    const url = `${serverBase}/conversations`;
    // Convert multi-line text to questions array (non-empty lines)
    const questions = questionsText
      .split(/\r?\n/) 
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        role: jobRole || undefined,
        interview_type: interviewType || undefined,
        questions: questions.length ? questions : undefined,
        metadata: {
          // allow arbitrary metadata expansion here later
        },
      }),
    });
    if (!res.ok) throw new Error(`Create conversation failed: ${res.status}`);
    const json = await res.json();
    return json.conversation_id;
  }, []);

  // Interview session via /api/interview
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progressInfo, setProgressInfo] = useState(null);
  const [answerBuffer, setAnswerBuffer] = useState("");

  const createInterviewSession = useCallback(async () => {
    const res = await fetch(`${serverBase}/interview/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interview_type: interviewType })
    });
    if (!res.ok) throw new Error(`create session failed: ${res.status}`);
    const json = await res.json();
    const sid = json?.data?.session_id;
    if (!sid) throw new Error('missing session_id');
    setSessionId(sid);
    const startRes = await fetch(`${serverBase}/interview/${sid}/start`, { method: 'POST' });
    if (!startRes.ok) throw new Error(`start failed: ${startRes.status}`);
    const startJson = await startRes.json();
    setCurrentQuestion(startJson?.data?.current_question || null);
    setProgressInfo(startJson?.data?.progress || null);
    return sid;
  }, [interviewType]);

  const submitAnswerAndNext = useCallback(async () => {
    if (!sessionId) return;
    const payload = { response: answerBuffer, transcription: answerBuffer };
    const res = await fetch(`${serverBase}/interview/${sessionId}/response`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`response failed: ${res.status}`);
    const json = await res.json();
    setAnswerBuffer("");
    setCurrentQuestion(json?.data?.next_question || null);
    setProgressInfo(json?.data?.progress || null);
    if (json?.data?.is_complete) {
      // Auto stop interview if complete
      await completeInterview();
    }
  }, [sessionId, answerBuffer]);

  const completeInterview = useCallback(async () => {
    try {
      if (sessionId) {
        await fetch(`${serverBase}/interview/${sessionId}/complete`, { method: 'POST' });
      }
      // Also stop Daily recording if active
      await stopRecording();
      if (conversationId) {
        const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
        router.push(`/results/${conversationId}${qs}`);
      }
    } catch (e) { console.error(e); }
  }, [sessionId, conversationId, stopRecording, router]);

  const startInterview = useCallback(async () => {
    if (!client) return;
    setError("");
    setConnecting(true);
    try {
      const convId = await createConversation("Voice Interview");
      setConversationId(convId);
      // Create interviewer-agent session (template-based flow)
      await createInterviewSession();

      // Preflight devices to satisfy autoplay/mic policies
      try {
        await client.initDevices();
        client.enableMic(true);
        client.enableCam(false);
      } catch {}

      const anyClient = client;
      if (typeof anyClient.startBot === 'function') {
        await anyClient.startBot({
          requestData: { bot_profile: 'interviewer', conversation_id: convId, interview_type: '' },
        });
      } else {
        // Fallback to pre-v1 flow
        const res = await fetch(`${serverBase}/bot/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot_profile: 'interviewer', conversation_id: convId, interview_type: '' }),
        });
        if (!res.ok) throw new Error(`connect failed: ${res.status}`);
        const payload = await res.json();
        console.log('[connect] server payload (next):', payload);
        const connectUrl = (
          (typeof payload?.url === 'string' && payload.url) ||
          (typeof payload?.room_url === 'string' && payload.room_url) ||
          (typeof payload?.room?.url === 'string' && payload.room.url) ||
          ''
        ).trim();
        const token = (typeof payload?.token === 'string' ? payload.token : '');
        if (!connectUrl || !token) {
          throw new Error(`connect endpoint missing fields. url:${connectUrl ? 'ok' : 'missing'} token:${token ? 'ok' : 'missing'}`);
        }
        const ac = (typeof AbortController !== 'undefined') ? new AbortController() : undefined;
        console.log('[connect] trying auth bundles in order (next)');
        let connected = false;
        const attempts = [
          { room_url: connectUrl, token },                   // strict 0.3.x path
          { url: connectUrl, token },                        // alt top-level url
          { auth: { room_url: connectUrl, token } },         // nested auth
          { auth: { url: connectUrl, token } },              // nested auth with url
          { daily: { room_url: connectUrl, token } },        // nested daily
          { daily: { url: connectUrl, token } },             // nested daily with url
          { room: { url: connectUrl }, token },              // nested room
        ];
        for (const bundle of attempts) {
          try {
            await anyClient.connect(bundle, ac);
            connected = true; break;
          } catch (e) {
            console.warn('[connect] attempt failed (next) with bundle:', bundle, e);
          }
        }
        if (!connected) throw new Error('All connect bundle attempts failed');
      }

      setVoiceMode(true);
      logEvent('connected');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to start interview');
    } finally {
      setConnecting(false);
    }
  }, [client, createConversation]);

  const stopInterview = useCallback(async () => {
    try { client?.disconnect(); } catch {}
    setVoiceMode(false);
    logEvent('disconnected');
  }, [client]);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      try { client?.enableMic(!prev); } catch {}
      return !prev;
    });
  }, [client]);

  const toggleCam = useCallback(() => {
    setCamOn((prev) => {
      try { client?.enableCam(!prev); } catch {}
      return !prev;
    });
  }, [client]);

  const startRecording = useCallback(async () => {
    if (!client || !conversationId) return;
    const payload = {
      service: 'daily',
      action: 'start_recording',
      arguments: [
        { name: 'conversation_id', value: conversationId },
        { name: 'type', value: 'cloud' },
        { name: 'streaming_settings', value: { width: 1280, height: 720, fps: 30 } },
        { name: 'include_audio', value: true },
        { name: 'include_video', value: false },
      ],
    };
    try {
      if (typeof client.sendClientRequest === 'function') {
        await client.sendClientRequest('client-message', payload);
      } else if (typeof client.action === 'function') {
        await client.action(payload);
      }
    } catch (e) {
      console.error(e);
    }
  }, [client, conversationId]);

  const stopRecording = useCallback(async () => {
    if (!client || !conversationId) return;
    const payload = { service: 'daily', action: 'stop_recording', arguments: [{ name: 'conversation_id', value: conversationId }] };
    try {
      if (typeof client.sendClientRequest === 'function') {
        await client.sendClientRequest('client-message', payload);
      } else if (typeof client.action === 'function') {
        await client.action(payload);
      }
    } catch (e) {
      console.error(e);
    }
  }, [client, conversationId]);

  // Text input helpers
  const [text, setText] = useState('');
  const sendText = useCallback(async () => {
    if (!text.trim() || !client) return;
    const t = text.trim();
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setText('');
    try {
      const anyClient = client;
      if (typeof anyClient.sendText === 'function') {
        await anyClient.sendText(t, { run_immediately: true });
      } else if (typeof anyClient.sendClientRequest === 'function') {
        const payload = { service: 'llm', action: 'append_to_messages', arguments: [{ name: 'messages', value: [{ role: 'user', content: [{ type: 'text', text: t }] }] }] };
        await anyClient.sendClientRequest('client-message', payload);
      } else if (typeof anyClient.action === 'function') {
        const payload = { service: 'llm', action: 'append_to_messages', arguments: [{ name: 'messages', value: [{ role: 'user', content: [{ type: 'text', text: t }] }] }] };
        await anyClient.action(payload);
      }
      logEvent('user-message');
    } catch (e) {
      console.error(e);
    }
  }, [client, text, logEvent]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-semibold">Pipecat + Gemini 面试</h1>
      <p className="text-sm text-gray-500 mt-1">使用 Daily 存储音视频；录制结束后跳转到结果页显示。</p>

      {error ? (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      ) : null}

      {!voiceMode ? (
        <div className="mt-6">
          <div className="grid gap-3 mb-4">
            <label className="text-sm">
              职位（可选）
              <input value={jobRole} onChange={(e)=>setJobRole(e.target.value)}
                     placeholder="如：前端工程师"
                     className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            <label className="text-sm">
              面试类型（可选）
              <select value={interviewType} onChange={(e)=>setInterviewType(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                {[
                  'Frontend Development','Backend Development','Full Stack Development','Software Engineering',
                  'Cloud Engineering','DevOps Engineering','Mobile Development','Game Development','Security Engineering','Blockchain Development'
                ].map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            </label>
            <label className="text-sm">
              题目（每行一题，可选）
              <textarea value={questionsText} onChange={(e)=>setQuestionsText(e.target.value)}
                        placeholder={"示例:\n请自我介绍\n讲一个你解决复杂问题的经历"}
                        rows={4}
                        className="mt-1 w-full border rounded px-3 py-2" />
            </label>
          </div>
          <button onClick={startInterview} disabled={connecting || !serverBase}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}
            开始语音面试
          </button>
          {!serverBase && (
            <p className="text-xs text-red-500 mt-2">请设置 NEXT_PUBLIC_SERVER_URL 指向 Gemini 服务的 /api，例如 http://127.0.0.1:7860/api</p>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: controls */}
          <div className="lg:col-span-1 border rounded p-4 bg-gray-50">
            <div className="text-sm text-gray-500 mb-2">Bot audio</div>
            <div className="h-16 rounded bg-black/80 text-white flex items-center justify-center tracking-widest">●●●●●</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={toggleMic} className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                {micOn ? <Mic className="h-4 w-4"/> : <MicOff className="h-4 w-4"/>}
                {micOn ? '麦克风开' : '麦克风关'}
              </button>
              <button onClick={toggleCam} className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                {camOn ? <Video className="h-4 w-4"/> : <VideoOff className="h-4 w-4"/>}
                {camOn ? '摄像头开' : '摄像头关'}
              </button>
              {!recording ? (
                <button onClick={startRecording} className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded">
                  <Play className="h-4 w-4"/> 开始录制
                </button>
              ) : (
                <button onClick={stopRecording} className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded">
                  <StopCircle className="h-4 w-4"/> 停止录制
                </button>
              )}
              <button onClick={stopInterview} className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded">结束面试</button>
            </div>
            {currentQuestion && (
              <div className="mt-4 text-sm">
                <div className="text-gray-500 mb-1">当前问题</div>
                <div className="font-medium">{currentQuestion.question}</div>
                <div className="text-xs text-gray-500 mt-1">难度：{currentQuestion.difficulty} · 类别：{currentQuestion.category}</div>
              </div>
            )}
            <div className="mt-4">
              <button onClick={submitAnswerAndNext} className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded">
                <ArrowRight className="h-4 w-4"/> 下一题
              </button>
            </div>
          </div>
          {/* Center: transcript */}
          <div className="lg:col-span-2 border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Transcript (live)</div>
              <div className="text-xs text-gray-500">{messages.length} messages</div>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {messages.map((m, i) => (
                <div key={i} className={`p-2 rounded ${m.role==='user' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                  <div className="text-xs text-gray-500 mb-1">{m.role}</div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
              {messages.length === 0 && <div className="text-sm text-gray-500">暂无内容</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type message here" className="flex-1 border rounded px-3 py-2"/>
              <button onClick={sendText} className="bg-gray-800 text-white px-4 py-2 rounded">发送</button>
            </div>
          </div>
          {/* Bottom: events */}
          <div className="lg:col-span-3 border rounded p-4">
            <div className="font-medium mb-2">Events</div>
            <div className="grid gap-1 text-sm max-h-48 overflow-auto">
              {events.map((e, idx) => (
                <div key={idx} className="flex justify-between text-gray-600"><span>{e.t}</span><span>{e.type}</span></div>
              ))}
              {events.length === 0 && <div className="text-gray-500">尚无事件</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
