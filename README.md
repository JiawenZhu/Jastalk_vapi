# 🎤 Jastalk Vapi Interview Agent

An AI-powered voice interview agent built with React and Vapi for job preparation and practice interviews.

## ✨ Features

- 🎙️ **Voice Interviews** - Real-time voice conversations with AI interviewer
- 🌍 **Multi-language Support** - English, Chinese, and Spanish
- 📝 **Interview Templates** - Pre-built questions for different job categories
- 🎯 **Progress Tracking** - Track your interview performance
- 📊 **Real-time Transcription** - See your responses as you speak
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Vapi API key (optional for demo mode)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd Jastalk_vapi
   npm install
   ```

2. **Set up Vapi API (Optional):**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env and add your Vapi keys
   REACT_APP_VAPI_PUBLIC_KEY=pk_your_public_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🎯 How to Use

### Demo Mode (No API Key Required)
- The app works in demo mode with simulated voice interviews
- Perfect for testing the UI and understanding the flow
- All features work except real voice processing

### Real Voice Mode (With Vapi API Key)
1. Get your Vapi API key from [dashboard.vapi.ai](https://dashboard.vapi.ai/)
2. Add it to your `.env` file
3. Restart the development server
4. Enjoy real voice interviews!

## 📁 Project Structure

```
Jastalk_vapi/
├── src/
│   ├── index.js          # React entry point
│   └── index.css         # Tailwind CSS styles
├── public/
│   ├── index.html        # HTML template
│   └── interview_templates.json  # Interview questions
├── interview_agent_ui.tsx    # Main React component
├── vapi_config.js        # Vapi configuration
├── vapi_test_page.html   # Standalone test page
└── vapi_integration_guide.md  # Complete integration guide
```

## 🎤 Voice Interview Features

### Supported Languages
- **English** - Professional interviewer voice
- **中文** - Chinese interviewer voice  
- **Español** - Spanish interviewer voice

### Interview Categories
- Software Development (Frontend, Backend, Full Stack)
- Data Science (Data Scientist, Data Analyst)
- Design (UI/UX Designer)
- Finance (Financial Analyst)
- Marketing (Digital Marketing Manager)

### Voice Controls
- 🎙️ Start/Stop voice interview
- 📊 Real-time volume visualization
- 📝 Live transcription display
- 🔄 Automatic question progression

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Key Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Vapi AI** - Voice AI platform
- **Lucide React** - Icons

## 🔧 Configuration

### Vapi Setup

1. **Get API Keys:**
   - Visit [Vapi Dashboard](https://dashboard.vapi.ai/)
   - Create an account and get your public/private keys

2. **Environment Variables:**
   ```env
   REACT_APP_VAPI_PUBLIC_KEY=pk_your_public_key_here
   VAPI_PRIVATE_KEY=sk_your_private_key_here
   OPENAI_API_KEY=sk_your_openai_key_here
   ```

3. **Voice Configuration:**
   - Edit `vapi_config.js` to customize voice settings
   - Adjust language, voice models, and interview flow

## 🧪 Testing

### Test Page
Open `vapi_test_page.html` in your browser for a standalone test of Vapi functionality.

### Demo Mode
The app automatically falls back to demo mode if no Vapi API key is provided.

## 📚 Documentation

- **Integration Guide**: `vapi_integration_guide.md` - Complete setup instructions
- **Configuration**: `vapi_config.js` - Voice and interview settings
- **Test Page**: `vapi_test_page.html` - Standalone testing

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
The app is ready for deployment to any static hosting service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Vapi Documentation**: [docs.vapi.ai](https://docs.vapi.ai/)
- **Issues**: Create an issue in this repository
- **Discord**: [Vapi Community](https://discord.gg/vapi)

---

**Happy Interviewing!** 🎤✨
