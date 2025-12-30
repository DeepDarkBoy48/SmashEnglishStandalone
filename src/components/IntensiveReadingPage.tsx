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
  getReadingNotebookDetailService
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

export const IntensiveReadingPage: React.FC<IntensiveReadingPageProps> = ({ initialNotebookData, onBack, initialHighlightedWord }) => {
  const [inputMode, setInputMode] = useState(!initialNotebookData || !initialNotebookData.id || (initialNotebookData as any)._forceEdit);
  const [text, setText] = useState(initialNotebookData?.content || '');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState(initialNotebookData?.title || '');
  const [highlightedWord, setHighlightedWord] = useState(initialHighlightedWord || '');
  const [studyMode, setStudyMode] = useState<'lookup' | 'analysis'>('lookup');
  
  const [notebookId, setNotebookId] = useState<number | null>(initialNotebookData?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
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
    scrollToBottom();
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
      const result = await quickLookupService(cleanWord, context, currentUrl);
      addResult('dictionary', { ...result, originalSentence: context });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const renderWord = (word: string, context: string, punct?: string) => {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase().trim();
    const isHighlighted = highlightedWord && cleanWord === highlightedWord.toLowerCase();

    return (
      <React.Fragment key={Math.random()}>
        <span
          data-word={cleanWord}
          className={`px-0.5 cursor-pointer transition-all border-b border-dashed border-gray-300 dark:border-gray-600 rounded ${
            isHighlighted 
              ? 'bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white font-bold ring-2 ring-yellow-400/50 shadow-sm' 
              : 'hover:bg-yellow-200 dark:hover:bg-yellow-900/50 hover:border-yellow-400'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleWordClick(word, context);
            if (highlightedWord) setHighlightedWord(''); // Clear highlight on manual click if desired
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

      if (studyMode === 'analysis') {
        return (
          <SentenceAnalysisWrapper key={sIdx} content={sentence}>
            {sentence}
          </SentenceAnalysisWrapper>
        );
      }

      // Lookup mode: split into words
      const words = sentence.split(/(\s+)/);
      return (
        <React.Fragment key={sIdx}>
          {words.map((part) => {
            if (/\s+/.test(part)) return part;
            const match = part.match(/^([a-zA-Z0-9'-]+)(.*)$/);
            if (match) {
              return renderWord(match[1], sentence, match[2]);
            }
            return part;
          })}
        </React.Fragment>
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
   * Precise Sentence-level Wrapper
   */
  const SentenceAnalysisWrapper: React.FC<{ children: any, content: string }> = ({ children, content }) => {
    return (
      <span className="group/sentence relative inline transition-all duration-300 hover:bg-pink-500/10 dark:hover:bg-pink-500/20 rounded px-1 -mx-1 cursor-default">
        {children}
        <span className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 opacity-0 group-hover/sentence:opacity-100 translate-y-1 group-hover/sentence:translate-y-0 transition-all duration-300 z-[40] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 p-1 rounded-full scale-95 group-hover/sentence:scale-100 pointer-events-none group-hover/sentence:pointer-events-auto">
          {/* Invisible bridge to catch hover when moving mouse to the toolbar */}
          <div className="absolute -bottom-3 left-0 right-0 h-4 bg-transparent" />
          
          <button
            onClick={() => handleAnalyze(content)}
            className="p-1.5 px-3 text-pink-600 dark:text-pink-400 hover:bg-pink-500 hover:text-white dark:hover:bg-pink-500/20 rounded-full flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95 relative z-10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>语法分析</span>
          </button>
          <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 relative z-10" />
          <button
            onClick={() => handleTranslate(content)}
            className="p-1.5 px-3 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500/20 rounded-full flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95 relative z-10"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>极速翻译</span>
          </button>
        </span>
      </span>
    );
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
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-black">
      {/* Left Column: Article View */}
      <div className="flex-1 overflow-y-auto border-r border-gray-100 dark:border-gray-800 scroll-smooth">
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/50">
          <div className="max-w-5xl mx-auto px-6 py-4 md:px-12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">返回列表</span>
                </button>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
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
            </div>

            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="flex items-center gap-2 text-xs text-pink-500 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>自动同步中...</span>
                </div>
              )}

              <div className="hidden md:flex items-center p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <button
                  onClick={() => setStudyMode('lookup')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                    studyMode === 'lookup' 
                      ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  单词模式
                </button>
                <button
                  onClick={() => setStudyMode('analysis')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                    studyMode === 'analysis' 
                      ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  解析模式
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 md:px-12 space-y-6">
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

      {/* Right Column: Results Sidebar */}
      <div className="w-[450px] 2xl:w-[550px] bg-gray-50 dark:bg-[#0d1117] flex flex-col border-l border-gray-100 dark:border-gray-800 transition-all duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm bg-white dark:bg-[#0d1117] z-10 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-gray-800 dark:text-gray-200">AI 分析面板</h2>
          </div>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              清除记录
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth transition-all">
          {results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
              <History className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              <div className="space-y-1">
                <p className="text-lg font-bold">暂无分析记录</p>
                <p className="text-sm">点击左侧句子或单词开始探索</p>
              </div>
            </div>
          ) : (
            results.map((res) => (
              <div key={res.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
                {res.type === 'analysis' && (
                  <ResultDisplay result={res.data} compact={true} />
                )}
                {res.type === 'dictionary' && (
                  <QuickLookupDisplay result={res.data} />
                )}
                {res.type === 'translation' && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-6 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <Languages className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">极速翻译</span>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-3 font-serif line-clamp-2">
                       "{res.data.original}"
                    </p>
                    <p className="text-lg text-gray-800 dark:text-gray-100 font-medium leading-relaxed">
                      {res.data.translation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
          {/* Progress Indicators */}
          {Object.entries(loadingStates).some(([_, loading]) => loading) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500 opacity-50" />
            </div>
          )}
          <div ref={resultsEndRef} />
        </div>
      </div>
    </div>
  );
};
