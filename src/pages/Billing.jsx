import React from 'react';
import { CreditCard, Check } from 'lucide-react';

const Billing = ({ t }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t.billingAccount}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your subscription and payment settings</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.status}</label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                    {t.freeTrial}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.plan}</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Free Trial</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.email}</label>
                <p className="text-lg text-gray-900 dark:text-white">user@example.com</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Upgrade to Premium</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="text-green-500 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Unlimited mock interviews</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-500 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Advanced AI feedback</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-500 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Custom interview templates</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-500 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </div>

              <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 mt-6">
                <CreditCard size={18} />
                {t.upgradePremium}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
