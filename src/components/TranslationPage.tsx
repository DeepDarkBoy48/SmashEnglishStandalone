import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Info, RefreshCw, ChevronDown } from 'lucide-react';
import { translateAdvancedService } from '../services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LANGUAGES = [
  { code: 'zh', name: 'Chinese (Simplified, China)' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

const PROMPTS = [
  { label: 'Translate this and make it sound more fluent.', icon: '✨' },
  { label: 'Translate this and make it more business formal.', icon: '💼' },
  { label: 'Translate this as if you’re explaining it to a child.', icon: '👶' },
  { label: 'Translate this for an academic audience.', icon: '🎓' },
];

export const TranslationPage: React.FC = () => {
  const [sourceLang, setSourceLang] = useState('zh');
  const [targetLang, setTargetLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  const handleTranslate = useCallback(async (text: string, customPrompt?: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setIsLoading(true);
    try {
      const result = await translateAdvancedService({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        custom_prompt: customPrompt
      });
      setTranslatedText(result.translation);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('Error during translation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceLang, targetLang]);

  // Debounced translation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!activePrompt && sourceText.trim()) {
         handleTranslate(sourceText);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [sourceText, handleTranslate, activePrompt]);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePromptClick = (prompt: string) => {
    setActivePrompt(prompt);
    handleTranslate(sourceText, prompt);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-4 md:py-6 animate-fade-in flex flex-col flex-1">
      {/* Container */}
      <div className="bg-white dark:bg-[#121212] rounded-3xl md:rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl flex flex-col flex-1 p-3 md:p-6 lg:p-8 transition-colors duration-300">
        
        {/* Header - Language Selection */}
        <div className="flex flex-row items-center justify-between mb-4 md:mb-6 gap-2 md:gap-4">
          <div className="flex-1 min-w-0 relative">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white/90 border border-gray-100 dark:border-white/10 rounded-xl md:rounded-2xl pl-2 md:pl-5 pr-8 md:pr-10 py-2.5 md:py-3.5 appearance-none focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/10 transition-all cursor-pointer font-medium text-xs md:text-base truncate"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#1a1a1a]">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-white/40 pointer-events-none" />
          </div>

          <button
            onClick={handleSwapLanguages}
            className="p-2 md:p-2.5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg md:rounded-xl transition-all text-gray-400 dark:text-white/60 hover:text-gray-900 dark:hover:text-white shrink-0 group"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5 group-active:rotate-180 transition-transform duration-500" />
          </button>

          <div className="flex-1 min-w-0 relative">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white/90 border border-gray-100 dark:border-white/10 rounded-xl md:rounded-2xl pl-2 md:pl-5 pr-8 md:pr-10 py-2.5 md:py-3.5 appearance-none focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/10 transition-all cursor-pointer font-medium text-xs md:text-base truncate"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#1a1a1a]">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Translation Area */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3 md:gap-6 flex-1 mb-4 md:mb-6">
          {/* Source Text Area */}
          <div className="relative group flex flex-col bg-gray-50/30 dark:bg-white/[0.02] rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 focus-within:ring-2 focus-within:ring-gray-100 dark:focus-within:ring-white/5 transition-all min-h-[140px] md:min-h-[200px]">
            <textarea
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                setActivePrompt(null);
              }}
              placeholder="Type or paste text to translate"
              className="flex-1 bg-transparent text-gray-900 dark:text-white/90 p-4 md:p-6 resize-none focus:outline-none text-base md:text-lg leading-relaxed placeholder:text-gray-400 dark:placeholder:text-white/20"
            />
            <div className="px-4 py-2 flex justify-end items-center text-gray-400 dark:text-white/10 text-[10px] md:text-xs font-mono uppercase tracking-widest pointer-events-none">
              <span>{sourceText.length} chars</span>
            </div>
          </div>

          {/* Target Text Area */}
          <div className="relative group flex flex-col bg-gray-50/50 dark:bg-white/[0.04] rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 transition-all min-h-[140px] md:min-h-[200px]">
            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar relative">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-white/30 animate-pulse">
                   <RefreshCw className="w-4 h-4 animate-spin" />
                   <span className="text-base md:text-lg">Translating...</span>
                </div>
              ) : translatedText ? (
                <div className="text-gray-900 dark:text-white/90 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-serif">
                  {translatedText}
                </div>
              ) : (
                <div className="text-gray-400 dark:text-white/10 text-base md:text-lg italic select-none">
                  Translation will appear here
                </div>
              )}

              {/* Copy Button */}
              {translatedText && !isLoading && (
                <button
                  onClick={handleCopy}
                  className="absolute bottom-2 right-2 md:bottom-4 md:right-4 p-2 md:p-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-transparent rounded-lg md:rounded-xl transition-all text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white group"
                  title="Copy Translation"
                >
                  {isCopied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              )}
            </div>
            
            <div className="px-4 py-2 flex justify-end items-center text-gray-400 dark:text-white/10 text-[10px] md:text-xs font-mono uppercase tracking-widest uppercase">
              <span>Output</span>
            </div>
          </div>
        </div>

        {/* Style selection buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mt-auto">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => handlePromptClick(prompt.label)}
              disabled={!sourceText.trim() || isLoading}
              className={cn(
                "group p-2.5 md:p-4 rounded-xl border transition-all text-left flex flex-col gap-1 md:gap-2 disabled:cursor-not-allowed",
                activePrompt === prompt.label 
                  ? "bg-gray-50 dark:bg-white/[0.15] border-gray-400 dark:border-white/30 text-gray-950 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-transparent" 
                  : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-white/40 hover:enabled:bg-gray-50 dark:hover:enabled:bg-white/[0.06] hover:enabled:border-gray-200 dark:hover:enabled:border-white/10 hover:enabled:text-gray-900 dark:hover:enabled:text-white shadow-sm"
              )}
            >
              <span className="text-lg md:text-xl group-hover:scale-110 transition-transform">{prompt.icon}</span>
              <span className="text-[10px] md:text-xs font-medium leading-tight line-clamp-2">{prompt.label}</span>
            </button>
          ))}
        </div>

      </div>
      
      {/* Footer Info */}
      <div className="mt-3 md:mt-4 mb-1 flex items-center justify-center gap-2 text-gray-400 dark:text-white/20 text-[10px] md:text-xs">
        <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span>Powered by Advanced AI for natural translations</span>
      </div>
    </div>
  );
};
