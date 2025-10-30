import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import templatesJson from '../interview_templates.json';

// Simple Layout component
const SimpleLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-orange-500">JasTalk</h1>
          <p className="text-sm text-gray-600">Interview Agent</p>
        </div>
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <a href="/" className="block px-4 py-2 text-gray-700 bg-orange-50 rounded-lg">
              🎯 Mock Interviews
            </a>
            <a href="/custom" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
              ⚙️ Custom Interviews
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

// Simple Mock Interviews page
const SimpleMockInterviews = ({ interviewCategories, setActiveInterview }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  if (selectedCategory) {
    return (
      <div className="p-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Categories
        </button>
        
        <h2 className="text-2xl font-bold mb-6">{selectedCategory.name} Interviews</h2>
        
        <div className="grid gap-4">
          {selectedCategory.interviews.map((interview, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold mb-2">{interview.subTitle}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>🕒 {interview.duration_minutes} min</span>
                <span>❓ {interview.questions?.length || 0} questions</span>
                <span className={`px-2 py-1 rounded ${
                  interview.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  interview.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {interview.difficulty}
                </span>
              </div>
              <button
                onClick={() => setActiveInterview({
                  ...interview,
                  title: interview.subTitle,
                  category: selectedCategory.name
                })}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Start Interview
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock Interviews</h1>
        <p className="text-gray-600">Choose from {Object.keys(interviewCategories).length} career categories</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(interviewCategories).map((category) => (
          <div
            key={category.id}
            onClick={() => setSelectedCategory(category)}
            className="bg-white p-6 rounded-lg shadow border hover:shadow-lg cursor-pointer transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{category.icon}</span>
              <div>
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.positions} positions</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Interview Page
const SimpleInterviewPage = ({ interview, onExit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');

  const handleNext = () => {
    if (currentQuestionIndex < interview.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer('');
    } else {
      alert('Interview completed!');
      onExit();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onExit}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded"
        >
          ← Exit Interview
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow mb-8">
        <h1 className="text-2xl font-bold mb-2">{interview.title}</h1>
        <div className="text-sm text-gray-600 mb-4">
          Question {currentQuestionIndex + 1} of {interview.questions.length}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Question {currentQuestionIndex + 1}
        </h2>
        <p className="text-lg text-gray-800 mb-6">
          {interview.questions[currentQuestionIndex]}
        </p>

        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={6}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <div className="mt-6">
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
          >
            {currentQuestionIndex < interview.questions.length - 1 ? 'Next Question' : 'Finish Interview'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MinimalApp = () => {
  console.log('MinimalApp rendering...');
  
  const [interviewTemplates, setInterviewTemplates] = useState({});
  const [activeInterview, setActiveInterview] = useState(null);

  // Load templates on mount
  useEffect(() => {
    console.log('Loading templates...', templatesJson);
    const loadedTemplates = {};
    for (const [category, interviews] of Object.entries(templatesJson)) {
      if (Array.isArray(interviews)) {
        loadedTemplates[category] = interviews;
      }
    }
    setInterviewTemplates(loadedTemplates);
    console.log('Templates loaded:', loadedTemplates);
  }, []);

  // Create interview categories
  const categoryStyles = {
    Software: { icon: '💻', color: 'from-blue-400 to-cyan-400' },
    'Data Science': { icon: '📊', color: 'from-purple-400 to-pink-400' },
    Design: { icon: '🎨', color: 'from-pink-400 to-rose-400' },
    Finance: { icon: '💰', color: 'from-green-400 to-emerald-400' },
    Legal: { icon: '⚖️', color: 'from-gray-400 to-slate-400' },
    Media: { icon: '📺', color: 'from-red-400 to-orange-400' },
    Engineering: { icon: '⚙️', color: 'from-yellow-400 to-amber-400' },
    Marketing: { icon: '📈', color: 'from-indigo-400 to-blue-400' },
    Product: { icon: '📦', color: 'from-cyan-400 to-teal-400' },
    Writing: { icon: '✍️', color: 'from-orange-400 to-red-400' },
    Business: { icon: '💼', color: 'from-teal-400 to-green-400' },
    Consulting: { icon: '🤝', color: 'from-lime-400 to-green-400' }
  };

  const interviewCategories = Object.keys(interviewTemplates).reduce((acc, categoryName, idx) => {
    const style = categoryStyles[categoryName] || { icon: '📁', color: 'from-gray-400 to-gray-600' };
    acc[categoryName] = {
      id: idx + 1,
      name: categoryName,
      positions: interviewTemplates[categoryName]?.length || 0,
      ...style,
      interviews: interviewTemplates[categoryName] || []
    };
    return acc;
  }, {});

  console.log('Interview categories:', interviewCategories);

  if (activeInterview) {
    return (
      <SimpleLayout>
        <SimpleInterviewPage
          interview={activeInterview}
          onExit={() => setActiveInterview(null)}
        />
      </SimpleLayout>
    );
  }

  return (
    <Router>
      <SimpleLayout>
        <Routes>
          <Route
            path="/"
            element={
              <SimpleMockInterviews
                interviewCategories={interviewCategories}
                setActiveInterview={setActiveInterview}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SimpleLayout>
    </Router>
  );
};

export default MinimalApp;