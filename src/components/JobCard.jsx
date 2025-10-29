import React from 'react';
import { Briefcase, MapPin, Clock, Building2, ExternalLink, Sparkles } from 'lucide-react';

/**
 * JobCard Component
 * Displays a job search result with Generate Interview and Apply buttons
 */
const JobCard = ({ job, onGenerateInterview, onApply, isGenerating, isApplying }) => {
  // Format the posting date
  const formatDate = (dateString) => {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Format employment types
  const formatEmploymentTypes = (types) => {
    if (!types || types.length === 0) return 'Full-time';
    return types.map(type => {
      // Convert enum values like "FULL_TIME" to "Full-time"
      return type.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join('-');
    }).join(', ');
  };

  // Truncate description
  const truncateDescription = (text, maxLength = 300) => {
    if (!text) return 'No description available';
    const cleanText = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Briefcase size={20} className="text-orange-500" />
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Building2 size={16} />
              <span>{job.companyDisplayName || job.company}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{formatDate(job.postingDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Type Badge */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
          {formatEmploymentTypes(job.employmentTypes)}
        </span>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {truncateDescription(job.description)}
        </p>
      </div>

      {/* Qualifications Preview (if available) */}
      {job.qualifications && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Key Qualifications:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {truncateDescription(job.qualifications, 150)}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onGenerateInterview(job)}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          <Sparkles size={18} />
          {isGenerating ? 'Generating...' : 'Generate Interview'}
        </button>

        <button
          onClick={() => onApply(job)}
          disabled={isApplying}
          className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-orange-500 dark:hover:border-orange-500 px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink size={18} />
          {isApplying ? 'Applying...' : 'Apply'}
        </button>
      </div>

      {/* Application Instructions (if no direct URL) */}
      {job.applicationInfo?.instruction && !job.applicationInfo?.uris?.length && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Application Instructions:</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {truncateDescription(job.applicationInfo.instruction, 200)}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobCard;
