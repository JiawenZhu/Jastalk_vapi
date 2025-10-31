import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mic, MicOff, Phone, PhoneOff, Volume2, Clock, MessageSquare, MessageCircle } from 'lucide-react';
import ChatWithAgent from './ChatWithAgent';
import { saveMockInterview } from '../services/resultsService';

const InterviewPage = ({ interview, onExit, t, userInfo = {} }) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showChat, setShowChat] = useState(false);

  // Voice state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const vapiRef = useRef(null);

  const handleExit = () => {
    // Stop any active calls
    if (isCallActive && vapiRef.current) {
      vapiRef.current.stop();
    }

    if (onExit) {
      onExit();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  const handleNextQuestion = () => {
    if (!currentAnswer.trim() && !userAnswers[currentQuestionIndex]) {
      alert('Please provide an answer before moving to the next question.');
      return;
    }

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = currentAnswer || userAnswers[currentQuestionIndex] || '';
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < interview.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else {
      try {
        saveMockInterview({
          title: interview.title || interview.subTitle || 'Mock Interview',
          category: interview.category,
          questions: interview.questions,
          answers: newAnswers,
          durationMinutes: interview.duration_minutes,
        });
      } catch (e) {
        console.warn('Failed to save mock interview result', e);
      }
      alert(`Interview completed! You answered ${newAnswers.length} questions. Great job!`);
      handleExit();
    }
  };

  if (!interview) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-8">
          <p className="text-gray-900 dark:text-white">No interview selected</p>
          <button onClick={handleExit} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/40 to-purple-50/40 dark:from-gray-900 dark:via-gray-800/40 dark:to-gray-900/40">
      <div className="max-w-6xl mx-auto p-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <X size={20} />
            <span className="font-medium">Close Interview</span>
          </button>

          <button
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <MessageCircle size={20} />
            <span className="font-medium">Chat with JasTalk AI</span>
          </button>
        </div>

        {/* Interview Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl mb-8 border border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {interview.title || interview.subTitle}
              </h1>
              {interview.company && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{interview.company}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{interview.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={16} />
                  <span>{interview.questions.length} {t.questions}</span>
                </div>
                {interview.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    interview.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                    interview.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {interview.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.progress}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentQuestionIndex + 1} / {interview.questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl mb-8 border border-gray-100 dark:border-gray-700">
          <div className="mb-6">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-semibold mb-4">
              Question {currentQuestionIndex + 1}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
              {interview.questions[currentQuestionIndex]}
            </h2>
          </div>

          {/* Answer Input */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.yourAnswer}
            </label>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={t.typeAnswer || "Type your answer here or use voice recording..."}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleNextQuestion}
                disabled={isCallActive}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg text-lg ${
                  isCallActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                {currentQuestionIndex < interview.questions.length - 1 ? t.nextQuestion : t.finishInterview}
              </button>
            </div>
          </div>
        </div>

        {/* Interview Tips (Optional) */}
        {interview.tips && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">{t.interviewTips}</h3>
            <ul className="space-y-2 text-blue-800 dark:text-blue-300">
              {interview.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All Questions Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">All Questions</h3>
          <div className="space-y-4">
            {interview.questions.map((question, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  idx === currentQuestionIndex
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : idx < currentQuestionIndex
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === currentQuestionIndex
                      ? 'bg-blue-500 text-white'
                      : idx < currentQuestionIndex
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className={`flex-1 ${
                    idx === currentQuestionIndex
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {question}
                  </p>
                  {idx < currentQuestionIndex && (
                    <span className="flex-shrink-0 text-green-600 dark:text-green-400 text-sm font-medium">✓ Answered</span>
                  )}
                  {idx === currentQuestionIndex && (
                    <span className="flex-shrink-0 text-blue-600 dark:text-blue-400 text-sm font-medium">• Current</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <ChatWithAgent
          interview={interview}
          userInfo={userInfo}
          onClose={() => setShowChat(false)}
          t={t}
        />
      )}
    </div>
  );
};

export default InterviewPage;
