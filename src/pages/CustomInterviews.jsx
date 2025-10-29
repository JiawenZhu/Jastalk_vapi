import React from 'react';
import { Target, Briefcase, MapPin, Search } from 'lucide-react';
import JobCard from '../components/JobCard';

const CustomInterviews = ({
  t,
  jobSearchQuery,
  setJobSearchQuery,
  jobSearchLocation,
  setJobSearchLocation,
  handleJobSearch,
  isSearching,
  searchError,
  searchResults,
  handleGenerateInterview,
  handleApplyToJob,
  generatingJobId,
  applyingJobId,
  customInterviews,
  setActiveInterview,
  setCurrentQuestionIndex,
  setUserAnswers
}) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t.createCustom}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Search for jobs and generate personalized interview prep</p>

        {/* Job Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Briefcase size={20} className="text-orange-500" />
            {t.searchJobs}
          </h3>
          <form onSubmit={handleJobSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.jobTitle}</label>
                <input
                  type="text"
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  placeholder={t.jobSearchPlaceholder}
                  className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <MapPin size={14} />
                  Location
                </label>
                <input
                  type="text"
                  value={jobSearchLocation}
                  onChange={(e) => setJobSearchLocation(e.target.value)}
                  placeholder={t.locationPlaceholder}
                  className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
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
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{searchError}</p>
            </div>
          )}

          {/* Search Results Count */}
          {searchResults.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {searchResults.length} {t.jobsFound}
            </div>
          )}
        </div>

        {/* Job Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Search Results</h3>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t.generatedInterviews}</h3>
          {customInterviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">{t.noCustomYet}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Search for jobs and generate interviews</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setActiveInterview(interview);
                    setCurrentQuestionIndex(0);
                    setUserAnswers([]);
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Briefcase size={20} className="text-orange-500 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{interview.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{interview.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
};

export default CustomInterviews;
