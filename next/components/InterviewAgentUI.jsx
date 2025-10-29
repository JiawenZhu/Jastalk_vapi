"use client";
import React, { useEffect, useRef, useState } from "react";
import { Globe, Users, Target, BarChart3, CreditCard, LogOut, ChevronDown, Search, Play, Clock, MessageSquare, X, ArrowLeft, Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';

// This component is a lightly adapted copy of src/interview_agent_ui.jsx,
// refactored to be safe in Next.js client runtime (no top-level window usage).

const InterviewAgentUI = () => {
  const [currentLang, setCurrentLang] = useState('English');
  const [activeMenu, setActiveMenu] = useState('interviews');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeInterview, setActiveInterview] = useState(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interviewTemplates, setInterviewTemplates] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const vapiRef = useRef(null);

  // Load templates from public or fallback
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/interview_templates.json');
        if (response.ok) {
          const templates = await response.json();
          setInterviewTemplates(templates);
        } else {
          setInterviewTemplates({
            "Software": [
              { "subTitle": "Frontend Developer", "difficulty": "Medium", "duration_minutes": 30, "question_count": 5, "questions": [
                "Can you explain the difference between React and Vue.js?",
                "How do you handle state management in a large React application?",
                "Describe your experience with responsive web design.",
                "What is your approach to testing frontend code?",
                "How do you optimize website performance?"
              ] }
            ]
          });
        }
      } catch {
        setInterviewTemplates({
          "Software": [
            { "subTitle": "Frontend Developer", "difficulty": "Medium", "duration_minutes": 30, "question_count": 5, "questions": [
              "Can you explain the difference between React and Vue.js?",
              "How do you handle state management in a large React application?",
              "Describe your experience with responsive web design.",
              "What is your approach to testing frontend code?",
              "How do you optimize website performance?"
            ] }
          ]
        });
      }
    };
    loadTemplates();
  }, []);

  // Mock Vapi (kept from original for fallback)
  const createMockVapi = () => {
    let active = false;
    const listeners = {};
    return {
      on: (evt, cb) => { listeners[evt] = cb; },
      emit: (evt, data) => { if (listeners[evt]) listeners[evt](data); },
      start: async (config) => { active = true; setIsCallActive(true); },
      stop: () => { active = false; setIsCallActive(false); },
      isActive: () => active,
    };
  };

  const setupVapiListeners = () => {
    if (!vapiRef.current) return;
    vapiRef.current.on('speech-start', () => setIsSpeaking(true));
    vapiRef.current.on('speech-end', () => setIsSpeaking(false));
    vapiRef.current.on('volume', (level) => setVolumeLevel(level || 0));
    vapiRef.current.on('transcript', (text) => setLiveTranscript(text || ''));
    vapiRef.current.on('assistant-message', (msg) => setAssistantMessage(msg || ''));
    vapiRef.current.on('call-end', () => setIsCallActive(false));
  };

  useEffect(() => {
    // Initialize Vapi in client
    const publicKey = 'YOUR_VAPI_PUBLIC_KEY';
    if (Vapi && typeof window !== 'undefined') {
      try {
        vapiRef.current = new Vapi(publicKey);
        setupVapiListeners();
        return () => { vapiRef.current = null; };
      } catch (e) {
        // Fallback to mock if constructor fails
        vapiRef.current = createMockVapi();
        setupVapiListeners();
      }
    } else {
      vapiRef.current = createMockVapi();
      setupVapiListeners();
    }
  }, []);

  const getTranslations = () => {
    const translations = {
      en: { welcome: "Welcome", practice: "Let's Practice", mainMenu: "MAIN MENU", mockInterviews: "Mock Interviews", customInterviews: "Custom Interviews", results: "Results", billing: "Billing", freeTrial: "Free Trial", signOut: "Sign Out", chooseRoles: "Choose from", careerRoles: "career roles", simulated: "More than 24K simulated interviews", searchPlaceholder: "Search career roles or keywords...", categoriesFound: "categories found", positions: "positions", exploreInterviews: "Explore Interviews", backToCategories: "Back to Categories", startInterview: "Start Interview", minutes: "min", questions: "questions", createCustom: "Create Custom Interviews", generateInterview: "Generate Interview", jobTitle: "Job Title", jobDescription: "Job Description", noCustomYet: "No custom interviews yet", yourResults: "Your Results", totalInterviews: "Total Interviews", noMockYet: "No mock interviews yet", billingAccount: "Billing & Account", status: "Status", plan: "Plan", upgradePremium: "Upgrade to Premium", email: "Email", startRecording: "Start Recording", stopRecording: "Stop Recording", nextQuestion: "Next Question", finishInterview: "Finish Interview", yourAnswer: "Your Answer", typeAnswer: "Type your answer here or use voice recording...", interviewTips: "Interview Tips", whatLookingFor: "What They're Looking For", progress: "Progress", difficulty: "Difficulty", duration: "Duration", score: "Score" },
      zh: { welcome: "欢迎", practice: "开始练习", mainMenu: "主菜单", mockInterviews: "模拟面试", customInterviews: "自定义面试", results: "结果", billing: "订阅", freeTrial: "免费试用", signOut: "退出登录", chooseRoles: "选择", careerRoles: "个职位角色", simulated: "超过 24K 次模拟面试", searchPlaceholder: "搜索职位或关键词...", categoriesFound: "个分类", positions: "个职位", exploreInterviews: "探索面试", backToCategories: "返回分类", startInterview: "开始面试", minutes: "分钟", questions: "个问题", createCustom: "创建自定义面试", generateInterview: "生成面试", jobTitle: "职位名称", jobDescription: "职位描述", noCustomYet: "还没有自定义面试", yourResults: "您的结果", totalInterviews: "总面试次数", noMockYet: "还没有模拟面试", billingAccount: "账单与账户", status: "状态", plan: "计划", upgradePremium: "升级至高级版", email: "邮箱", startRecording: "开始录制", stopRecording: "停止录制", nextQuestion: "下一题", finishInterview: "完成面试", yourAnswer: "您的回答", typeAnswer: "在此输入您的回答或使用语音录制...", interviewTips: "面试技巧", whatLookingFor: "考察重点", progress: "进度", difficulty: "难度", duration: "时长", score: "得分" },
      es: { welcome: "Bienvenido", practice: "Vamos a Practicar", mainMenu: "MENÚ PRINCIPAL", mockInterviews: "Entrevistas Simuladas", customInterviews: "Entrevistas Personalizadas", results: "Resultados", billing: "Facturación", freeTrial: "Prueba Gratuita", signOut: "Cerrar Sesión", chooseRoles: "Elige entre", careerRoles: "roles profesionales", simulated: "Más de 24K entrevistas", searchPlaceholder: "Buscar roles...", categoriesFound: "categorías", positions: "posiciones", exploreInterviews: "Explorar", backToCategories: "Volver", startInterview: "Iniciar", minutes: "min", questions: "preguntas", createCustom: "Crear Personalizadas", generateInterview: "Generar", jobTitle: "Título", jobDescription: "Descripción", noCustomYet: "Sin entrevistas", yourResults: "Resultados", totalInterviews: "Total", noMockYet: "Sin entrevistas", billingAccount: "Facturación", status: "Estado", plan: "Plan", upgradePremium: "Actualizar", email: "Correo", startRecording: "Grabar", stopRecording: "Detener", nextQuestion: "Siguiente", finishInterview: "Finalizar", yourAnswer: "Tu Respuesta", typeAnswer: "Escribe tu respuesta o usa grabación de voz...", interviewTips: "Consejos", whatLookingFor: "Qué Buscan", progress: "Progreso", difficulty: "Dificultad", duration: "Duración", score: "Puntuación" }
    };
    return translations[currentLang] || translations.en;
  };

  const t = getTranslations();

  // Minimal UI for demonstration — you can replace with full UI port if needed
  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5" />
        <h1 className="text-2xl font-semibold">{t.mainMenu}</h1>
      </div>
      <p className="text-gray-600 mt-2">{t.simulated}</p>
      <div className="mt-4 flex gap-3">
        <button onClick={() => setCurrentLang('en')} className={`px-3 py-1 rounded ${currentLang==='en' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>English</button>
        <button onClick={() => setCurrentLang('zh')} className={`px-3 py-1 rounded ${currentLang==='zh' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>中文</button>
        <button onClick={() => setCurrentLang('es')} className={`px-3 py-1 rounded ${currentLang==='es' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Español</button>
      </div>
      <div className="mt-6">
        <button onClick={() => setIsRecording((v)=>!v)} className="inline-flex items-center gap-2 rounded-md bg-purple-600 text-white px-4 py-2">
          {isRecording ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
          {isRecording ? t.stopRecording : t.startRecording}
        </button>
      </div>
    </div>
  );
};

export default InterviewAgentUI;

