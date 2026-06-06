import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, LayoutDashboard, Send, FileCode, LogOut, Sun, Moon } from 'lucide-react';
import { authService } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const isActive = (path) => {
    if (path === '/campaigns') {
      return location.pathname.startsWith('/campaigns');
    }
    return location.pathname === path;
  };

  const linkClass = (path) =>
    `flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${
      isActive(path)
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="bg-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
            <Mail className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-300">
            MailJet Bulk
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-2">
          <Link to="/" className={linkClass('/')}>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link to="/campaigns" className={linkClass('/campaigns')}>
            <Send className="h-4 w-4" />
            <span>Campaigns</span>
          </Link>
          <Link to="/templates" className={linkClass('/templates')}>
            <FileCode className="h-4 w-4" />
            <span>Templates</span>
          </Link>
        </nav>

        {/* Right Operations */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-gray-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user.role} Account
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all duration-300"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90">
        <Link to="/" className="flex flex-col items-center p-2 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600">
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          <span>Dashboard</span>
        </Link>
        <Link to="/campaigns" className="flex flex-col items-center p-2 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600">
          <Send className="h-4 w-4 mb-0.5" />
          <span>Campaigns</span>
        </Link>
        <Link to="/templates" className="flex flex-col items-center p-2 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600">
          <FileCode className="h-4 w-4 mb-0.5" />
          <span>Templates</span>
        </Link>
      </div>
    </header>
  );
}
