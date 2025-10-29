import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Users, Target, BarChart3, CreditCard, LogOut, ChevronDown, Menu, X, Sun, Moon } from 'lucide-react';

const Layout = ({
  children,
  currentLang,
  setCurrentLang,
  showLanguageMenu,
  setShowLanguageMenu,
  sidebarCollapsed,
  setSidebarCollapsed,
  darkMode,
  setDarkMode,
  t
}) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-all duration-300 relative`}>
        {/* Logo/Brand */}
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                JasTalk
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI Interview Agent</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Language Selector & Theme Toggle */}
        <div className="px-4 py-3 border-b dark:border-gray-700 space-y-2">
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className={`${sidebarCollapsed ? 'w-12 h-12 justify-center' : 'w-full'} flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
            >
              <Globe size={20} className="text-gray-600 dark:text-gray-300" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentLang === 'en' ? 'English' : currentLang === 'zh' ? '中文' : 'Español'}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {showLanguageMenu && (
              <div className={`absolute ${sidebarCollapsed ? 'left-full ml-2' : 'left-0 right-0'} top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50`}>
                <button
                  onClick={() => { setCurrentLang('en'); setShowLanguageMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-lg">🇬🇧</span>
                  {!sidebarCollapsed && <span>English</span>}
                </button>
                <button
                  onClick={() => { setCurrentLang('zh'); setShowLanguageMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-lg">🇨🇳</span>
                  {!sidebarCollapsed && <span>中文</span>}
                </button>
                <button
                  onClick={() => { setCurrentLang('es'); setShowLanguageMenu(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-lg">🇪🇸</span>
                  {!sidebarCollapsed && <span>Español</span>}
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`${sidebarCollapsed ? 'w-12 h-12 justify-center' : 'w-full'} flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group`}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun size={20} className="text-yellow-500 group-hover:text-yellow-400 transition-colors" />
            ) : (
              <Moon size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
            )}
            {!sidebarCollapsed && (
              <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-2">
            {!sidebarCollapsed && <p className="px-3 text-xs font-semibold text-gray-400 mb-2">{t.mainMenu}</p>}
          </div>

          <Link
            to="/"
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${isActive('/') ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={sidebarCollapsed ? t.mockInterviews : ''}
          >
            <Users size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.mockInterviews}</span>}
          </Link>

          <Link
            to="/custom"
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${isActive('/custom') ? 'bg-orange-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={sidebarCollapsed ? t.customInterviews : ''}
          >
            <Target size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.customInterviews}</span>}
          </Link>

          <Link
            to="/results"
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${isActive('/results') ? 'bg-orange-400 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={sidebarCollapsed ? t.results : ''}
          >
            <BarChart3 size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.results}</span>}
          </Link>

          <Link
            to="/billing"
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-colors ${isActive('/billing') ? 'bg-green-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={sidebarCollapsed ? t.billing : ''}
          >
            <CreditCard size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.billing}</span>}
          </Link>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t dark:border-gray-700">
          <button className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="font-medium">{t.signOut}</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
};

export default Layout;
