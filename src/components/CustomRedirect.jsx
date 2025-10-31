import React, { useEffect } from 'react';

const CustomRedirect = () => {
  useEffect(() => {
    // Redirect to the standalone Next.js AI Job Fit Analyzer
    window.location.href = 'http://localhost:3004';
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Redirecting to AI Job Fit Analyzer</h2>
        <p className="text-gray-600 dark:text-gray-400">Loading the enhanced AI-powered resume analysis tool...</p>
        <div className="mt-4">
          <a 
            href="http://localhost:3004" 
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Click here if not redirected automatically
          </a>
        </div>
      </div>
    </div>
  );
};

export default CustomRedirect;