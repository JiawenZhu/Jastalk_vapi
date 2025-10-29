# 🎤 Vapi 语音面试完整集成指南

## 📋 目录
1. [前置准备](#前置准备)
2. [安装和配置](#安装和配置)
3. [集成步骤](#集成步骤)
4. [功能特性](#功能特性)
5. [测试和调试](#测试和调试)
6. [常见问题](#常见问题)

---

## 🔧 前置准备

### 1. 获取 Vapi API Keys

1. 访问 [Vapi Dashboard](https://dashboard.vapi.ai/)
2. 注册/登录账户
3. 进入 **Settings → API Keys**
4. 复制以下密钥：
   - **Public Key** (pk_xxx): 用于前端
   - **Private Key** (sk_xxx): 用于后端 MCP

### 2. 所需权限

确保浏览器授予以下权限：
- ✅ 麦克风访问
- ✅ 音频播放
- ✅ 网络连接

---

## 📦 安装和配置

### Step 1: 安装依赖

```bash
# 安装 Vapi Web SDK
npm install @vapi-ai/web

# 或使用 yarn
yarn add @vapi-ai/web
```

### Step 2: 在 HTML 中引入 (CDN 方式)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Interview Agent</title>
    <!-- Vapi SDK -->
    <script src="https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js"></script>
</head>
<body>
    <div id="root"></div>
    <script>
        // 初始化 Vapi
        const VAPI_PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';
        const vapi = new window.Vapi(VAPI_PUBLIC_KEY);
    </script>
</body>
</html>
```

### Step 3: 环境变量配置

创建 `.env` 文件：

```env
# Vapi Keys
VAPI_PUBLIC_KEY=pk_your_public_key_here
VAPI_PRIVATE_KEY=sk_your_private_key_here

# OpenAI (用于 Vapi Assistant)
OPENAI_API_KEY=sk-your-openai-key
```

---

## 🚀 集成步骤

### 1. 初始化 Vapi

```javascript
import Vapi from '@vapi-ai/web';

// 初始化 Vapi 客户端
const vapi = new Vapi('YOUR_PUBLIC_KEY');

// 设置事件监听
vapi.on('call-start', () => console.log('Interview started'));
vapi.on('call-end', () => console.log('Interview ended'));
vapi.on('message', (msg) => console.log('Message:', msg));
vapi.on('error', (err) => console.error('Error:', err));
```

### 2. 创建面试 Assistant

```javascript
const createInterviewAssistant = (questions, language = 'en') => {
  return {
    model: {
      provider: "openai",
      model: "gpt-4",
      messages: [{
        role: "system",
        content: `You are conducting an interview. 
        
Questions to ask:
${questions.map((q, i) => `${i+1}. ${q}`).join('\n')}

Ask one question at a time and wait for responses.`
      }]
    },
    voice: {
      provider: "playht",
      voiceId: language === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'jennifer-playht'
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: language
    },
    firstMessage: "Hello! Welcome to your interview. Are you ready to begin?",
    recordingEnabled: true
  };
};
```

### 3. 开始语音面试

```javascript
async function startVoiceInterview(questions) {
  try {
    // 创建 assistant 配置
    const assistant = createInterviewAssistant(questions, 'en');
    
    // 开始通话
    await vapi.start(assistant);
    
    console.log('Voice interview started!');
  } catch (error) {
    console.error('Failed to start interview:', error);
    alert('Please allow microphone access');
  }
}
```

### 4. 实时转录处理

```javascript
// 监听用户语音转录
vapi.on('message', (message) => {
  if (message.type === 'transcript' && message.role === 'user') {
    console.log('User said:', message.transcript);
    
    // 保存用户回答
    saveUserAnswer(message.transcript);
  }
  
  if (message.type === 'transcript' && message.role === 'assistant') {
    console.log('Interviewer asked:', message.transcript);
    
    // 显示面试官问题
    displayInterviewerQuestion(message.transcript);
  }
});
```

### 5. 结束面试

```javascript
function endVoiceInterview() {
  vapi.stop();
  console.log('Interview ended');
}
```

---

## ✨ 功能特性

### 1. **实时语音识别**
- 🎤 自动将语音转为文字
- 🌍 支持多语言（英语、中文、西班牙语）
- ⚡ 低延迟（< 500ms）

### 2. **AI 面试官**
- 🤖 GPT-4 驱动的智能对话
- 📝 自动追问和反馈
- 🎯 基于问题列表的结构化面试

### 3. **音频可视化**
- 📊 实时音量指示器
- 🔊 说话状态检测
- 📈 语音活动可视化

### 4. **转录和记录**
- 💾 自动保存所有对话
- 📄 实时显示转录文本
- 🔍 可搜索的面试记录

---

## 🧪 测试和调试

### 测试语音功能

```javascript
// 测试麦克风
async function testMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('❌ Microphone access denied:', error);
    return false;
  }
}

// 测试 Vapi 连接
async function testVapiConnection() {
  try {
    const vapi = new Vapi('YOUR_PUBLIC_KEY');
    console.log('✅ Vapi initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Vapi initialization failed:', error);
    return false;
  }
}
```

### 调试技巧

1. **查看控制台日志**
```javascript
vapi.on('message', (msg) => {
  console.log('📨 Message:', JSON.stringify(msg, null, 2));
});
```

2. **监控网络请求**
- 打开 Chrome DevTools → Network
- 筛选 WebSocket 连接
- 查看 Vapi API 调用

3. **测试不同语言**
```javascript
// 英语
const enAssistant = createInterviewAssistant(questions, 'en');

// 中文
const zhAssistant = createInterviewAssistant(questions, 'zh');

// 西班牙语
const esAssistant = createInterviewAssistant(questions, 'es');
```

---

## ❓ 常见问题

### Q1: 麦克风权限被拒绝？

**解决方案:**
1. 检查浏览器设置 → 隐私 → 麦克风
2. 确保网站有麦克风权限
3. 刷新页面重新请求权限

### Q2: 语音识别不准确？

**解决方案:**
1. 使用高质量麦克风
2. 在安静环境中测试
3. 调整 `endOfSpeechSensitivity` 参数
4. 使用 Deepgram `nova-2` 模型

### Q3: 通话突然断开？

**解决方案:**
1. 检查网络连接
2. 设置合理的 `maxDurationSeconds`
3. 处理 `error` 事件并重连

### Q4: 如何保存面试记录？

```javascript
let interviewTranscript = [];

vapi.on('message', (message) => {
  if (message.type === 'transcript') {
    interviewTranscript.push({
      role: message.role,
      text: message.transcript,
      timestamp: new Date().toISOString()
    });
  }
});

// 保存到本地
vapi.on('call-end', () => {
  localStorage.setItem('interview_transcript', 
    JSON.stringify(interviewTranscript)
  );
});
```

### Q5: 如何切换语言？

```javascript
// 动态切换语言
const assistantConfig = {
  ...baseConfig,
  voice: {
    provider: "playht",
    voiceId: currentLang === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 
             currentLang === 'es' ? 'es-MX-DaliaNeural' : 
             'jennifer-playht'
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: currentLang
  }
};
```

---

## 📊 性能优化

### 1. 减少延迟
```javascript
const optimizedConfig = {
  ...assistantConfig,
  endOfSpeechSensitivity: 0.7, // 更快检测说话结束
  backgroundSound: "off", // 关闭背景音
  model: {
    ...model,
    temperature: 0.5 // 更确定性的响应
  }
};
```

### 2. 节省成本
```javascript
// 使用更便宜的模型
const costEffectiveConfig = {
  model: {
    provider: "openai",
    model: "gpt-3.5-turbo", // 代替 gpt-4
    ...
  },
  voice: {
    provider: "11labs", // 或其他提供商
    voiceId: "..."
  }
};
```

---

## 🔒 安全最佳实践

1. ✅ **Never** expose Private Key in frontend
2. ✅ Use environment variables for keys
3. ✅ Implement rate limiting
4. ✅ Validate all user inputs
5. ✅ Use HTTPS for all connections

---

## 📚 更多资源

- [Vapi 官方文档](https://docs.vapi.ai/)
- [Vapi Web SDK](https://github.com/VapiAI/web)
- [示例代码](https://github.com/VapiAI/examples)
- [社区支持](https://discord.gg/vapi)

---

## 🎯 下一步

1. ✅ 集成到你的应用
2. ✅ 测试所有功能
3. ✅ 优化用户体验
4. ✅ 部署到生产环境

Good luck! 🚀
