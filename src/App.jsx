import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import templatesJson from '../interview_templates.json';
import { searchJobs, applyToJob } from './utils/talentSolutionApi';

// Import page components
import MockInterviews from './pages/MockInterviews';
import CustomInterviews from './pages/CustomInterviews';
import Results from './pages/Results';
import Billing from './pages/Billing';
import InterviewPage from './pages/InterviewPage';
import Layout from './components/Layout';

const App = () => {
  // Language and UI state
  const [currentLang, setCurrentLang] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Interview templates and state
  const [interviewTemplates, setInterviewTemplates] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeInterview, setActiveInterview] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);

  // Job search state
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobSearchLocation, setJobSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [customInterviews, setCustomInterviews] = useState([]);

  // User information (can be extended with authentication later)
  const [userInfo] = useState({
    name: 'Candidate',
    email: ''
  });

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load templates on mount
  useEffect(() => {
    const loadedTemplates = {};
    for (const [category, interviews] of Object.entries(templatesJson)) {
      if (Array.isArray(interviews)) {
        loadedTemplates[category] = interviews;
      }
    }
    setInterviewTemplates(loadedTemplates);
  }, []);

  // Create interview categories (all 12 categories with original beautiful colors)
  const categoryStyles = {
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

  const interviewCategories = Object.keys(interviewTemplates).reduce((acc, categoryName, idx) => {
    const style = categoryStyles[categoryName] || { icon: '📁', color: 'from-gray-400 to-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    acc[categoryName] = {
      id: idx + 1,
      name: categoryName,
      positions: interviewTemplates[categoryName]?.length || 0,
      ...style,
      interviews: interviewTemplates[categoryName] || []
    };
    return acc;
  }, {});

  // Translations
  const getTranslations = () => {
    const translations = {
      en: {
        mainMenu: "MAIN MENU",
        mockInterviews: "Mock Interviews",
        customInterviews: "Custom Interviews",
        results: "Results",
        billing: "Billing",
        signOut: "Sign Out",
        chooseRoles: "Choose from",
        careerRoles: "career roles",
        searchPlaceholder: "Search career roles or keywords...",
        categoriesFound: "categories found",
        positions: "positions",
        exploreInterviews: "Explore Interviews",
        backToCategories: "Back to Categories",
        startInterview: "Start Interview",
        minutes: "min",
        questions: "questions",
        createCustom: "Create Custom Interviews",
        searchJobs: "Search Jobs",
        jobTitle: "Job Title",
        jobSearchPlaceholder: "Enter job title or keywords...",
        locationPlaceholder: "Location (optional)",
        searchButton: "Search",
        searching: "Searching...",
        jobsFound: "jobs found",
        noJobsFound: "No jobs found",
        generatedInterviews: "Generated Interviews",
        noCustomYet: "No custom interviews yet",
        yourResults: "Your Results",
        totalInterviews: "Total Interviews",
        score: "Score",
        noMockYet: "No mock interviews yet",
        billingAccount: "Billing & Account",
        status: "Status",
        plan: "Plan",
        upgradePremium: "Upgrade to Premium",
        email: "Email",
        freeTrial: "Free Trial"
      },
      zh: {
        mainMenu: "主菜单",
        mockInterviews: "模拟面试",
        customInterviews: "自定义面试",
        results: "结果",
        billing: "订阅",
        signOut: "退出登录",
        chooseRoles: "选择",
        careerRoles: "个职位角色",
        searchPlaceholder: "搜索职位或关键词...",
        categoriesFound: "个分类",
        positions: "个职位",
        exploreInterviews: "探索面试",
        backToCategories: "返回分类",
        startInterview: "开始面试",
        minutes: "分钟",
        questions: "个问题",
        createCustom: "创建自定义面试",
        searchJobs: "搜索职位",
        jobTitle: "职位名称",
        jobSearchPlaceholder: "输入职位名称或关键词...",
        locationPlaceholder: "地点（可选）",
        searchButton: "搜索",
        searching: "搜索中...",
        jobsFound: "个职位",
        noJobsFound: "未找到职位",
        generatedInterviews: "已生成面试",
        noCustomYet: "还没有自定义面试",
        yourResults: "您的结果",
        totalInterviews: "总面试次数",
        score: "得分",
        noMockYet: "还没有模拟面试",
        billingAccount: "账单与账户",
        status: "状态",
        plan: "计划",
        upgradePremium: "升级至高级版",
        email: "邮箱",
        freeTrial: "免费试用"
      },
      es: {
        mainMenu: "MENÚ PRINCIPAL",
        mockInterviews: "Entrevistas Simuladas",
        customInterviews: "Entrevistas Personalizadas",
        results: "Resultados",
        billing: "Facturación",
        signOut: "Cerrar Sesión",
        chooseRoles: "Elige entre",
        careerRoles: "roles profesionales",
        searchPlaceholder: "Buscar roles o palabras clave...",
        categoriesFound: "categorías encontradas",
        positions: "posiciones",
        exploreInterviews: "Explorar Entrevistas",
        backToCategories: "Volver",
        startInterview: "Iniciar",
        minutes: "min",
        questions: "preguntas",
        createCustom: "Crear Personalizadas",
        searchJobs: "Buscar Empleos",
        jobTitle: "Título",
        jobSearchPlaceholder: "Título o palabras clave...",
        locationPlaceholder: "Ubicación (opcional)",
        searchButton: "Buscar",
        searching: "Buscando...",
        jobsFound: "empleos encontrados",
        noJobsFound: "No se encontraron empleos",
        generatedInterviews: "Entrevistas Generadas",
        noCustomYet: "Sin entrevistas",
        yourResults: "Resultados",
        totalInterviews: "Total",
        score: "Puntuación",
        noMockYet: "Sin entrevistas",
        billingAccount: "Facturación",
        status: "Estado",
        plan: "Plan",
        upgradePremium: "Actualizar a Premium",
        email: "Email",
        freeTrial: "Prueba Gratuita"
      }
    };
    return translations[currentLang] || translations.en;
  };

  const t = getTranslations();

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

      setCustomInterviews(prev => [customInterview, ...prev]);
      console.log('Interview generated successfully!', customInterview);
    } catch (error) {
      console.error('Error generating interview:', error);
      alert('Failed to generate interview. Please try again.');
    } finally {
      setGeneratingJobId(null);
    }
  };

  const generateQuestionsFromJob = (job) => {
    const title = job.title;
    const description = job.description?.replace(/<[^>]*>/g, '') || '';

    const questions = [
      `Tell me about your experience with ${title} roles. What makes you a good fit for this position?`,
      `This role requires specific qualifications. Can you walk me through your relevant experience?`,
      `What interests you most about this ${title} position at ${job.companyDisplayName || job.company}?`,
      `Can you describe a challenging project you've worked on that relates to the responsibilities in this role?`,
      `How would you approach the key responsibilities mentioned in this job description?`
    ];

    if (description.toLowerCase().includes('software') ||
        description.toLowerCase().includes('engineer') ||
        description.toLowerCase().includes('developer')) {
      questions.push(
        'Can you walk me through a complex technical problem you solved recently?',
        'How do you stay updated with the latest technologies in your field?'
      );
    }

    if (title.toLowerCase().includes('senior') ||
        title.toLowerCase().includes('lead') ||
        title.toLowerCase().includes('manager')) {
      questions.push(
        'How do you approach mentoring junior team members?',
        'Describe your leadership style and how you handle team conflicts.'
      );
    }

    return questions.slice(0, 8);
  };

  const handleApplyToJob = async (job) => {
    try {
      setApplyingJobId(job.id);
      const result = await applyToJob({
        jobId: job.id,
        applicationInfo: job.applicationInfo
      });

      if (result.success) {
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

  return (
    <Router>
      <Layout
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        showLanguageMenu={showLanguageMenu}
        setShowLanguageMenu={setShowLanguageMenu}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        t={t}
      >
        {/* If interview is active, show interview page, otherwise show normal routes */}
        {activeInterview ? (
          <InterviewPage
            interview={activeInterview}
            userInfo={userInfo}
            onExit={() => {
              setActiveInterview(null);
              setCurrentQuestionIndex(0);
              setUserAnswers([]);
            }}
            t={t}
          />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <MockInterviews
                  t={t}
                  currentLang={currentLang}
                  interviewCategories={interviewCategories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  setActiveInterview={setActiveInterview}
                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                  setUserAnswers={setUserAnswers}
                />
              }
            />
            <Route
              path="/custom"
              element={
                <CustomInterviews
                  t={t}
                  jobSearchQuery={jobSearchQuery}
                  setJobSearchQuery={setJobSearchQuery}
                  jobSearchLocation={jobSearchLocation}
                  setJobSearchLocation={setJobSearchLocation}
                  handleJobSearch={handleJobSearch}
                  isSearching={isSearching}
                  searchError={searchError}
                  searchResults={searchResults}
                  handleGenerateInterview={handleGenerateInterview}
                  handleApplyToJob={handleApplyToJob}
                  generatingJobId={generatingJobId}
                  applyingJobId={applyingJobId}
                  customInterviews={customInterviews}
                  setActiveInterview={setActiveInterview}
                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                  setUserAnswers={setUserAnswers}
                />
              }
            />
            <Route path="/results" element={<Results t={t} />} />
            <Route path="/billing" element={<Billing t={t} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Layout>
    </Router>
  );
};

export default App;
