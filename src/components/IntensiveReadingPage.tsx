import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Languages, 
  BookOpen,
  Loader2,
  ArrowLeft,
  X,
  History
} from 'lucide-react';
import { 
  analyzeSentenceService, 
  quickLookupService, 
  translateService, 
  createReadingNotebookService,
  updateReadingNotebookService,
  getReadingNotebookDetailService,
  getSavedWordsService
} from '../services/geminiService';
import type { ReadingNotebook } from '../types';
import { ResultDisplay } from './ResultDisplay';
import { QuickLookupDisplay } from './AiSharedComponents';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ResultItem {
  id: string;
  type: 'analysis' | 'dictionary' | 'translation';
  data: any;
  timestamp: number;
}

interface IntensiveReadingPageProps {
  initialNotebookData?: ReadingNotebook | null;
  onBack?: () => void;
  initialHighlightedWord?: string;
}

  /**
   * Precise Sentence-level Wrapper - Moved outside for better performance and mobile support
   */
  const SentenceAnalysisWrapper: React.FC<{ 
    children: any, 
    content: string,
    onAnalyze: (content: string) => void,
    onTranslate: (content: string) => void,
    isActive: boolean,
    isTouchDevice: boolean,
    isOpen: boolean,
    onToggle: () => void
  }> = ({ children, content, onAnalyze, onTranslate, isActive, isTouchDevice, isOpen, onToggle }) => {
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0, show: false });
    const menuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
      if (!isActive) return;
      // Desktop only check
      if (window.innerWidth < 768) return;
      
      e.preventDefault();
      e.stopPropagation();
      setMenuPos({ x: e.clientX, y: e.clientY, show: true });
    };

    useEffect(() => {
      const handleClickOutside = (e: Event) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuPos(prev => ({ ...prev, show: false }));
        } else {
          // If it's a click event that reached here, close it
          setMenuPos(prev => ({ ...prev, show: false }));
        }
      };
      if (menuPos.show) {
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('scroll', handleClickOutside, true);
      }
      return () => {
        window.removeEventListener('click', handleClickOutside);
        window.removeEventListener('scroll', handleClickOutside, true);
      };
    }, [menuPos.show]);

    return (
      <span 
        className={`group/sentence relative inline transition-all duration-300 ${isActive ? (isOpen ? 'bg-pink-500/10' : 'hover:bg-pink-500/10 dark:hover:bg-pink-500/20 cursor-pointer') : ''} rounded px-1 -mx-1`}
        onClick={(e) => {
          if (!isActive) return;
          e.stopPropagation();
          if (isTouchDevice) {
            onToggle();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {children}
        
        {/* Mobile Tooltip - Only show on small screens */}
        {isActive && (
          <span className={`absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-0.5 transition-all duration-500 z-[40] bg-white dark:bg-gray-900 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 p-1 rounded-full 
            ${isOpen 
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
              : 'opacity-0 translate-y-2 scale-90 pointer-events-none'
            }`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(content);
              }}
              className="p-1.5 px-3 text-pink-600 dark:text-pink-400 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-500/20 rounded-full flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>分析</span>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTranslate(content);
              }}
              className="p-1.5 px-3 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500/20 rounded-full flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>翻译</span>
            </button>
          </span>
        )}

        {/* Tooltip for touch devices or Context Menu for mouse devices */}
        {isActive && !isTouchDevice && menuPos.show && (
          <div 
            ref={menuRef}
            style={{ 
              position: 'fixed', 
              left: Math.min(menuPos.x, window.innerWidth - 160), 
              top: Math.min(menuPos.y, window.innerHeight - 100),
              zIndex: 9999
            }}
            className="hidden md:flex flex-col bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden min-w-[140px] animate-in fade-in zoom-in duration-150"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(content);
                setMenuPos(prev => ({ ...prev, show: false }));
              }}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors w-full text-left"
            >
              <Sparkles className="w-4 h-4" />
              句法分析
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTranslate(content);
                setMenuPos(prev => ({ ...prev, show: false }));
              }}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors w-full text-left"
            >
              <Languages className="w-4 h-4" />
              极速翻译
            </button>
          </div>
        )}
      </span>
    );
  };

export const IntensiveReadingPage: React.FC<IntensiveReadingPageProps> = ({ initialNotebookData, onBack, initialHighlightedWord }) => {
  const [inputMode, setInputMode] = useState(!initialNotebookData || !initialNotebookData.id || (initialNotebookData as any)._forceEdit);
  const [text, setText] = useState(initialNotebookData?.content || '');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState(initialNotebookData?.title || '');
  const [highlightedWord, setHighlightedWord] = useState(initialHighlightedWord || '');
  
  // Use pointer capability for smarter device detection
  const [isTouchDevice, setIsTouchDevice] = useState(() => 
    window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [studyMode, setStudyMode] = useState<'normal' | 'word' | 'sentence' | 'analysis'>(() => {
    return isTouchDevice ? 'word' : 'analysis';
  });
  const [showMobileResults, setShowMobileResults] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSentenceKey, setActiveSentenceKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mode change or outside click should clear active sentence
  useEffect(() => {
    setActiveSentenceKey(null);
  }, [studyMode]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
      // Clear sentence selection when clicking background
      if (activeSentenceKey && (e.target as HTMLElement).closest('.group\\/sentence') === null) {
         setActiveSentenceKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu, activeSentenceKey]);
  
  const [notebookId, setNotebookId] = useState<number | null>(initialNotebookData?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [savedWordsSet, setSavedWordsSet] = useState<Set<string>>(new Set());
  const [savedWordsList, setSavedWordsList] = useState<any[]>([]);
  const [showSavedHighlights, setShowSavedHighlights] = useState(() => {
    const saved = localStorage.getItem('smash_english_show_saved_highlights');
    return saved === null ? true : saved === 'true';
  });
  const [highlightScope, setHighlightScope] = useState<'global' | 'notebook'>(() => {
    return (localStorage.getItem('smash_english_highlight_scope') as 'global' | 'notebook') || 'global';
  });
  
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted word
  useEffect(() => {
    if (highlightedWord && text) {
      // Need a bit of delay for ReactMarkdown and our interactive wrappers to settle
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll(`[data-word="${highlightedWord.toLowerCase()}"]`);
        if (elements.length > 0) {
          elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: briefly pulse the element
          elements[0].classList.add('animate-pulse-highlight');
          setTimeout(() => elements[0].classList.remove('animate-pulse-highlight'), 3000);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [highlightedWord, text, inputMode]);

  // Fetch saved words for highlighting
  useEffect(() => {
    localStorage.setItem('smash_english_show_saved_highlights', showSavedHighlights.toString());
    localStorage.setItem('smash_english_highlight_scope', highlightScope);
  }, [showSavedHighlights, highlightScope]);

  useEffect(() => {
    const fetchSavedWords = async () => {
      try {
        const data = await getSavedWordsService();
        setSavedWordsList(data.words);
        updateActiveHighlights(data.words, highlightScope);
      } catch (err) {
        console.error('Failed to fetch saved words:', err);
      }
    };
    fetchSavedWords();
  }, []);

  const updateActiveHighlights = (words: any[], scope: 'global' | 'notebook') => {
    if (scope === 'global') {
      const wordSet = new Set(words.map(w => w.word.toLowerCase().trim()));
      setSavedWordsSet(wordSet);
    } else {
      const filtered = words.filter(w => w.reading_id === notebookId);
      const wordSet = new Set(filtered.map(w => w.word.toLowerCase().trim()));
      setSavedWordsSet(wordSet);
    }
  };

  useEffect(() => {
    updateActiveHighlights(savedWordsList, highlightScope);
  }, [highlightScope, notebookId, savedWordsList]);

  // Fetch full details if content is missing
  useEffect(() => {
    const fetchFullDetail = async () => {
      if (notebookId && notebookId !== 0 && !text) {
         setIsDetailLoading(true);
         try {
           const fullData = await getReadingNotebookDetailService(notebookId);
           setText(fullData.content || '');
           if (fullData.title) setTitle(fullData.title);
         } catch (err) {
           console.error('Failed to fetch notebook detail:', err);
         } finally {
           setIsDetailLoading(false);
         }
      }
    };
    fetchFullDetail();
  }, [notebookId]);

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Small delay to ensure the DOM has updated and content is rendered
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [results]);

  const handleStartReading = async () => {
    let finalContent = text;
    let finalTitle = '';

    // Auto-save logic
    setIsSaving(true);
    try {
      // Prioritize manually entered title, then crawled title, then first line
      const finalDisplayTitle = title.trim() || finalTitle || finalContent.trim().split('\n')[0].slice(0, 50) || '未命名精读';
      const wordCount = finalContent.split(/\s+/).length;
      
      const payload = {
        title: finalDisplayTitle,
        content: finalContent,
        description: finalContent.trim().slice(0, 150) + '...',
        word_count: wordCount
      };

      if (notebookId && notebookId !== 0) {
        await updateReadingNotebookService(notebookId, payload);
        // Ensure the title state is updated with what we actually saved
        if (!title.trim()) setTitle(finalDisplayTitle);
      } else {
        const result = await createReadingNotebookService(payload);
        setNotebookId(result.id);
        setTitle(result.title);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
      setInputMode(false);
    }
  };

   const addResult = (type: ResultItem['type'], data: any) => {
    const newItem: ResultItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: Date.now()
    };
    setResults(prev => [...prev, newItem]);
    
    // Auto-open mobile results
    if (window.innerWidth < 1024) {
      setShowMobileResults(true);
    }
  };

  const handleAnalyze = async (sentence: string) => {
    const loadingKey = `analysis-${sentence}`;
    if (loadingStates[loadingKey]) return;

    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const result = await analyzeSentenceService(sentence);
      addResult('analysis', result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleTranslate = async (sentence: string) => {
    const loadingKey = `translate-${sentence}`;
    if (loadingStates[loadingKey]) return;

    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const result = await translateService(sentence);
      addResult('translation', { ...result, original: sentence });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };
  
  // handleSaveNotebook removed - integrated into handleStartReading

   const handleWordClick = async (word: string, context: string) => {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
    if (!cleanWord) return;

    const loadingKey = `dict-${cleanWord}`;
    if (loadingStates[loadingKey]) return;

    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    try {
      // Build internal reference URL with word for highlighting
      const currentUrl = notebookId ? `/intensive-reading?id=${notebookId}&word=${encodeURIComponent(cleanWord)}` : undefined;
      const result = await quickLookupService(cleanWord, context, currentUrl, notebookId || undefined);
      addResult('dictionary', { ...result, originalSentence: context });
      
      // Update local set to highlight immediately after saving
      const newWord = { word: cleanWord, reading_id: notebookId };
      setSavedWordsList(prev => [...prev, newWord]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

   const renderWord = (word: string, context: string, punct?: string) => {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase().trim();
    const isDeepLinkHighlighted = highlightedWord && cleanWord === highlightedWord.toLowerCase();
    const isSavedHighlighted = showSavedHighlights && savedWordsSet.has(cleanWord);
    const isHighlighted = isDeepLinkHighlighted || isSavedHighlighted;
    const isWordMode = studyMode === 'word';
    const isSentenceMode = studyMode === 'sentence';
    const isAnalysisMode = studyMode === 'analysis';
    const canInteract = isWordMode || isAnalysisMode;

    return (
      <React.Fragment key={Math.random()}>
        <span
          data-word={cleanWord}
          className={`px-0.5 transition-all rounded ${canInteract ? 'cursor-pointer' : (isSentenceMode ? '' : 'cursor-text')} ${
            isHighlighted 
              ? (isDeepLinkHighlighted ? 'bg-yellow-400 dark:bg-yellow-600/60 ring-2 ring-yellow-400/50' : 'bg-yellow-400/60 dark:bg-yellow-600/30 ring-1 ring-yellow-400/20') + ' text-black dark:text-white font-bold'
              : (canInteract ? 'border-b border-dashed border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 hover:border-yellow-400' : '')
          }`}
          onClick={(e) => {
            if (!canInteract) return;
            e.stopPropagation();
            handleWordClick(word, context);
            if (highlightedWord) setHighlightedWord('');
          }}
        >
          {word}
        </span>
        {punct}
      </React.Fragment>
    );
  };

   const makeTextInteractive = (text: string) => {
    // Regex to split by sentences (. or ?) while keeping the separators
    const sentenceParts = text.split(/(?<=[.!?])\s+/);
    
    return sentenceParts.map((sentence, sIdx) => {
      if (!sentence.trim()) return sentence;

      // Always process into words for highlighting
      const words = sentence.split(/(\s+)/);
      const interactiveContent = (
        <React.Fragment>
          {words.map((part, wIdx) => {
            if (/\s+/.test(part)) return <React.Fragment key={wIdx}>{part}</React.Fragment>;
            const match = part.match(/^([a-zA-Z0-9'-]+)(.*)$/);
            if (match) {
              return <React.Fragment key={wIdx}>{renderWord(match[1], sentence, match[2])}</React.Fragment>;
            }
            return <React.Fragment key={wIdx}>{part}</React.Fragment>;
          })}
        </React.Fragment>
      );

      const sentenceKey = `${sentence}-${sIdx}`;
      const isCurrentlyActive = activeSentenceKey === sentenceKey;

      return (
        <SentenceAnalysisWrapper 
          key={sIdx} 
          content={sentence} 
          onAnalyze={handleAnalyze} 
          onTranslate={handleTranslate}
          isActive={studyMode === 'sentence' || studyMode === 'analysis'}
          isTouchDevice={isTouchDevice}
          isOpen={isCurrentlyActive}
          onToggle={() => setActiveSentenceKey(isCurrentlyActive ? null : sentenceKey)}
        >
          {interactiveContent}
        </SentenceAnalysisWrapper>
      );
    });
  };

  const makeInteractive = (node: any): any => {
    if (typeof node === 'string') {
      return makeTextInteractive(node);
    }
    if (Array.isArray(node)) {
      return node.map((child, i) => <React.Fragment key={i}>{makeInteractive(child)}</React.Fragment>);
    }
    if (React.isValidElement(node)) {
      const type = node.type as any;
      const children = (node.props as any).children;

      const inlineTypes = ['strong', 'em', 'code', 'span', 'a', 'b', 'i', 'del'];
      if (typeof type === 'string' && inlineTypes.includes(type)) {
        const { children: _, ...otherProps } = node.props as any;
        return React.cloneElement(node, {
          ...otherProps,
          children: makeInteractive(children)
        });
      }
    }
    return node;
  };

  /**
   * Helper to extract plain text from React children for analysis context
   */
  const getPlainText = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(getPlainText).join('');
    if (React.isValidElement(children)) return getPlainText((children.props as any).children);
    return '';
  };

  if (inputMode) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in relative">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 text-gray-400 hover:text-pink-500 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">返回列表</span>
          </button>
        )}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-pink-50 dark:bg-pink-950/50 rounded-2xl text-pink-600 dark:text-pink-400 mb-2">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-50 font-serif">
            精读模式
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-serif">
            粘贴一段你想深入研读的英文文本，AI 将助你剖析每一个细节。
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-pink-500 dark:focus:border-pink-500 outline-none transition-all shadow-lg text-xl font-serif font-bold"
            placeholder="文章标题 (可选，默认为正文第一行)"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-80 p-6 rounded-3xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 focus:border-pink-500 dark:focus:border-pink-500 outline-none transition-all resize-none shadow-xl text-lg font-serif"
            placeholder="在此处输入或粘贴你的文章内容"
          />
          <button
            onClick={handleStartReading}
            disabled={!text.trim()}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white rounded-2xl font-bold text-xl shadow-lg shadow-pink-200 dark:shadow-pink-900/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-6 h-6" />
            开始深度阅读
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          {[
            { icon: Sparkles, title: "句法分析", desc: "可视化句子结构，攻克长难句" },
            { icon: Languages, title: "精准翻译", desc: "结合上下文的自然翻译" },
            { icon: BookOpen, title: "极速查词", desc: "无需跳转，点击单词即刻解析" },
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-2">
              <feature.icon className="w-6 h-6 mx-auto text-pink-500" />
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{feature.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center h-full w-full bg-gray-50 dark:bg-black/90 relative overflow-hidden">
      <div className="w-full max-w-[1440px] flex flex-col lg:flex-row h-full bg-white dark:bg-black border-x border-gray-100 dark:border-gray-900 shadow-2xl relative overflow-hidden">
        {/* Left Column: Article View (2/3 on Desktop) */}
        <div className="flex-[2] overflow-y-auto scroll-smooth relative border-r border-gray-100 dark:border-gray-800 flex flex-col">
          <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/50">
            <div className="w-full px-6 py-4 flex items-center">
              {/* Left side: Back Button */}
              <div className="flex-none flex items-center justify-start min-w-[60px]">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">返回</span>
                  </button>
                )}
              </div>

              {/* Center: Title */}
              <div className="flex-1 flex items-center justify-center px-4 overflow-hidden relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={async () => {
                    if (notebookId && title.trim()) {
                      setIsSaving(true);
                      try {
                        await updateReadingNotebookService(notebookId, { title: title.trim() });
                      } catch (err) {
                        console.error('Failed to update title:', err);
                      } finally {
                        setIsSaving(false);
                      }
                    }
                  }}
                  className="w-full max-w-xl text-center bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 font-serif font-bold text-lg md:text-xl truncate hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg px-2 py-1 transition-colors cursor-edit"
                  placeholder="未命名文章"
                />
                {isSaving && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[8px] text-pink-500 font-bold uppercase tracking-widest animate-pulse whitespace-nowrap">
                    <Loader2 className="w-2 h-2 animate-spin" />
                    保存中
                  </div>
                )}
              </div>

              {/* Right side: Controls */}
              <div className="flex-none flex items-center justify-end gap-2 shrink-0 ml-2 relative" ref={menuRef}>
                  {/* Desktop View: Full controls */}
                  {!isTouchDevice ? (
                      <div className="flex items-center gap-3">
                          {/* Highlighting Controls */}
                          <div className="flex items-center gap-1 p-1 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 transition-all shrink-0">
                              <button
                                  onClick={() => setShowSavedHighlights(!showSavedHighlights)}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all text-[10px] font-bold ${
                                      showSavedHighlights 
                                          ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400' 
                                          : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                  title={showSavedHighlights ? '点击关闭已存高亮' : '点击开启已存高亮'}
                              >
                                  <History className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">已存高亮</span>
                              </button>
                              
                              {showSavedHighlights && (
                                  <div className="flex items-center gap-0.5 ml-1 px-1 border-l border-gray-200 dark:border-gray-700">
                                      <button
                                          onClick={() => setHighlightScope('global')}
                                          className={`px-1.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                                              highlightScope === 'global'
                                                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                                  : 'text-gray-400 hover:text-gray-600'
                                          }`}
                                      >
                                          全
                                      </button>
                                      <button
                                          onClick={() => setHighlightScope('notebook')}
                                          className={`px-1.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                                              highlightScope === 'notebook'
                                                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                                  : 'text-gray-400 hover:text-gray-600'
                                          }`}
                                      >
                                          本
                                      </button>
                                  </div>
                              )}
                          </div>

                          {/* Mode Switcher */}
                          <div className="flex items-center p-0.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm shrink-0 overflow-hidden">
                              <button
                                  onClick={() => setStudyMode('normal')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                      studyMode === 'normal' 
                                          ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm' 
                                          : 'text-gray-400'
                                  }`}
                              >
                                  <BookOpen className="w-3 h-3" />
                                  <span>普通</span>
                              </button>
                              <button
                                  onClick={() => setStudyMode('analysis')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                      studyMode === 'analysis' 
                                          ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm' 
                                          : 'text-gray-400'
                                  }`}
                              >
                                  <Sparkles className="w-3 h-3" />
                                  <span>解析</span>
                              </button>
                          </div>
                      </div>
                  ) : (
                      /* Mobile View: Toggler for Dropdown */
                      <div className="flex items-center gap-2">
                          <button
                              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                                  showSettingsMenu 
                                      ? 'bg-pink-500 text-white border-pink-500 shadow-lg' 
                                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
                              }`}
                          >
                              {studyMode === 'normal' && <BookOpen className="w-3.5 h-3.5" />}
                              {studyMode === 'word' && <Sparkles className={`w-3.5 h-3.5 ${showSettingsMenu ? 'text-white' : 'text-pink-500'}`} />}
                              {studyMode === 'sentence' && <History className="w-3.5 h-3.5" />}
                              <span className="text-[11px] font-bold">
                                  {studyMode === 'normal' ? '普通' : (studyMode === 'word' ? '单词' : '句子')}模式
                              </span>
                              <div className={`w-1.5 h-1.5 rounded-full ${showSavedHighlights ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                          </button>

                          {/* Mobile Settings Dropdown */}
                          {showSettingsMenu && (
                              <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 p-2 z-[101] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                                  {/* Study Mode Section */}
                                  <div className="mb-3">
                                      <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">交互模式</p>
                                      <div className="space-y-1">
                                          <button
                                              onClick={() => { setStudyMode('normal'); setShowSettingsMenu(false); }}
                                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${studyMode === 'normal' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                          >
                                              <div className="flex items-center gap-3">
                                                  <BookOpen className="w-4 h-4" />
                                                  <span className="text-sm font-bold">普通模式</span>
                                              </div>
                                              {studyMode === 'normal' && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                                          </button>
                                          <button
                                              onClick={() => { setStudyMode('word'); setShowSettingsMenu(false); }}
                                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${studyMode === 'word' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                          >
                                              <div className="flex items-center gap-3">
                                                  <Sparkles className="w-4 h-4" />
                                                  <span className="text-sm font-bold">单词模式</span>
                                              </div>
                                              {studyMode === 'word' && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                                          </button>
                                          <button
                                              onClick={() => { setStudyMode('sentence'); setShowSettingsMenu(false); }}
                                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${studyMode === 'sentence' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                          >
                                              <div className="flex items-center gap-3">
                                                  <History className="w-4 h-4" />
                                                  <span className="text-sm font-bold">句子模式</span>
                                              </div>
                                              {studyMode === 'sentence' && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                                          </button>
                                      </div>
                                  </div>

                                  <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-2 mb-2" />

                                  {/* Highlight Section */}
                                  <div>
                                      <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">词汇高亮</p>
                                      <button
                                          onClick={() => setShowSavedHighlights(!showSavedHighlights)}
                                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold text-sm"
                                      >
                                          <span>显示已存单词</span>
                                          <div className={`w-9 h-5 rounded-full transition-all relative ${showSavedHighlights ? 'bg-green-500' : 'bg-gray-300'}`}>
                                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showSavedHighlights ? 'left-5' : 'left-1'}`} />
                                          </div>
                                      </button>
                                      
                                      {showSavedHighlights && (
                                          <div className="flex p-1 mt-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                              <button
                                                  onClick={() => setHighlightScope('global')}
                                                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${highlightScope === 'global' ? 'bg-white dark:bg-gray-700 text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                              >
                                                  全局
                                              </button>
                                              <button
                                                  onClick={() => setHighlightScope('notebook')}
                                                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${highlightScope === 'notebook' ? 'bg-white dark:bg-gray-700 text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                              >
                                                  本页
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-3xl mx-auto px-6 md:px-10 py-8 lg:py-12 space-y-8">
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-pink-500 animate-spin opacity-50" />
                <p className="mt-4 text-gray-500 font-serif">正在加载文章内容...</p>
              </div>
            ) : (
              <div className="prose prose-pink dark:prose-invert max-w-none prose-p:my-2 prose-headings:font-serif">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="text-lg md:text-xl text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
                        {makeInteractive(children)}
                      </p>
                    ),
                    li: ({ children }) => (
                      <li className="mb-2 text-lg text-gray-700 dark:text-gray-300">
                        {makeInteractive(children)}
                      </li>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold mb-6 font-serif border-b pb-2">
                        {makeInteractive(children)}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold mt-8 mb-4 font-serif">
                        {makeInteractive(children)}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-bold mt-6 mb-2 font-serif">
                        {makeInteractive(children)}
                      </h3>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</th>,
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-sm border-t border-gray-100 dark:border-gray-800">
                        {makeInteractive(children)}
                      </td>
                    ),
                    code: ({ children, inline }: any) => {
                      if (inline) {
                        return <code className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-mono text-sm inline-block">{children}</code>;
                      }
                      return (
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto my-4 font-mono text-sm leading-relaxed border border-gray-800 shadow-lg">
                          <code>{children}</code>
                        </pre>
                      );
                    },
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-pink-200 dark:border-pink-900 pl-4 my-4 italic text-gray-600 dark:text-gray-400">{children}</blockquote>,
                  }}
                >
                  {text}
                </ReactMarkdown>
              </div>
            )}
           </div>
        </div>
      </div>

        {/* Right Column: AI Analysis Panel (1/3 on Desktop) */}
        {/* Desktop Panel */}
        <div className="hidden lg:flex flex-[1] flex flex-col bg-gray-50 dark:bg-[#0d1117] h-full border-l border-gray-100 dark:border-gray-800">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 shadow-sm bg-white/50 dark:bg-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-400 rounded-lg ">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">AI 分析面板</h2>
                {results.length > 0 && (
                  <p className="text-[10px] text-gray-400 font-medium">{results.length} 条分析</p>
                )}
              </div>
              <div className="ml-auto">
                {results.length > 0 && (
                  <button
                    onClick={() => setResults([])}
                    className="text-[10px] text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-all"
                  >
                    <X className="w-3 h-3" />
                    <span>清空</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar h-full">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                <History className="w-10 h-10 text-gray-300" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-gray-400">暂无记录</p>
                  <p className="text-xs">点击左侧原文开始分析</p>
                </div>
              </div>
            ) : (
              results.map((res) => (
                <div key={res.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {res.type === 'analysis' && (
                    <ResultDisplay result={res.data} compact={true} />
                  )}
                  {res.type === 'dictionary' && (
                    <QuickLookupDisplay result={res.data} />
                  )}
                  {res.type === 'translation' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Languages className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">极速翻译</span>
                      </div>
                      <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
                        {res.data.translation}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            {Object.entries(loadingStates).some(([_, loading]) => loading) && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500 opacity-50" />
              </div>
            )}
            <div ref={resultsEndRef} />
          </div>
        </div>

        {/* Mobile/Tablet Results Bottom Sheet */}
        <div className={`lg:hidden fixed inset-0 z-[100] transition-all duration-500 ${showMobileResults ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${showMobileResults ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setShowMobileResults(false)}
          />
          
          {/* Sheet */}
          <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0d1117] rounded-t-[2.5rem] shadow-2xl transition-transform duration-500 ease-out border-t border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] ${showMobileResults ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
               <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-4" onClick={() => setShowMobileResults(false)} />
               <div className="w-full px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-500" />
                    <span className="font-bold text-gray-900 dark:text-gray-100 italic">AI 分析结果</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {results.length > 0 && (
                      <button onClick={() => setResults([])} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" /> 清空
                      </button>
                    )}
                    <button onClick={() => setShowMobileResults(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar pb-10">
              {results.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <History className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">暂无分析记录</p>
                  <p className="text-sm">在相应模式下点击单词或句子即可查看</p>
                </div>
              ) : (
                results.slice().reverse().map((res) => (
                  <div key={res.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {res.type === 'analysis' && <ResultDisplay result={res.data} compact={true} />}
                    {res.type === 'dictionary' && <QuickLookupDisplay result={res.data} />}
                    {res.type === 'translation' && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Languages className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Quick Translation</span>
                        </div>
                        <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed font-serif font-medium">
                          {res.data.translation}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
              {Object.entries(loadingStates).some(([_, loading]) => loading) && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500 opacity-50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating FAB for Mobile results */}
        {results.length > 0 && !showMobileResults && (
          <button 
            onClick={() => setShowMobileResults(true)}
            className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-full shadow-[0_8px_30px_rgb(236,72,153,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 animate-in zoom-in duration-300"
          >
            <Sparkles className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-white dark:bg-gray-900 text-pink-500 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-pink-500 shadow-sm leading-none">
              {results.length}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
