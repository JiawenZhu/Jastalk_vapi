import React, { useState, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter categories and interviews based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories: Object.values(interviewCategories), interviews: [] };
    }

    const query = searchQuery.toLowerCase();
    const matchedInterviews = [];
    const matchedCategories = [];

    // Search through all categories and interviews
    Object.values(interviewCategories).forEach(category => {
      // Check if category name matches
      const categoryMatches = category.name.toLowerCase().includes(query);
      
      // Check if any interview in this category matches
      const matchingInterviews = category.interviews.filter(interview => {
        const titleMatch = interview.title?.toLowerCase().includes(query) ||
                          interview.subTitle?.toLowerCase().includes(query);
        const descMatch = interview.description?.toLowerCase().includes(query);
        const skillsMatch = interview.skills?.some(skill => 
          skill.toLowerCase().includes(query)
        );
        return titleMatch || descMatch || skillsMatch;
      });

      if (categoryMatches || matchingInterviews.length > 0) {
        // Add category with filtered interviews
        matchedCategories.push({
          ...category,
          interviews: matchingInterviews.length > 0 ? matchingInterviews : category.interviews,
          matchedInterviews: matchingInterviews.length
        });
      }

      // Add individual matching interviews to the interviews list
      matchingInterviews.forEach(interview => {
        matchedInterviews.push({
          ...interview,
          categoryName: category.name,
          categoryIcon: category.icon,
          categoryColor: category.color
        });
      });
    });

    return { categories: matchedCategories, interviews: matchedInterviews };
  }, [searchQuery, interviewCategories]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearching(!!value.trim());
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };
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
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-12 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Results Summary */}
        {isSearching ? (
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Found {filteredResults.interviews.length} interview{filteredResults.interviews.length !== 1 ? 's' : ''} 
              in {filteredResults.categories.length} categor{filteredResults.categories.length !== 1 ? 'ies' : 'y'} 
              for "{searchQuery}"
            </p>
            
            {/* Individual Interview Results */}
            {filteredResults.interviews.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Interview Positions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {filteredResults.interviews.map((interview, idx) => (
                    <div key={`search-${idx}`} className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{interview.categoryIcon}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{interview.categoryName}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          interview.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 
                          interview.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : 
                          'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        }`}>
                          {interview.difficulty}
                        </span>
                      </div>
                      
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                        {interview.subTitle || interview.title}
                      </h4>
                      
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={14} />
                          <span>{interview.duration_minutes} {t.minutes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users size={14} />
                          <span>{interview.question_count || interview.questions?.length || 0} {t.questions}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveInterview(interview);
                          setCurrentQuestionIndex(0);
                          setUserAnswers([]);
                        }}
                        className={`w-full bg-gradient-to-r ${interview.categoryColor} text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
                      >
                        <Play size={16} />
                        {t.startInterview}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{Object.keys(interviewCategories).length} {t.categoriesFound}</p>
        )}

        {/* Categories Grid */}
        {filteredResults.categories.length > 0 && (
          <div>
            {isSearching && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.categories.map((category) => (
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
                    {isSearching && category.matchedInterviews ? 
                      `${category.matchedInterviews} match${category.matchedInterviews !== 1 ? 'es' : ''}` :
                      `${category.positions} ${t.positions}`
                    }
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                  {category.name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {isSearching && category.matchedInterviews ? 
                    `${category.matchedInterviews} matching interview${category.matchedInterviews !== 1 ? 's' : ''} found` :
                    `Explore ${category.positions} specialized interview${category.positions !== 1 ? 's' : ''}`
                  }
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
        )}
        
        {/* No Results Message */}
        {isSearching && filteredResults.categories.length === 0 && filteredResults.interviews.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We couldn't find any career roles matching "{searchQuery}"
            </p>
            <button
              onClick={clearSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockInterviews;
