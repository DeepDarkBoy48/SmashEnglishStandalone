
import { Sparkles, Book, PenTool, Star, BookOpen } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  activeTab: 'analyzer' | 'dictionary' | 'writing' | 'youtube' | 'saved-words' | 'reading';
  onNavigate: (tab: 'analyzer' | 'dictionary' | 'writing' | 'youtube' | 'saved-words' | 'reading') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {



  return (
    <header className="bg-white dark:bg-[#0d1117] border-b border-gray-100 dark:border-gray-800/60 sticky top-0 z-10 transition-colors">
      <div className="container mx-auto px-4 h-10 sm:h-11 md:h-12 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate('analyzer')}
        >
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-800 dark:text-gray-100 hidden md:block">GrammaViz</span>
          <span className="font-bold text-lg tracking-tight text-gray-800 dark:text-gray-100 md:hidden">GV</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end overflow-hidden">
          <nav className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => onNavigate('youtube')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'youtube'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 hidden xs:block" />
              视频跟读
            </button>
            <button
              onClick={() => onNavigate('reading')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'reading'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <BookOpen className="w-3.5 h-3.5 hidden xs:block" />
              精读文章
            </button>
            <button
              onClick={() => onNavigate('saved-words')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'saved-words'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Star className="w-3.5 h-3.5 hidden xs:block" />
              每日复习
            </button>
            <button
              onClick={() => onNavigate('analyzer')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'analyzer'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 hidden xs:block" />
              句法
            </button>
            <button
              onClick={() => onNavigate('dictionary')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'dictionary'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Book className="w-3.5 h-3.5 hidden xs:block" />
              词典
            </button>
            <button
              onClick={() => onNavigate('writing')}
              className={`whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${activeTab === 'writing'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <PenTool className="w-3.5 h-3.5 hidden xs:block" />
              写作
            </button>
          </nav>
          
          <ThemeToggle />
        </div>

      </div>
    </header>
  );
};
