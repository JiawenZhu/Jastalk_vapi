import React from 'react';
import { Users, Search, ArrowLeft, Play, Clock } from 'lucide-react';

const MockInterviews = ({
  t,
  currentLang,
  interviewCategories,
  selectedCategory,
  setSelectedCategory,
  setActiveInterview,
  setCurrentQuestionIndex,
  setUserAnswers
}) => {
  // If a category is selected, show interviews for that category
  if (selectedCategory) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            {t.backToCategories}
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className={`w-16 h-16 ${selectedCategory.bgColor} ${selectedCategory.borderColor} border-2 rounded-2xl flex items-center justify-center`}>
              <span className="text-3xl">{selectedCategory.icon}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedCategory.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{selectedCategory.positions} {t.positions}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedCategory.interviews.map((interview, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold flex-1 text-gray-900 dark:text-white">{interview.subTitle}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${interview.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : interview.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                    {interview.difficulty}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock size={16} />
                    <span>{interview.duration_minutes} {t.minutes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users size={16} />
                    <span>{interview.question_count || interview.questions?.length || 0} {t.questions}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveInterview(interview);
                    setCurrentQuestionIndex(0);
                    setUserAnswers([]);
                  }}
                  className={`w-full bg-gradient-to-r ${selectedCategory.color} text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                >
                  <Play size={18} />
                  {t.startInterview}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default view: Show all categories
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t.mockInterviews}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.chooseRoles} <span className="font-semibold">{Object.values(interviewCategories).reduce((sum, cat) => sum + cat.interviews.length, 0)}</span> {t.careerRoles}</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{Object.keys(interviewCategories).length} {t.categoriesFound}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(interviewCategories).map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
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

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {category.name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Explore {category.positions} specialized interview{category.positions !== 1 ? 's' : ''}
                </p>

                <button className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold group-hover:gap-3 transition-all duration-300">
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
    </div>
  );
};

export default MockInterviews;
