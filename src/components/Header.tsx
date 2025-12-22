
import React, { useEffect } from 'react';
import { Sparkles, Book, PenTool } from 'lucide-react';

interface HeaderProps {
  activeTab: 'analyzer' | 'dictionary' | 'writing' | 'youtube';
  onNavigate: (tab: 'analyzer' | 'dictionary' | 'writing' | 'youtube') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('app-theme'); 
  }, []);



  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 transition-colors">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate('analyzer')}
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100 hidden md:block">GrammaViz</span>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100 md:hidden">GV</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <nav className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => onNavigate('analyzer')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'analyzer'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Sparkles className="w-4 h-4 hidden sm:block" />
              句法
            </button>
            <button
              onClick={() => onNavigate('dictionary')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'dictionary'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Book className="w-4 h-4 hidden sm:block" />
              词典
            </button>
            <button
              onClick={() => onNavigate('writing')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'writing'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <PenTool className="w-4 h-4 hidden sm:block" />
              写作
            </button>
            <button
              onClick={() => onNavigate('youtube')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'youtube'
                ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Sparkles className="w-4 h-4 hidden sm:block" />
              视频学习
            </button>
          </nav>


        </div>

      </div>
    </header>
  );
};
