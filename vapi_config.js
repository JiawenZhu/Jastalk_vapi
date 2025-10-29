// vapiConfig.js - Vapi 语音面试配置

export const VAPI_PUBLIC_KEY = 'YOUR_VAPI_PUBLIC_KEY'; // 从 Vapi Dashboard 获取

// 创建面试 Assistant 配置
export const createInterviewAssistant = (interviewType, questions, language = 'en') => {
  const languageMap = {
    en: {
      voice: 'jennifer-playht', // 专业女声
      model: 'gpt-4',
      greeting: "Hello! Welcome to your interview. I'll be asking you a series of questions. Take your time to think through your answers. Are you ready to begin?"
    },
    zh: {
      voice: 'zh-CN-XiaoxiaoNeural', // 中文女声
      model: 'gpt-4',
      greeting: "你好！欢迎参加面试。我会向你提出一系列问题。请仔细思考后回答。准备好开始了吗？"
    },
    es: {
      voice: 'es-MX-DaliaNeural', // 墨西哥西班牙语女声
      model: 'gpt-4',
      greeting: "¡Hola! Bienvenido a tu entrevista. Te haré una serie de preguntas. Tómate tu tiempo para pensar tus respuestas. ¿Estás listo para comenzar?"
    }
  };

  const config = languageMap[language] || languageMap.en;

  // 构建面试问题提示词
  const questionsPrompt = questions.map((q, idx) => 
    `Question ${idx + 1}: ${q}`
  ).join('\n\n');

  return {
    name: `${interviewType} Interview Assistant`,
    model: {
      provider: "openai",
      model: config.model,
      messages: [
        {
          role: "system",
          content: `You are a professional interviewer conducting a ${interviewType} interview. 

INTERVIEW QUESTIONS:
${questionsPrompt}

INSTRUCTIONS:
1. Start with a warm greeting
2. Ask ONE question at a time from the list above
3. Listen carefully to the candidate's response
4. Provide brief, encouraging feedback (e.g., "Thank you for sharing that", "Interesting perspective")
5. Move to the next question only after the candidate has finished answering
6. If the answer is too brief, ask ONE follow-up question to dig deeper
7. Be professional, friendly, and supportive
8. After all questions are answered, thank the candidate and end the interview

EVALUATION CRITERIA:
- Listen for specific examples and details
- Note technical accuracy and depth of knowledge
- Assess communication clarity
- Evaluate problem-solving approach

Remember: You are conducting a real interview. Be natural, conversational, and professional.`
        }
      ],
      temperature: 0.7,
      maxTokens: 500
    },
    voice: {
      provider: "playht",
      voiceId: config.voice
    },
    firstMessage: config.greeting,
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: language === 'zh' ? 'zh' : language === 'es' ? 'es' : 'en'
    },
    // 语音识别配置
    recordingEnabled: true,
    // 端点检测 - 检测用户何时停止说话
    endOfSpeechSensitivity: 0.5,
    // 背景噪音抑制
    backgroundSound: "office",
    // 最大通话时长（秒）
    maxDurationSeconds: 3600, // 1小时
  };
};

// 面试会话配置
export const interviewCallConfig = {
  // 语音活动检测
  silenceTimeoutSeconds: 30, // 30秒无声音自动结束
  // 最大通话时长
  maxDurationSeconds: 3600,
  // 录音配置
  recordingEnabled: true,
};

// Vapi 事件处理器
export const setupVapiEventHandlers = (vapi, callbacks = {}) => {
  // 连接建立
  vapi.on('call-start', () => {
    console.log('Interview call started');
    callbacks.onCallStart?.();
  });

  // 连接结束
  vapi.on('call-end', () => {
    console.log('Interview call ended');
    callbacks.onCallEnd?.();
  });

  // 实时语音转文字
  vapi.on('speech-start', () => {
    console.log('User started speaking');
    callbacks.onSpeechStart?.();
  });

  vapi.on('speech-end', () => {
    console.log('User stopped speaking');
    callbacks.onSpeechEnd?.();
  });

  // 接收转录文本
  vapi.on('message', (message) => {
    if (message.type === 'transcript' && message.role === 'user') {
      console.log('User said:', message.transcript);
      callbacks.onTranscript?.(message.transcript);
    }
    
    if (message.type === 'transcript' && message.role === 'assistant') {
      console.log('Assistant said:', message.transcript);
      callbacks.onAssistantMessage?.(message.transcript);
    }
  });

  // 错误处理
  vapi.on('error', (error) => {
    console.error('Vapi error:', error);
    callbacks.onError?.(error);
  });

  // 音量级别（用于可视化）
  vapi.on('volume-level', (volume) => {
    callbacks.onVolumeLevel?.(volume);
  });
};

// 语音识别结果处理
export const processTranscription = (transcript, question) => {
  // 计算回答质量分数（简单版本）
  const wordCount = transcript.split(' ').length;
  const hasExamples = /for example|such as|like|instance/i.test(transcript);
  const hasNumbers = /\d+/.test(transcript);
  
  let score = 0;
  
  // 长度评分 (0-40分)
  if (wordCount > 100) score += 40;
  else if (wordCount > 50) score += 30;
  else if (wordCount > 20) score += 20;
  else score += 10;
  
  // 有具体例子 (+30分)
  if (hasExamples) score += 30;
  
  // 有数据支撑 (+30分)
  if (hasNumbers) score += 30;
  
  return {
    transcript,
    wordCount,
    score: Math.min(score, 100),
    hasExamples,
    hasNumbers
  };
};
