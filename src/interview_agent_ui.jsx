import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Users, Target, BarChart3, CreditCard, LogOut, ChevronDown, Search, Play, Clock, MessageSquare, X, ArrowLeft, Mic, MicOff, Phone, PhoneOff, Volume2, Briefcase, MapPin } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';
import templatesJson from '../interview_templates.json';
import flowPrompt from '../interview_flow_prompt.md?raw';
import { searchJobs, applyToJob } from './utils/talentSolutionApi';
import JobCard from './components/JobCard';
// Type definitions (JSDoc comments for better IDE support)
/**
 * @typedef {Object} InterviewTemplate
 * @property {string} subTitle
 * @property {'Easy'|'Medium'|'Hard'} difficulty
 * @property {number} duration_minutes
 * @property {number} question_count
 * @property {string[]} questions
 */

/**
 * @typedef {Object.<string, InterviewTemplate[]>} InterviewTemplates
 */

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} name
 * @property {number} positions
 * @property {string} color
 * @property {string} bgColor
 * @property {string} borderColor
 * @property {string} icon
 * @property {InterviewTemplate[]} interviews
 */

/**
 * @typedef {Object} UserAnswer
 * @property {string} question
 * @property {string} answer
 */

/**
 * @typedef {Object} VapiInstance
 * @property {function(string, function): void} on
 * @property {function(string, any): void} emit
 * @property {function(Object): Promise<void>} start
 * @property {function(): void} stop
 * @property {function(): boolean} isActive
 */

// 从环境变量读取 Vapi 公钥 / 助手 ID（兼容 Vite 与 Next）
// Safely read envs in both Vite (import.meta.env) and Next (process.env)
const _VITE = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const _PROC = (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env) ? globalThis.process.env : {};
const VAPI_PUBLIC_KEY = _VITE.VITE_VAPI_PUBLIC_KEY || _PROC.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '';
// Assistant id is optional; when omitted we will start a session with inline config
const VAPI_ASSISTANT_ID = _VITE.VITE_VAPI_ASSISTANT_ID || _PROC.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '';
const VAPI_ASSISTANT_ID_VOICE = _VITE.VITE_VAPI_ASSISTANT_ID_VOICE || '';
const VAPI_ASSISTANT_ID_VIDEO = _VITE.VITE_VAPI_ASSISTANT_ID_VIDEO || '';
// Optional env-driven model/voice/transcriber so you can point to Gemini
const MODEL_PROVIDER = _VITE.VITE_VAPI_MODEL_PROVIDER || 'google';
// Prefer Google Realtime for end-to-end (LLM + TTS + STT)
const MODEL_NAME = _VITE.VITE_VAPI_MODEL || 'gemini-2.5-flash';
const MODEL_PRIMARY = _VITE.VITE_VAPI_MODEL_PRIMARY || 'gemini-2.5-flash';
const MODEL_FALLBACK = _VITE.VITE_VAPI_MODEL_FALLBACK || 'gemini-2.0-flash';
const VOICE_PROVIDER = _VITE.VITE_VAPI_VOICE_PROVIDER || 'playht';
const VOICE_ID = _VITE.VITE_VAPI_VOICE_ID || 'jennifer-playht';
const TRANSCRIBER_PROVIDER = _VITE.VITE_VAPI_TRANSCRIBER_PROVIDER || 'google';
const TRANSCRIBER_MODEL = _VITE.VITE_VAPI_TRANSCRIBER_MODEL || 'gemini-2.0-flash';
// Optional remote templates JSON (override/merge with local file)
const TEMPLATES_URL = _VITE.VITE_TEMPLATES_URL || '';

const InterviewAgentUI = ({ preselectedInterview = null, onExit = null } = {}) => {
  const [currentLang, setCurrentLang] = useState('en');
  const [activeMenu, setActiveMenu] = useState(preselectedInterview ? 'interview' : 'interviews');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeInterview, setActiveInterview] = useState(preselectedInterview);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interviewTemplates, setInterviewTemplates] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Job search state
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSearchLocation, setJobSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [customInterviews, setCustomInterviews] = useState([]);

  // Vapi 语音状态
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const vapiRef = useRef(null);
  // Allow env to choose provider; default to pipecat to use our agent
  const DEFAULT_PROVIDER = (_VITE.VITE_PROVIDER || _PROC.NEXT_PUBLIC_PROVIDER || 'pipecat').toLowerCase();
  const PIPECAT_LOCAL = (_VITE.VITE_PIPECAT_LOCAL || _PROC.NEXT_PUBLIC_PIPECAT_LOCAL || '').toString() === '1';
  const [provider, setProvider] = useState(DEFAULT_PROVIDER === 'pipecat' ? 'pipecat' : 'vapi'); // 'pipecat' | 'vapi'
  const pipClientRef = useRef(null);
  const pipAudioRef = useRef(null);
  // 自动推进题目：在用户回答“final”后等待面试官开口，再切到下一题
  const awaitNextQuestionRef = useRef(false);
  const nextTimerRef = useRef(null);
  // 规范化问题文本，便于从面试官话术中对齐题号
  const questionsNormalizedRef = useRef([]);
  useEffect(() => {
    const normalize = (s = '') =>
      String(s).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
    questionsNormalizedRef.current = (activeInterview?.questions || []).map((q) => normalize(q));
  }, [activeInterview]);
  const detectQuestionIndexFromAssistant = (text) => {
    if (!text || !activeInterview?.questions?.length) return null;
    const total = activeInterview.questions.length;
    // 1) 直接解析 "Question 2" / "第2题" / "问题2"
    const m = String(text).match(/(?:Question|问题|第)\s*(\d+)\s*(?:[:：题]|$)/i);
    if (m) {
      const idx = Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1));
      if (!Number.isNaN(idx)) return idx;
    }
    // 2) 根据问题文本匹配（全文或前缀片段）
    const normalize = (s = '') => String(s).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
    const n = normalize(text);
    const list = questionsNormalizedRef.current || [];
    for (let i = 0; i < list.length; i++) {
      const qn = list[i];
      if (!qn) continue;
      // 完整包含
      if (qn.length > 0 && n.includes(qn)) return i;
      // 前缀片段匹配（取前 8 个词）
      const prefix = qn.split(' ').slice(0, 8).join(' ');
      if (prefix && n.includes(prefix)) return i;
    }
    return null;
  };
  // Mode and audio pipeline choices
  const [interviewMode, setInterviewMode] = useState('voice'); // 'voice' | 'video'

  // 加载面试模板数据（本地静态 + 可选远端覆盖/合并）
  useEffect(() => {
    try {
      const local = templatesJson && typeof templatesJson === 'object' ? templatesJson : {};
      setInterviewTemplates(local);
    } catch (error) {
      console.warn('Error loading interview templates:', error);
      setInterviewTemplates({});
    }

    const fetchRemote = async () => {
      if (!TEMPLATES_URL) return;
      try {
        const res = await fetch(TEMPLATES_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`fetch ${TEMPLATES_URL} failed: ${res.status}`);
        const remote = await res.json();
        // 合并：按分类键合并数组（去重靠标题）
        const merged = { ...local };
        Object.entries(remote || {}).forEach(([cat, arr]) => {
          const a = Array.isArray(arr) ? arr : [];
          const existing = Array.isArray(merged[cat]) ? merged[cat] : [];
          const byTitle = new Map(existing.map((x) => [x?.subTitle, x]));
          a.forEach((x) => { if (x && x.subTitle && !byTitle.has(x.subTitle)) existing.push(x); });
          merged[cat] = existing;
        });
        setInterviewTemplates(merged);
      } catch (e) {
        console.warn('Remote templates fetch failed:', e);
      }
    };
    fetchRemote();
  }, []);

  // 模拟 Vapi SDK（用于演示）
  // 在实际项目中，请使用真实的 @vapi-ai/web SDK
  const createMockVapi = () => {
    const events = {};
    let isActive = false;

    return {
      on: (event, callback) => {
        if (!events[event]) events[event] = [];
        events[event].push(callback);
      },
      emit: (event, data) => {
        if (events[event]) {
          events[event].forEach(cb => cb(data));
        }
      },
      start: async (config) => {
        console.log('🎤 Mock Vapi: Starting interview...', config);
        isActive = true;

        // 模拟通话开始
        setTimeout(() => {
          if (events['call-start']) {
            events['call-start'].forEach(cb => cb());
          }
        }, 500);

        // 模拟 AI 问候
        setTimeout(() => {
          if (events['message']) {
            events['message'].forEach(cb => cb({
              type: 'transcript',
              role: 'assistant',
              transcript: config.firstMessage || 'Hello! Welcome to your interview. Are you ready to begin?'
            }));
          }
        }, 1500);

        // 模拟用户可以说话的状态
        return Promise.resolve();
      },
      stop: () => {
        console.log('🛑 Mock Vapi: Stopping interview...');
        isActive = false;
        if (events['call-end']) {
          events['call-end'].forEach(cb => cb());
        }
      },
      isActive: () => isActive
    };
  };

  // 初始化 Vapi（真实 SDK）
  useEffect(() => {
    if (!vapiRef.current) {
      if (!VAPI_PUBLIC_KEY) {
        console.warn('VAPI public key not found. Set VITE_VAPI_PUBLIC_KEY or NEXT_PUBLIC_VAPI_PUBLIC_KEY in .env');
        vapiRef.current = createMockVapi();
      } else {
        vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
      }
      setupVapiListeners();
    }

    return () => {
      if (vapiRef.current && isCallActive) {
        vapiRef.current.stop();
      }
      try { pipClientRef.current?.disconnect(); pipClientRef.current = null; } catch { }
    };
  }, []);

  // 设置 Vapi 事件监听器
  const setupVapiListeners = () => {
    if (!vapiRef.current) return;

    const vapi = vapiRef.current;

    // 通话开始
    vapi.on('call-start', () => {
      console.log('Call started');
      setIsCallActive(true);
      setAssistantMessage('Interview started. Please wait for the first question...');
    });

    // 通话结束
    vapi.on('call-end', () => {
      console.log('Call ended');
      setIsCallActive(false);
      setIsSpeaking(false);
      setLiveTranscript('');
    });

    // 用户开始说话
    vapi.on('speech-start', () => {
      setIsSpeaking(true);
    });

    // 用户停止说话
    vapi.on('speech-end', () => {
      setIsSpeaking(false);
    });

    // 接收转录和消息
    vapi.on('message', (message) => {
      console.log('Message:', message);

      if (message.type === 'transcript') {
        if (message.role === 'user') {
          setLiveTranscript(message.transcript);
        } else if (message.role === 'assistant') {
          setAssistantMessage(message.transcript);
          // 如果此前用户已经完成回答，且面试官开始说话，则自动切到下一题
          if (awaitNextQuestionRef.current && activeInterview) {
            awaitNextQuestionRef.current = false;
            if (nextTimerRef.current) { try { clearTimeout(nextTimerRef.current); } catch { } nextTimerRef.current = null; }
            setCurrentQuestionIndex((idx) => {
              const last = activeInterview?.questions?.length ? activeInterview.questions.length - 1 : 0;
              return Math.min(idx + 1, last);
            });
          }
          // 额外：若检测到面试官问的是题库中的第 N 题，则直接同步到该题
          try {
            const detected = detectQuestionIndexFromAssistant(message.transcript || '');
            if (detected != null) {
              setCurrentQuestionIndex((prev) => (detected > prev ? detected : prev));
              awaitNextQuestionRef.current = false;
              if (nextTimerRef.current) { try { clearTimeout(nextTimerRef.current); } catch { } nextTimerRef.current = null; }
            }
          } catch { }
        }
      }

      // 当用户回答完整时，保存回答
      if (message.type === 'transcript' && message.role === 'user' && message.transcriptType === 'final') {
        const finalText = (message.transcript || '').trim();
        setCurrentAnswer(finalText);
        // 记下本题答案
        try {
          const q = activeInterview?.questions?.[currentQuestionIndex];
          if (q && finalText) {
            setUserAnswers((arr) => [...arr, { question: q, answer: finalText }]);
          }
        } catch { }
        // 设置等待下一题标记，并启动兜底定时器（面试官未开口也推进）
        awaitNextQuestionRef.current = true;
        if (nextTimerRef.current) { try { clearTimeout(nextTimerRef.current); } catch { } }
        nextTimerRef.current = setTimeout(() => {
          if (awaitNextQuestionRef.current && activeInterview) {
            awaitNextQuestionRef.current = false;
            setCurrentQuestionIndex((idx) => {
              const last = activeInterview?.questions?.length ? activeInterview.questions.length - 1 : 0;
              return Math.min(idx + 1, last);
            });
          }
        }, 3500);
      }
    });

    // 音量级别（用于可视化）
    vapi.on('volume-level', (volume) => {
      setVolumeLevel(volume);
    });

    // 错误处理
    vapi.on('error', (error) => {
      try {
        const detail = error?.error?.message || error?.message || JSON.stringify(error);
        console.error('Vapi error:', error);
        alert('Voice interview error: ' + detail);
      } catch {
        console.error('Vapi error:', error);
        alert('Voice interview error');
      }
      setIsCallActive(false);
    });
  };

  // 开始语音面试
  const startVoiceInterview = async () => {
    // 当选择 Pipecat 时，直接跳转至后端自带的客户端页面，由后端处理连接与会话
    if (provider === 'pipecat') {
      if (!activeInterview) {
        alert('Please select an interview template first.');
        return;
      }
      try {
        // Prefer the original Pipecat Playground UI; allow override via env.
        // For server/agent/bot.py we mount the default UI at /playground.
        // For pipecat-quickstart/bot.py the default UI is at /client/.
        // Prefer explicit backend URL. With FastAPI (server/server), root `/` redirects to a Daily room.
        // With the Pipecat runner (server/agent), `/client/` serves the Playground when USE_CUSTOM_CLIENT=0.
        const defaultHost = `http://localhost:${import.meta.env.VITE_PIPECAT_PORT || '7860'}`;
        const base = (
          import.meta.env.VITE_PIPECAT_PLAYGROUND_URL ||
          import.meta.env.VITE_PIPECAT_CLIENT_URL ||
          `${defaultHost}/`
        );
        const params = new URLSearchParams({
          template: activeInterview?.subTitle || '',
          language: currentLang || 'en',
          questions: Array.isArray(activeInterview?.questions) ? activeInterview.questions.join('\n') : ''
        });
        // 在新窗口打开，保留当前 UI；如需同窗口可改为 window.location.href
        window.open(`${base}?${params.toString()}`, '_blank');
        return;
      } catch (e) {
        console.error('Failed to redirect to Pipecat client:', e);
        alert('Failed to open Pipecat client page.');
        return;
      }
    }

    // 其他 provider（默认 Vapi）继续原有流程
    if (!vapiRef.current || !activeInterview) return;

    try {
      // 根据模型名构造配置；对于 Google Realtime（*live*）模型，不需要单独的 voice/transcriber
      const buildConfig = (modelName) => {
        // 仅使用流程文件 + 题库信息生成系统提示词
        const systemPrompt = `${flowPrompt.trim()}\n\nINTERVIEW_TEMPLATE: ${activeInterview.subTitle}\n\nQUESTIONS:\n${activeInterview.questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}\n\nCURRENT_QUESTION_NUMBER: ${currentQuestionIndex + 1}\nLANGUAGE: ${currentLang}`;

        const base = {
          name: `${activeInterview.subTitle} Interview`,
          model: {
            provider: MODEL_PROVIDER,
            model: modelName,
            messages: [
              {
                role: "system",
                content: `${flowPrompt.trim()}\n\nYou are a professional interviewer conducting a ${activeInterview.subTitle} interview.

INTERVIEW QUESTIONS:
${activeInterview.questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
1. Greet the candidate warmly
2. Ask ONE question at a time from the list above, in order
3. Listen carefully to the candidate's response
4. Provide brief encouraging feedback (e.g., "Thank you for that insight")
5. Move to the next question after they finish answering
6. If an answer is too brief (less than 30 seconds), ask ONE follow-up question
7. Be professional, friendly, and supportive
8. After all questions are answered, thank them and end the interview

Current question number: ${currentQuestionIndex + 1}

Be natural and conversational. This is a real interview.`
              }
            ],
            temperature: 0.7
          },
          firstMessage: currentLang === 'zh' ?
            `你好！欢迎参加${activeInterview.subTitle}面试。我会问你一系列问题。准备好了吗？` :
            currentLang === 'es' ?
              `¡Hola! Bienvenido a la entrevista de ${activeInterview.subTitle}. Te haré una serie de preguntas. ¿Estás listo?` :
              `Hello! Welcome to your ${activeInterview.subTitle} interview. I'll be asking you a series of questions. Are you ready to begin?`,
          // Reduce accidental hangups/timeouts during practice
          firstMessageMode: 'assistant-speaks-first',
          // Prevent phrase-based auto hangups and extend timeouts for web sessions
          endCallPhrases: [],
          silenceTimeoutSeconds: 600,
          maxDurationSeconds: 1800,
        };
        // 覆盖 messages，仅保留流程+题目作为系统提示
        try {
          // Make it explicit that the agent must not hang up by itself
          const doNotHang = `\n\nIMPORTANT: Never end or hang up the interview yourself. Do not trigger any end-call tools or say any goodbye phrase that would end the call. Always wait for the user to press the End Interview button.`;
          base.model.messages = [{ role: "system", content: `${systemPrompt}${doNotHang}` }];
        } catch { }
        const isGoogleRealtime = MODEL_PROVIDER === 'google' && /(live|realtime)/i.test(modelName);
        if (!isGoogleRealtime) {
          base.voice = { provider: VOICE_PROVIDER, voiceId: VOICE_ID };
          base.transcriber = {
            provider: TRANSCRIBER_PROVIDER,
            model: TRANSCRIBER_MODEL,
            language: currentLang === 'zh' ? 'zh' : currentLang === 'es' ? 'es' : (TRANSCRIBER_PROVIDER === 'google' ? 'English' : 'en')
          };
        }
        return base;
      };

      // Provider routing: Pipecat Cloud primary, Vapi fallback
      if (provider === 'pipecat') {
        if (PIPECAT_LOCAL) {
          // Local: connect to SmallWebRTC runner at http://127.0.0.1:7860 via /api/offer (proxied)
          try {
            console.log('Starting local Pipecat connection...');

            // Request microphone permissions first
            console.log('Requesting media permissions...');
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: interviewMode === 'video'
            });
            console.log('Media permissions granted:', {
              audio: stream.getAudioTracks().length,
              video: stream.getVideoTracks().length
            });

            // Create transport - try minimal configuration first
            console.log('Creating SmallWebRTC transport with offerUrl:', '/api/offer');
            const transport = new SmallWebRTCTransport({
              offerUrl: '/api/offer'
            });

            console.log('Transport object:', transport);

            console.log('Transport created, creating client...');
            const client = new PipecatClient({
              enableCam: interviewMode === 'video',
              enableMic: true,
              transport,
              userMedia: stream  // Pass the media stream we got from getUserMedia
            });
            pipClientRef.current = client;

            // Set up event handlers before connecting
            const onTrack = (track, participant) => {
              console.log('Track received:', track.kind, 'from participant:', participant?.id);
              try {
                if (track?.kind === 'audio' && participant && !participant.local) {
                  const el = pipAudioRef.current || document.createElement('audio');
                  if (!pipAudioRef.current) {
                    pipAudioRef.current = el;
                    el.hidden = true;
                    el.autoplay = true;
                    document.body.appendChild(el);
                  }
                  const audioStream = el.srcObject instanceof MediaStream ? el.srcObject : new MediaStream();
                  const exists = audioStream.getAudioTracks().some(t => t.id === track.id);
                  if (!exists) audioStream.addTrack(track);
                  el.srcObject = audioStream;
                  el.muted = false;
                  el.play?.();
                  console.log('Audio track added to element');
                }
              } catch (error) {
                console.error('Error handling track:', error);
              }
            };

            // Add event listeners
            if (client.on && RTVIEvent.TrackStarted) {
              client.on(RTVIEvent.TrackStarted, onTrack);
              console.log('Track event listener added');
            }

            console.log('Connecting to local Pipecat transport...');
            await client.connect();
            console.log('✅ Connected to local Pipecat!');

            // Pass template/language as app message
            try {
              const payload = {
                type: 'start-interview',
                template: activeInterview?.subTitle,
                language: currentLang
              };
              if (typeof client.sendAppMessage === 'function') {
                await client.sendAppMessage(payload);
                console.log('✅ Sent interview template:', payload);
              }
            } catch (e) {
              console.warn('Could not send app message:', e);
            }

            setIsCallActive(true);
            console.log('✅ Voice interview started successfully');

          } catch (e) {
            console.error('❌ Pipecat local connect failed:', e);
            console.error('Error details:', {
              message: e?.message,
              stack: e?.stack,
              name: e?.name
            });
            alert('Pipecat local connect failed: ' + (e?.message || e));
            setIsCallActive(false);
          }
        } else {
          // Cloud: connect via Daily through relay
          try {
            const resp = await fetch('/api/pipecat/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: interviewMode,
                template: activeInterview?.subTitle,
                language: currentLang,
              }),
            });
            const text = await resp.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch { }
            if (!resp.ok) throw new Error((json && json.error) || text || 'Pipecat start failed');

            const transport = new DailyTransport();
            const client = new PipecatClient({ enableCam: interviewMode === 'video', enableMic: true, transport });
            pipClientRef.current = client;

            const onTrack = (track, p) => {
              try {
                if (track?.kind === 'audio' && p && !p.local) {
                  const el = pipAudioRef.current || document.createElement('audio');
                  if (!pipAudioRef.current) { pipAudioRef.current = el; el.hidden = true; el.autoplay = true; document.body.appendChild(el); }
                  const stream = el.srcObject instanceof MediaStream ? el.srcObject : new MediaStream();
                  const exists = stream.getAudioTracks().some(t => t.id === track.id);
                  if (!exists) stream.addTrack(track);
                  el.srcObject = stream; el.muted = false; el.play?.();
                }
              } catch { }
            };
            try { client.on?.(RTVIEvent.TrackStarted, onTrack); } catch { }

            await client.connect({ room_url: json.url, token: json.token });
            try {
              const payload = { type: 'start-interview', template: activeInterview?.subTitle, language: currentLang };
              if (typeof client.sendAppMessage === 'function') await client.sendAppMessage(payload);
            } catch { }
            setIsCallActive(true);
          } catch (e) {
            console.error('Pipecat connect failed:', e);
            alert('Pipecat connect failed: ' + (e?.message || e));
            setIsCallActive(false);
          }
        }
      } else {
        // Vapi flow
        if (interviewMode === 'voice' && VAPI_ASSISTANT_ID_VOICE) {
          // Prefer Gemini 2.5 Flash (non-realtime). STT/TTS use configured providers.
          let chosen = 'gemini-2.5-flash';
          let cfg = buildConfig(chosen);
          try {
            await vapiRef.current.start(
              VAPI_ASSISTANT_ID_VOICE,
              {
                model: cfg.model,
                voice: cfg.voice,
                transcriber: cfg.transcriber,
                firstMessage: cfg.firstMessage,
                firstMessageMode: cfg.firstMessageMode,
                endCallPhrases: cfg.endCallPhrases,
                silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                maxDurationSeconds: cfg.maxDurationSeconds,
              }
            );
          } catch (e1) {
            try {
              chosen = 'gemini-2.0-flash';
              cfg = buildConfig(chosen);
              await vapiRef.current.start(
                VAPI_ASSISTANT_ID_VOICE,
                {
                  model: cfg.model,
                  voice: cfg.voice,
                  transcriber: cfg.transcriber,
                  firstMessage: cfg.firstMessage,
                  firstMessageMode: cfg.firstMessageMode,
                  endCallPhrases: cfg.endCallPhrases,
                  silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                  maxDurationSeconds: cfg.maxDurationSeconds,
                }
              );
            } catch (e2) {
              const fb = buildConfig('gemini-1.5-flash');
              await vapiRef.current.start(VAPI_ASSISTANT_ID_VOICE, {
                model: fb.model,
                voice: fb.voice,
                transcriber: fb.transcriber,
                firstMessage: fb.firstMessage,
                firstMessageMode: fb.firstMessageMode,
                endCallPhrases: fb.endCallPhrases,
                silenceTimeoutSeconds: fb.silenceTimeoutSeconds,
                maxDurationSeconds: fb.maxDurationSeconds,
              });
            }
          }
        } else if (interviewMode === 'video' && VAPI_ASSISTANT_ID_VIDEO) {
          // Use Gemini 2.5 Flash for video as well (non-realtime)
          let chosen = 'gemini-2.5-flash';
          let cfg = buildConfig(chosen);
          try {
            await vapiRef.current.start(
              VAPI_ASSISTANT_ID_VIDEO,
              {
                model: cfg.model,
                voice: cfg.voice,
                transcriber: cfg.transcriber,
                firstMessage: cfg.firstMessage,
                firstMessageMode: cfg.firstMessageMode,
                endCallPhrases: cfg.endCallPhrases,
                silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                maxDurationSeconds: cfg.maxDurationSeconds,
              }
            );
          } catch (e1) {
            try {
              chosen = 'gemini-2.0-flash';
              cfg = buildConfig(chosen);
              await vapiRef.current.start(
                VAPI_ASSISTANT_ID_VIDEO,
                {
                  model: cfg.model,
                  voice: cfg.voice,
                  transcriber: cfg.transcriber,
                  firstMessage: cfg.firstMessage,
                  firstMessageMode: cfg.firstMessageMode,
                  endCallPhrases: cfg.endCallPhrases,
                  silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                  maxDurationSeconds: cfg.maxDurationSeconds,
                }
              );
            } catch (e2) {
              const fb = buildConfig('gemini-1.5-flash');
              await vapiRef.current.start(
                VAPI_ASSISTANT_ID_VIDEO,
                {
                  model: fb.model,
                  voice: fb.voice,
                  transcriber: fb.transcriber,
                  firstMessage: fb.firstMessage,
                  firstMessageMode: fb.firstMessageMode,
                  endCallPhrases: fb.endCallPhrases,
                  silenceTimeoutSeconds: fb.silenceTimeoutSeconds,
                  maxDurationSeconds: fb.maxDurationSeconds,
                }
              );
            }
          }
        } else if (VAPI_ASSISTANT_ID) {
          let chosen = interviewMode === 'video' ? 'gemini-2.5-flash' : MODEL_PRIMARY;
          let cfg = buildConfig(chosen);
          try {
            await vapiRef.current.start(
              VAPI_ASSISTANT_ID,
              {
                model: cfg.model,
                voice: cfg.voice,
                transcriber: cfg.transcriber,
                firstMessage: cfg.firstMessage,
                firstMessageMode: cfg.firstMessageMode,
                endCallPhrases: cfg.endCallPhrases,
                silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                maxDurationSeconds: cfg.maxDurationSeconds,
              }
            );
          } catch (e1) {
            try {
              chosen = 'gemini-2.0-flash';
              cfg = buildConfig(chosen);
              await vapiRef.current.start(
                VAPI_ASSISTANT_ID,
                {
                  model: cfg.model,
                  voice: cfg.voice,
                  transcriber: cfg.transcriber,
                  firstMessage: cfg.firstMessage,
                  firstMessageMode: cfg.firstMessageMode,
                  endCallPhrases: cfg.endCallPhrases,
                  silenceTimeoutSeconds: cfg.silenceTimeoutSeconds,
                  maxDurationSeconds: cfg.maxDurationSeconds,
                }
              );
            } catch (e2) {
              const fb = buildConfig('gemini-1.5-flash');
              await vapiRef.current.start(
                VAPI_ASSISTANT_ID,
                {
                  model: fb.model,
                  voice: fb.voice,
                  transcriber: fb.transcriber,
                  firstMessage: fb.firstMessage,
                  firstMessageMode: fb.firstMessageMode,
                  endCallPhrases: fb.endCallPhrases,
                  silenceTimeoutSeconds: fb.silenceTimeoutSeconds,
                  maxDurationSeconds: fb.maxDurationSeconds,
                }
              );
            }
          }
        } else {
          const chosen = interviewMode === 'video' ? 'gemini-2.5-flash' : MODEL_PRIMARY;
          try {
            await vapiRef.current.start(buildConfig(chosen));
          } catch (e) {
            console.warn('Primary model failed, trying fallback:', e?.message || e);
            try { await vapiRef.current.start(buildConfig('gemini-2.0-flash')); }
            catch (e2) { await vapiRef.current.start(buildConfig('gemini-1.5-flash')); }
          }
        }
      }
    } catch (error) {
      console.error('Failed to start voice interview:', error);
      alert('Failed to start voice interview. Please check your microphone permissions.');
    }
  };

  // 停止语音面试
  const stopVoiceInterview = () => {
    if (provider === 'pipecat') {
      try { pipClientRef.current?.disconnect(); } catch { }
      pipClientRef.current = null;
    } else {
      if (vapiRef.current && isCallActive) {
        vapiRef.current.stop();
      }
    }
    setIsCallActive(false);
  };

  // Manually advance to next question without breaking the live session
  const nextQuestion = useCallback(() => {
    if (!activeInterview || !activeInterview.questions || activeInterview.questions.length === 0) return;
    const last = activeInterview.questions.length - 1;
    setCurrentQuestionIndex((idx) => {
      const nextIdx = Math.min(idx + 1, last);
      // cancel any pending auto-advance
      awaitNextQuestionRef.current = false;
      if (nextTimerRef.current) {
        try { clearTimeout(nextTimerRef.current); } catch { }
        nextTimerRef.current = null;
      }
      // hint the running agent to move on, but never break the call
      try {
        if (provider === 'pipecat' && pipClientRef.current?.sendClientMessage) {
          pipClientRef.current.sendClientMessage('next-question', { suggestedIndex: nextIdx });
        } else if (provider === 'vapi' && vapiRef.current?.send) {
          // Add a lightweight system nudge for the LLM to proceed
          vapiRef.current.send({
            type: 'add-message',
            message: { role: 'system', content: 'Proceed to the next interview question.' }
          });
        }
      } catch { }
      return nextIdx;
    });
  }, [activeInterview, provider]);

  // Job search handlers
  const handleJobSearch = async (e) => {
    e?.preventDefault();

    if (!jobSearchQuery.trim()) {
      setSearchError('Please enter a job title or keyword');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchJobs({
        query: jobSearchQuery,
        location: jobSearchLocation,
        pageSize: 20
      });

      setSearchResults(results.jobs);

      if (results.jobs.length === 0) {
        setSearchError('No jobs found. Try different keywords or location.');
      }
    } catch (error) {
      console.error('Job search error:', error);
      setSearchError(error.message || 'Failed to search jobs. Please check your API configuration.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateInterview = async (job) => {
    try {
      setGeneratingJobId(job.id);

      // Create interview questions from job description
      const customInterview = {
        id: `custom-${Date.now()}`,
        title: job.title,
        company: job.companyDisplayName || job.company,
        source: 'job-search',
        jobId: job.id,
        difficulty: 'Medium',
        duration_minutes: 30,
        questions: generateQuestionsFromJob(job),
        createdAt: new Date().toISOString()
      };

      // Add to custom interviews
      setCustomInterviews(prev => [customInterview, ...prev]);

      // Optionally start the interview immediately
      setActiveInterview(customInterview);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);

      // Show success message (you could use a toast notification here)
      console.log('Interview generated successfully!', customInterview);
    } catch (error) {
      console.error('Error generating interview:', error);
      alert('Failed to generate interview. Please try again.');
    } finally {
      setGeneratingJobId(null);
    }
  };

  const generateQuestionsFromJob = (job) => {
    // Extract key information from job
    const title = job.title;
    const description = job.description?.replace(/<[^>]*>/g, '') || '';
    const qualifications = job.qualifications?.replace(/<[^>]*>/g, '') || '';
    const responsibilities = job.responsibilities?.replace(/<[^>]*>/g, '') || '';

    // Generate relevant interview questions based on the job
    const questions = [
      `Tell me about your experience with ${title} roles. What makes you a good fit for this position?`,
      `This role requires specific qualifications. Can you walk me through your relevant experience?`,
      `What interests you most about this ${title} position at ${job.companyDisplayName || job.company}?`,
      `Can you describe a challenging project you've worked on that relates to the responsibilities in this role?`,
      `How would you approach the key responsibilities mentioned in this job description?`
    ];

    // Add technical questions if the job seems technical
    if (description.toLowerCase().includes('software') ||
        description.toLowerCase().includes('engineer') ||
        description.toLowerCase().includes('developer')) {
      questions.push(
        'Can you walk me through a complex technical problem you solved recently?',
        'How do you stay updated with the latest technologies in your field?'
      );
    }

    // Add management questions if it seems like a senior role
    if (title.toLowerCase().includes('senior') ||
        title.toLowerCase().includes('lead') ||
        title.toLowerCase().includes('manager')) {
      questions.push(
        'How do you approach mentoring junior team members?',
        'Describe your leadership style and how you handle team conflicts.'
      );
    }

    return questions.slice(0, 8); // Return up to 8 questions
  };

  const handleApplyToJob = async (job) => {
    try {
      setApplyingJobId(job.id);

      const result = await applyToJob({
        jobId: job.id,
        applicationInfo: job.applicationInfo
      });

      if (result.success) {
        // Show success message based on application method
        if (result.method === 'redirect') {
          console.log('Application URL opened:', result.url);
        } else if (result.method === 'email') {
          console.log('Email application initiated:', result.email);
        } else if (result.method === 'instruction') {
          alert(`Application Instructions:\n\n${result.instruction}`);
        }
      } else {
        alert(result.error || 'Unable to apply to this job');
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Failed to process application. Please try again.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const getTranslations = () => {
    const translations = {
      en: {
        welcome: "Welcome",
        practice: "Let's Practice",
        mainMenu: "MAIN MENU",
        mockInterviews: "Mock Interviews",
        customInterviews: "Custom Interviews",
        results: "Results",
        billing: "Billing",
        freeTrial: "Free Trial",
        signOut: "Sign Out",
        chooseRoles: "Choose from",
        careerRoles: "career roles",
        simulated: "More than 24K simulated interviews",
        searchPlaceholder: "Search career roles or keywords...",
        categoriesFound: "categories found",
        positions: "positions",
        exploreInterviews: "Explore Interviews",
        backToCategories: "Back to Categories",
        startInterview: "Start Interview",
        minutes: "min",
        questions: "questions",
        createCustom: "Create Custom Interviews",
        generateInterview: "Generate Interview",
        jobTitle: "Job Title",
        jobDescription: "Job Description",
        noCustomYet: "No custom interviews yet",
        searchJobs: "Search Jobs",
        jobSearchPlaceholder: "Enter job title or keywords...",
        locationPlaceholder: "Location (optional)",
        searchButton: "Search",
        searching: "Searching...",
        jobsFound: "jobs found",
        noJobsFound: "No jobs found",
        applyNow: "Apply",
        generatedInterviews: "Generated Interviews",
        yourResults: "Your Results",
        totalInterviews: "Total Interviews",
        noMockYet: "No mock interviews yet",
        billingAccount: "Billing & Account",
        status: "Status",
        plan: "Plan",
        upgradePremium: "Upgrade to Premium",
        email: "Email",
        startRecording: "Start Recording",
        stopRecording: "Stop Recording",
        nextQuestion: "Next Question",
        finishInterview: "Finish Interview",
        yourAnswer: "Your Answer",
        typeAnswer: "Type your answer here or use voice recording...",
        interviewTips: "Interview Tips",
        whatLookingFor: "What They're Looking For",
        progress: "Progress",
        difficulty: "Difficulty",
        duration: "Duration",
        score: "Score"
      },
      zh: {
        welcome: "欢迎",
        practice: "开始练习",
        mainMenu: "主菜单",
        mockInterviews: "模拟面试",
        customInterviews: "自定义面试",
        results: "结果",
        billing: "订阅",
        freeTrial: "免费试用",
        signOut: "退出登录",
        chooseRoles: "选择",
        careerRoles: "个职位角色",
        simulated: "超过 24K 次模拟面试",
        searchPlaceholder: "搜索职位或关键词...",
        categoriesFound: "个分类",
        positions: "个职位",
        exploreInterviews: "探索面试",
        backToCategories: "返回分类",
        startInterview: "开始面试",
        minutes: "分钟",
        questions: "个问题",
        createCustom: "创建自定义面试",
        generateInterview: "生成面试",
        jobTitle: "职位名称",
        jobDescription: "职位描述",
        noCustomYet: "还没有自定义面试",
        searchJobs: "搜索职位",
        jobSearchPlaceholder: "输入职位名称或关键词...",
        locationPlaceholder: "地点（可选）",
        searchButton: "搜索",
        searching: "搜索中...",
        jobsFound: "个职位",
        noJobsFound: "未找到职位",
        applyNow: "申请",
        generatedInterviews: "已生成面试",
        yourResults: "您的结果",
        totalInterviews: "总面试次数",
        noMockYet: "还没有模拟面试",
        billingAccount: "账单与账户",
        status: "状态",
        plan: "计划",
        upgradePremium: "升级至高级版",
        email: "邮箱",
        startRecording: "开始录制",
        stopRecording: "停止录制",
        nextQuestion: "下一题",
        finishInterview: "完成面试",
        yourAnswer: "您的回答",
        typeAnswer: "在此输入您的回答或使用语音录制...",
        interviewTips: "面试技巧",
        whatLookingFor: "考察重点",
        progress: "进度",
        difficulty: "难度",
        duration: "时长",
        score: "得分"
      },
      es: {
        welcome: "Bienvenido",
        practice: "Vamos a Practicar",
        mainMenu: "MENÚ PRINCIPAL",
        mockInterviews: "Entrevistas Simuladas",
        customInterviews: "Entrevistas Personalizadas",
        results: "Resultados",
        billing: "Facturación",
        freeTrial: "Prueba Gratuita",
        signOut: "Cerrar Sesión",
        chooseRoles: "Elige entre",
        careerRoles: "roles profesionales",
        simulated: "Más de 24K entrevistas",
        searchPlaceholder: "Buscar roles...",
        categoriesFound: "categorías",
        positions: "posiciones",
        exploreInterviews: "Explorar",
        backToCategories: "Volver",
        startInterview: "Iniciar",
        minutes: "min",
        questions: "preguntas",
        createCustom: "Crear Personalizadas",
        generateInterview: "Generar",
        jobTitle: "Título",
        jobDescription: "Descripción",
        noCustomYet: "Sin entrevistas",
        searchJobs: "Buscar Empleos",
        jobSearchPlaceholder: "Título o palabras clave...",
        locationPlaceholder: "Ubicación (opcional)",
        searchButton: "Buscar",
        searching: "Buscando...",
        jobsFound: "empleos encontrados",
        noJobsFound: "No se encontraron empleos",
        applyNow: "Aplicar",
        generatedInterviews: "Entrevistas Generadas",
        yourResults: "Resultados",
        totalInterviews: "Total",
        noMockYet: "Sin entrevistas",
        billingAccount: "Facturación",
        status: "Estado",
        plan: "Plan",
        upgradePremium: "Actualizar",
        email: "Correo",
        startRecording: "Grabar",
        stopRecording: "Detener",
        nextQuestion: "Siguiente",
        finishInterview: "Finalizar",
        yourAnswer: "Tu Respuesta",
        typeAnswer: "Escribe tu respuesta o usa grabación de voz...",
        interviewTips: "Consejos",
        whatLookingFor: "Qué Buscan",
        progress: "Progreso",
        difficulty: "Dificultad",
        duration: "Duración",
        score: "Puntuación"
      }
    };
    // Use safe lookup without TypeScript-only assertions
    return translations[currentLang] || translations.en;
  };

  const t = getTranslations();

  const interviewCategories = {
    Software: { icon: '💻', color: 'from-blue-400 to-cyan-400', bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50', borderColor: 'border-blue-200' },
    'Data Science': { icon: '📊', color: 'from-purple-400 to-pink-400', bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50', borderColor: 'border-purple-200' },
    Design: { icon: '🎨', color: 'from-pink-400 to-rose-400', bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50', borderColor: 'border-pink-200' },
    Finance: { icon: '💰', color: 'from-green-400 to-emerald-400', bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50', borderColor: 'border-green-200' },
    Legal: { icon: '⚖️', color: 'from-gray-400 to-slate-400', bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50', borderColor: 'border-gray-200' },
    Media: { icon: '📺', color: 'from-red-400 to-orange-400', bgColor: 'bg-gradient-to-br from-red-50 to-orange-50', borderColor: 'border-red-200' },
    Engineering: { icon: '⚙️', color: 'from-yellow-400 to-amber-400', bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50', borderColor: 'border-yellow-200' },
    Marketing: { icon: '📈', color: 'from-indigo-400 to-blue-400', bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50', borderColor: 'border-indigo-200' },
    Product: { icon: '📦', color: 'from-cyan-400 to-teal-400', bgColor: 'bg-gradient-to-br from-cyan-50 to-teal-50', borderColor: 'border-cyan-200' },
    Writing: { icon: '✍️', color: 'from-orange-400 to-red-400', bgColor: 'bg-gradient-to-br from-orange-50 to-red-50', borderColor: 'border-orange-200' },
    Business: { icon: '💼', color: 'from-teal-400 to-green-400', bgColor: 'bg-gradient-to-br from-teal-50 to-green-50', borderColor: 'border-teal-200' },
    Consulting: { icon: '🤝', color: 'from-lime-400 to-green-400', bgColor: 'bg-gradient-to-br from-lime-50 to-green-50', borderColor: 'border-lime-200' }
  };

  const categories = Object.keys(interviewTemplates).map((category, idx) => ({
    id: idx + 1,
    name: category,
    positions: interviewTemplates[category]?.length || 0,
    color: interviewCategories[category]?.color || 'from-gray-500 to-slate-500',
    bgColor: interviewCategories[category]?.bgColor || 'bg-gradient-to-br from-gray-50 to-slate-50',
    borderColor: interviewCategories[category]?.borderColor || 'border-gray-200',
    icon: interviewCategories[category]?.icon || '📋',
    interviews: interviewTemplates[category] || []
  }));

  const renderContent = () => {
    if (activeInterview) {
      const progress = ((currentQuestionIndex + 1) / activeInterview.questions.length) * 100;
      const currentQuestion = activeInterview.questions[currentQuestionIndex];

      return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/40 to-purple-50/40">
          <div className="max-w-6xl mx-auto p-8">
            <button
              onClick={() => {
                if (onExit) {
                  onExit();
                } else {
                  setActiveInterview(null);
                  setCurrentQuestionIndex(0);
                  setUserAnswers([]);
                  setCurrentAnswer('');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 mb-6"
            >
              <X size={20} />
              <span className="font-medium">Close Interview</span>
            </button>

            {/* Progress Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    {activeInterview.subTitle}
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Question {currentQuestionIndex + 1} of {activeInterview.questions.length}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-500 mb-2">{t.progress}</div>
                  <div className="w-56 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-2">{Math.round(progress)}%</div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-md ${activeInterview.difficulty === 'Easy' ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white' :
                  activeInterview.difficulty === 'Medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' :
                    'bg-gradient-to-r from-red-400 to-pink-400 text-white'
                  }`}>
                  {activeInterview.difficulty}
                </span>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-400 to-cyan-400 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md">
                  <Clock size={16} />
                  {activeInterview.duration_minutes} {t.minutes}
                </span>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-semibold rounded-xl shadow-md">
                  {userAnswers.length} / {activeInterview.questions.length} answered
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
              <div className="mb-8">
                <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-500 p-8 rounded-2xl shadow-lg overflow-hidden">
                  {/* Decorative background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 opacity-20 rounded-full -mr-16 -mt-16"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <MessageSquare className="text-white" size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Interview Question
                      </h3>
                    </div>
                    <p className="text-xl text-gray-800 leading-relaxed font-medium">
                      {currentQuestion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100 shadow-lg overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200 opacity-20 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                      <span className="text-2xl">💡</span>
                      {t.interviewTips}
                    </h4>
                    <ul className="text-gray-700 text-sm space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>Use the STAR method (Situation, Task, Action, Result)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>Be specific with examples from your experience</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>Focus on your individual contributions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>Quantify your impact when possible</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="relative bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-2xl border-2 border-green-100 shadow-lg overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 opacity-20 rounded-full -mr-12 -mt-12"></div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                      <span className="text-2xl">✓</span>
                      {t.whatLookingFor}
                    </h4>
                    <ul className="text-gray-700 text-sm space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Technical knowledge and depth</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Problem-solving approach</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Clear communication skills</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Real-world application experience</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="mb-6">
                <label className="block text-base font-bold text-gray-700 mb-3 flex items-center justify-between">
                  <span>{t.yourAnswer}</span>
                  {isCallActive && (
                    <span className="flex items-center gap-2 text-sm font-normal">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-green-600">Voice Interview Active</span>
                    </span>
                  )}
                </label>

                {/* 语音可视化 */}
                {isCallActive && (
                  <div className="mb-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200">
                    {/* 音量可视化 */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 rounded-full transition-all duration-100 ${i < volumeLevel * 10 ? 'bg-gradient-to-t from-blue-500 to-purple-500' : 'bg-gray-200'
                            }`}
                          style={{
                            height: `${20 + (i * 4)}px`,
                            opacity: i < volumeLevel * 10 ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>

                    {/* 说话状态 */}
                    {isSpeaking && (
                      <div className="text-center mb-3">
                        <p className="text-blue-600 font-semibold flex items-center justify-center gap-2">
                          <Volume2 size={20} className="animate-pulse" />
                          You are speaking...
                        </p>
                      </div>
                    )}

                    {/* 实时转录 */}
                    {liveTranscript && (
                      <div className="bg-white p-4 rounded-xl shadow-sm mb-3">
                        <p className="text-sm text-gray-500 mb-1">Live Transcription:</p>
                        <p className="text-gray-800">{liveTranscript}</p>
                      </div>
                    )}

                    {/* AI 回复 */}
                    {assistantMessage && (
                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-xl shadow-sm">
                        <p className="text-sm text-purple-600 mb-1 font-semibold flex items-center gap-2">
                          <MessageSquare size={16} />
                          Interviewer:
                        </p>
                        <p className="text-gray-800">{assistantMessage}</p>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={isCallActive}
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 min-h-[180px] text-base transition-all duration-300 shadow-sm hover:shadow-md ${isCallActive ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-200'
                    }`}
                  placeholder={isCallActive ? 'Voice interview in progress...' : t.typeAnswer}
                />

                {isCallActive && (
                  <p className="text-sm text-gray-500 mt-2">
                    💡 Tip: Your voice responses are being transcribed automatically
                  </p>
                )}
              </div>

              {/* Mode toggle: Voice vs Video */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Interview mode:</span>
                <button
                  type="button"
                  onClick={() => setInterviewMode('voice')}
                  className={`px-3 py-1 rounded-xl border text-sm transition-colors ${interviewMode === 'voice'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  disabled={isCallActive}
                >
                  Voice (cheap)
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewMode('video')}
                  className={`px-3 py-1 rounded-xl border text-sm transition-colors ${interviewMode === 'video'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  disabled={isCallActive}
                >
                  Video (multimodal)
                </button>
              </div>

              {/* Provider toggle: Vapi (study && testing) vs Real-Time Agent (Voice & Video Recording Support) */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Provider:</span>
                <button
                  type="button"
                  onClick={() => setProvider('vapi')}
                  className={`px-3 py-1 rounded-xl border text-sm transition-colors ${provider === 'vapi'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  disabled={isCallActive}
                >
                  Vapi (study && testing)
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('pipecat')}
                  className={`px-3 py-1 rounded-xl border text-sm transition-colors ${provider === 'pipecat'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  disabled={isCallActive}
                >
                  Real-Time Agent (Voice & Video Recording Support)
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap items-center">
                {/* 语音面试按钮 */}
                {!isCallActive ? (
                  <button
                    onClick={startVoiceInterview}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Phone size={22} />
                    <span className="text-lg">Start Voice Interview</span>
                  </button>
                ) : (
                  <button
                    onClick={stopVoiceInterview}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <PhoneOff size={22} />
                    <span className="text-lg">End Voice Interview</span>
                  </button>
                )}

                {/* 手动下一题：在通话中可用，不中断会话 */}
                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={!isCallActive || !activeInterview || currentQuestionIndex >= (activeInterview?.questions?.length || 1) - 1}
                  className={`px-4 py-3 rounded-2xl font-semibold border transition-colors ${isCallActive ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  title="Go to next question without ending the interview"
                >
                  Next Question
                </button>

                {/* 文本录入按钮（语音时禁用）*/}
                <button
                  onClick={() => {
                    if (currentAnswer.trim()) {
                      setUserAnswers([...userAnswers, { question: currentQuestion, answer: currentAnswer }]);
                      setCurrentAnswer('');
                    }

                    if (currentQuestionIndex < activeInterview.questions.length - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else {
                      alert(`Interview completed! You answered ${userAnswers.length + 1} questions. Great job!`);
                      if (onExit) {
                        onExit();
                      } else {
                        setActiveInterview(null);
                        setCurrentQuestionIndex(0);
                        setUserAnswers([]);
                      }
                    }
                  }}
                  disabled={isCallActive}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg text-lg ${isCallActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-xl transform hover:scale-105'
                    }`}
                >
                  {currentQuestionIndex < activeInterview.questions.length - 1 ? t.nextQuestion : t.finishInterview}
                </button>
              </div>

              {/* 语音控制提示 */}
              {isCallActive && (
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    <strong>🎤 Voice Interview Tips:</strong>
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• Speak clearly and at a moderate pace</li>
                    <li>• Wait for the interviewer to finish asking before responding</li>
                    <li>• Take a brief pause when you finish to let the system detect</li>
                    <li>• Click "End Voice Interview" when you're ready to move on</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (selectedCategory) {
      return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="bg-white border-b shadow-sm p-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">{t.backToCategories}</span>
            </button>

            <div className={`relative ${selectedCategory.bgColor} rounded-2xl p-8 shadow-lg overflow-hidden`}>
              {/* Decorative elements */}
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${selectedCategory.color} opacity-10 rounded-full -mr-32 -mt-32`}></div>
              <div className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr ${selectedCategory.color} opacity-10 rounded-full -ml-24 -mb-24`}></div>

              <div className="relative z-10 flex items-center gap-6">
                <div className={`w-24 h-24 bg-gradient-to-br ${selectedCategory.color} rounded-2xl flex items-center justify-center text-5xl shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-300`}>
                  {selectedCategory.icon}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{selectedCategory.name}</h1>
                  <p className="text-lg text-gray-600 flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 bg-gradient-to-r ${selectedCategory.color} rounded-full`}></span>
                    {selectedCategory.positions} {t.positions} available
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedCategory.interviews.map((interview, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${selectedCategory.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-14 h-14 bg-gradient-to-br ${selectedCategory.color} rounded-xl flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      {selectedCategory.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{interview.subTitle}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${interview.difficulty === 'Easy' ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white' :
                          interview.difficulty === 'Medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' :
                            'bg-gradient-to-r from-red-400 to-pink-400 text-white'
                          } shadow-sm`}>
                          {interview.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <Clock size={16} className="text-blue-500" />
                      <span className="font-medium">{interview.duration_minutes} {t.minutes}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <MessageSquare size={16} className="text-purple-500" />
                      <span className="font-medium">{interview.question_count} {t.questions}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveInterview(interview);
                      setCurrentQuestionIndex(0);
                      setUserAnswers([]);
                      setCurrentAnswer('');
                    }}
                    className={`w-full bg-gradient-to-r ${selectedCategory.color} text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                  >
                    <Play size={18} />
                    {t.startInterview}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeMenu === 'custom') {
      return (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">{t.createCustom}</h1>
            <p className="text-gray-600 mb-8">Search for jobs and generate personalized interview prep</p>

            {/* Job Search Section */}
            <div className="bg-white rounded-xl p-6 border shadow-sm mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-orange-500" />
                {t.searchJobs}
              </h3>
              <form onSubmit={handleJobSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t.jobTitle}</label>
                    <input
                      type="text"
                      value={jobSearchQuery}
                      onChange={(e) => setJobSearchQuery(e.target.value)}
                      placeholder={t.jobSearchPlaceholder}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                      <MapPin size={14} />
                      Location
                    </label>
                    <input
                      type="text"
                      value={jobSearchLocation}
                      onChange={(e) => setJobSearchLocation(e.target.value)}
                      placeholder={t.locationPlaceholder}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Search size={18} />
                  {isSearching ? t.searching : t.searchButton}
                </button>
              </form>

              {/* Search Error */}
              {searchError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              )}

              {/* Search Results Count */}
              {searchResults.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  {searchResults.length} {t.jobsFound}
                </div>
              )}
            </div>

            {/* Job Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Search Results</h3>
                <div className="grid grid-cols-1 gap-6">
                  {searchResults.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onGenerateInterview={handleGenerateInterview}
                      onApply={handleApplyToJob}
                      isGenerating={generatingJobId === job.id}
                      isApplying={applyingJobId === job.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Generated Custom Interviews */}
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">{t.generatedInterviews}</h3>
              {customInterviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">{t.noCustomYet}</p>
                  <p className="text-sm text-gray-400 mt-2">Search for jobs and generate interviews</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setActiveInterview(interview);
                        setCurrentQuestionIndex(0);
                        setUserAnswers([]);
                      }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <Briefcase size={20} className="text-orange-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 truncate">{interview.title}</h4>
                          <p className="text-sm text-gray-600 truncate">{interview.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{interview.questions.length} {t.questions}</span>
                        <span>{interview.duration_minutes} {t.minutes}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveInterview(interview);
                          setCurrentQuestionIndex(0);
                          setUserAnswers([]);
                        }}
                        className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {t.startInterview}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeMenu === 'results') {
      return (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">{t.yourResults}</h1>
            <p className="text-gray-600 mb-8">Track your progress and improve your skills</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="text-orange-500" size={24} />
                  <span className="text-sm text-gray-600">{t.totalInterviews}</span>
                </div>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-blue-500" size={24} />
                  <span className="text-sm text-gray-600">{t.mockInterviews}</span>
                </div>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="text-purple-500" size={24} />
                  <span className="text-sm text-gray-600">{t.customInterviews}</span>
                </div>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-green-500" size={24} />
                  <span className="text-sm text-gray-600">Shared Results</span>
                </div>
                <p className="text-3xl font-bold">0</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 border text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">{t.noMockYet}</p>
              <p className="text-sm text-gray-400">Start practicing to see your results here</p>
            </div>
          </div>
        </div>
      );
    }

    if (activeMenu === 'billing') {
      return (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">{t.billingAccount}</h1>
            <p className="text-gray-600 mb-8">Manage your subscription and billing information</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Subscription Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.status}</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{t.freeTrial}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t.plan}</span>
                    <span className="font-medium">{t.freeTrial}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Feature Access</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Practice Interviews</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Enabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">View Results</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Disabled</span>
                  </div>
                </div>
                <button className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors">
                  {t.upgradePremium}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">{t.email}</span>
                  <p className="font-medium">user@email.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-32 -mb-32"></div>

          <div className="relative z-10 max-w-4xl">
            <h1 className="text-5xl font-bold text-white mb-4">
              {t.chooseRoles} <span className="bg-white text-purple-600 px-4 py-1 rounded-full">+{Object.values(interviewTemplates).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)}</span> {t.careerRoles}
            </h1>
            <p className="text-xl text-blue-100">{t.simulated}</p>
          </div>
        </div>

        <div className="px-8 py-8 bg-white shadow-sm">
          <div className="relative max-w-3xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="w-full pl-14 pr-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-lg transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
          <p className="text-base text-gray-600 mt-4 font-medium">{categories.length} {t.categoriesFound}</p>
        </div>
        <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Background gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-3xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {category.icon}
                  </div>
                  <div className={`px-3 py-1.5 bg-gradient-to-r ${category.color} text-white text-xs font-semibold rounded-full shadow-md`}>
                    {category.positions} {t.positions}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {category.name}
                </h3>

                <p className="text-sm text-gray-500 mb-4">
                  Explore {category.positions} specialized interview{category.positions !== 1 ? 's' : ''}
                </p>

                <button className="flex items-center gap-2 text-orange-600 font-semibold group-hover:gap-3 transition-all duration-300">
                  <span>{t.exploreInterviews}</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`bg-white border-r flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              <span className="relative z-10">IA</span>
              <div className="absolute inset-0 bg-white opacity-20 rounded-xl"></div>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-gray-900 text-lg">Interview Agent</h1>
                <p className="text-xs text-gray-600">AI Interview Prep</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-xl transition-all duration-300"
          >
            <ChevronDown size={20} className={`text-gray-600 transform transition-transform ${sidebarCollapsed ? 'rotate-90' : '-rotate-90'}`} />
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 m-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <p className="text-sm text-white font-medium">{t.welcome} <span className="font-bold">User</span> 👋</p>
            <p className="text-xs text-blue-100 mt-1">{t.practice}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4">
          {!sidebarCollapsed && <p className="text-xs font-bold text-gray-400 mb-4 tracking-wider">{t.mainMenu}</p>}

          <button
            onClick={() => { setActiveMenu('interviews'); setSelectedCategory(null); setActiveInterview(null); }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${activeMenu === 'interviews' ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            title={sidebarCollapsed ? t.mockInterviews : ''}
          >
            <Users size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.mockInterviews}</span>}
          </button>

          <button
            onClick={() => { setActiveMenu('custom'); setSelectedCategory(null); setActiveInterview(null); }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${activeMenu === 'custom' ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            title={sidebarCollapsed ? t.customInterviews : ''}
          >
            <Target size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.customInterviews}</span>}
          </button>

          <button
            onClick={() => { setActiveMenu('results'); setSelectedCategory(null); setActiveInterview(null); }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${activeMenu === 'results' ? 'bg-orange-400 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            title={sidebarCollapsed ? t.results : ''}
          >
            <BarChart3 size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.results}</span>}
          </button>

          <button
            onClick={() => { setActiveMenu('billing'); setSelectedCategory(null); setActiveInterview(null); }}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 relative transition-colors ${activeMenu === 'billing' ? 'bg-orange-400 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            title={sidebarCollapsed ? t.billing : ''}
          >
            <CreditCard size={20} />
            {!sidebarCollapsed && (
              <>
                <span className="font-medium">{t.billing}</span>
                <span className="ml-auto bg-orange-400 text-white text-xs px-2 py-1 rounded-full">{t.freeTrial}</span>
              </>
            )}
            {sidebarCollapsed && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="p-4 border-t">
          {!sidebarCollapsed ? (
            <>
              <div className="mb-4 relative">
                <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {currentLang === 'en' ? 'English' : currentLang === 'zh' ? '中文' : 'Español'}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {showLanguageMenu && (
                  <div className="absolute bottom-full mb-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                    <button onClick={() => { setCurrentLang('en'); setShowLanguageMenu(false); }} className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'en' ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white' : 'hover:bg-gray-50'}`}>
                      English
                    </button>
                    <button onClick={() => { setCurrentLang('zh'); setShowLanguageMenu(false); }} className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'zh' ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white' : 'hover:bg-gray-50'}`}>
                      中文
                    </button>
                    <button onClick={() => { setCurrentLang('es'); setShowLanguageMenu(false); }} className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'es' ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white' : 'hover:bg-gray-50'}`}>
                      Español (MX)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
                  <span className="relative z-10">U</span>
                  <div className="absolute inset-0 bg-white opacity-20 rounded-xl"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">User Name</p>
                  <p className="text-xs text-gray-500">user@email.com</p>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl transition-all duration-300 font-medium">
                <LogOut size={18} />
                <span className="text-sm">{t.signOut}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="w-full flex items-center justify-center p-3 hover:bg-blue-50/60 rounded-xl transition-all duration-300 mb-3 border-2 border-transparent hover:border-blue-200/70"
                title="Language"
              >
                <Globe size={20} className="text-blue-400" />
              </button>
              {showLanguageMenu && (
                <div className="absolute bottom-20 left-20 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  <button onClick={() => { setCurrentLang('en'); setShowLanguageMenu(false); }} className={`w-full text-left px-5 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'en' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'hover:bg-gray-50'}`}>
                    English
                  </button>
                  <button onClick={() => { setCurrentLang('zh'); setShowLanguageMenu(false); }} className={`w-full text-left px-5 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'zh' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'hover:bg-gray-50'}`}>
                    中文
                  </button>
                  <button onClick={() => { setCurrentLang('es'); setShowLanguageMenu(false); }} className={`w-full text-left px-5 py-3 text-sm font-medium transition-all duration-200 ${currentLang === 'es' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'hover:bg-gray-50'}`}>
                    Español (MX)
                  </button>
                </div>
              )}

              <button
                className="w-full flex items-center justify-center p-3 hover:bg-gray-100 rounded-xl transition-all duration-300 mb-3"
                title={t.signOut}
              >
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
                  <span className="relative z-10">U</span>
                  <div className="absolute inset-0 bg-white opacity-20 rounded-xl"></div>
                </div>
              </button>

              <button className="w-full flex items-center justify-center p-3 hover:bg-gray-100 rounded-xl transition-all duration-300">
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default InterviewAgentUI;
