import React from 'react';

function Header({ templateName, questionCount, language, onLanguageChange }) {
  const languageOptions = [
    { code: 'en', label: '🇺🇸 English', name: 'English' },
    { code: 'zh', label: '🇨🇳 中文', name: '中文' },
    { code: 'es', label: '🇪🇸 Español', name: 'Español' }
  ];

  const currentLangName = languageOptions.find(l => l.code === language)?.name || 'English';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Jastalk Interview Agent</h1>
          <p className="text-gray-600 mt-1">
            {templateName || 'Voice Interview Practice'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            {languageOptions.map(option => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interview Info */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-sm text-purple-600 font-medium">Template</div>
          <div className="text-lg font-semibold text-purple-900">
            {templateName || '-'}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm text-blue-600 font-medium">Questions</div>
          <div className="text-lg font-semibold text-blue-900">
            {questionCount > 0 ? questionCount : '-'}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-sm text-green-600 font-medium">Language</div>
          <div className="text-lg font-semibold text-green-900">
            {currentLangName}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
