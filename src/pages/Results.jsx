import React from 'react';
import { BarChart3, Target, Users, TrendingUp } from 'lucide-react';

const Results = ({ t }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t.yourResults}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Track your progress and improve your skills</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-orange-500" size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.totalInterviews}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-blue-500" size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Mock Interviews</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-purple-500" size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t.customInterviews}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-500" size={24} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg {t.score}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">-</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border dark:border-gray-700 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={40} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{t.noMockYet}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Complete your first interview to see results here</p>
        </div>
      </div>
    </div>
  );
};

export default Results;
