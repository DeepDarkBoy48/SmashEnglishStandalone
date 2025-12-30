import React, { useEffect, useState, useMemo } from 'react';
import { 
  getTodayReviewService, 
  submitReviewFeedbackService,
  getReviewPromptService,
  importReviewArticleService
} from '../services/geminiService';
import type { TodayReviewResponse, SavedWord } from '../types';
import {
  Loader2, ArrowLeft, BrainCircuit, Sparkles,
  CheckCircle2, Trophy, X,
  MessageSquare, Headphones, BookType, LayoutGrid, RotateCcw,
  Mic2, BookText, Copy, ClipboardCheck, FilePlus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReviewPageProps {
  onBack: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ onBack }) => {
  const [reviewData, setReviewData] = useState<TodayReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<number, number>>({}); // wordId -> rating
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [reviewMode, setReviewMode] = useState<'article' | 'cards'>('article');
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [activeModalWordId, setActiveModalWordId] = useState<number | null>(null);

  useEffect(() => {
    fetchTodayReview();
  }, []);

  const fetchTodayReview = async () => {
    setIsLoading(true);
    try {
      const data = await getTodayReviewService();
      setReviewData(data);
      
      const initialFeedback: Record<number, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      data.words.forEach(w => {
        if (w.last_review && w.last_review.startsWith(todayStr)) {
          initialFeedback[w.id] = 2; // 默认 Good
        }
      });
      setFeedbackStatus(initialFeedback);
    } catch (err) {
      console.error(err);
      alert('无法获取今日复习内容');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (wordId: number, rating: number) => {
    if (feedbackStatus[wordId]) return;
    try {
      await submitReviewFeedbackService({ word_id: wordId, rating });
      setFeedbackStatus((prev: Record<number, number>) => ({ ...prev, [wordId]: rating }));
    } catch (err) {
      alert('提交反馈失败');
    }
  };

  const handleGetPrompt = async () => {
    setIsPromptLoading(true);
    try {
      const data = await getReviewPromptService();
      setPrompt(data.prompt);
    } catch (err) {
      alert('获取 Prompt 失败');
    } finally {
      setIsPromptLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setIsImporting(true);
    try {
      const data = JSON.parse(importJson);
      await importReviewArticleService({
        title: data.title,
        content: data.content,
        article_type: data.article_type
      } as any);
      alert('导入成功！');
      setImportJson('');
      setPrompt(null);
      fetchTodayReview();
    } catch (err) {
      console.error(err);
      alert('导入失败：请确保输入的是正确的 JSON 格式');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('确定要重新生成吗？这将清空当前文章内容。')) return;
    try {
      if (reviewData?.article?.id) {
        await importReviewArticleService({
          title: `${new Date().toISOString().split('T')[0]} 复习计划`,
          content: '',
          article_type: 'none'
        } as any);
      }
      setPrompt(null);
      fetchTodayReview();
    } catch (err) {
      alert('操作失败');
    }
  };

  const completedCount = useMemo(() => {
    return Object.keys(feedbackStatus).length;
  }, [feedbackStatus]);



  const renderContentWithHighlights = () => {
    if (!reviewData?.article) return null;
    const { words } = reviewData;
    return (
      <div className="prose prose-lg prose-pink dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            strong: ({ node, ...props }) => {
              const text = props.children;
              const wordStr = Array.isArray(text) ? text.join('') : String(text);
              const wordObj = words.find((w: SavedWord) => w.word.toLowerCase() === wordStr.toLowerCase());
              if (wordObj) {
                const isFinished = !!feedbackStatus[wordObj.id];
                return (
                  <button
                    onClick={() => {
                      setActiveModalWordId(wordObj.id);
                    }}
                    className={`font-bold transition-all px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${isFinished
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-b-2 border-green-500'
                        : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-b-2 border-pink-500 hover:scale-105'
                      }`}
                  >
                    {props.children}
                    {isFinished && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                );
              }
              return <strong className="font-bold text-gray-900 dark:text-white" {...props} />;
            },
            h1: ({ node, ...props }) => <h1 className="text-4xl font-serif font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-3xl font-serif font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-2xl font-serif font-bold mt-6 mb-3 text-pink-600 dark:text-pink-400" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-xl font-bold mt-4 mb-2 text-gray-700 dark:text-gray-300" {...props} />,
            p: ({ node, ...props }) => {
              const content = props.children;
              const textContent = Array.isArray(content) ? content.join('') : String(content);
              if (textContent.startsWith('Host:') || textContent.includes('**Host:**')) {
                return <p className="mb-4 leading-relaxed text-base text-gray-700 dark:text-gray-300" {...props} />;
              }
              return <p className="mb-6 leading-relaxed text-lg text-gray-700 dark:text-gray-300" {...props} />;
            },
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 pl-6 pr-4 py-4 my-6 italic text-gray-700 dark:text-gray-300 rounded-r-2xl" {...props} />
            ),
            hr: ({ node, ...props }) => (
              <hr className="my-12 border-t-2 border-gray-200 dark:border-gray-800" {...props} />
            ),
            ul: ({ node, ...props }) => <ul className="space-y-2 my-6" {...props} />,
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            code: ({ node, ...props }: any) => {
              const inline = !props.className;
              return inline 
                ? <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400" {...props} />
                : <code className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-mono overflow-x-auto" {...props} />;
            }
          }}
        >
          {reviewData.article.content}
        </ReactMarkdown>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-gray-500 animate-pulse">AI 正在为你准备今日特供复习文章...</p>
      </div>
    );
  }

  if (!reviewData || reviewData.words.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <div>
            <h2 className="text-2xl font-bold">今日任务完成！</h2>
            <p className="text-gray-500 mt-2">你还没有待复习的新词，请继续保持学习！</p>
        </div>
        <button onClick={onBack} className="px-6 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all">返回收藏夹</button>
      </div>
    );
  }

  const { article, words } = reviewData;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-gray-50/80 dark:bg-black/80 backdrop-blur-xl py-4 border-b border-gray-100 dark:border-gray-800 px-2">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium hidden md:inline">退出挑战</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl">
          <button onClick={() => setReviewMode('article')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reviewMode === 'article' ? 'bg-white dark:bg-gray-700 text-pink-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookType className="w-4 h-4" /> AI 文章模式
          </button>
          <button onClick={() => setReviewMode('cards')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reviewMode === 'cards' ? 'bg-white dark:bg-gray-700 text-pink-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid className="w-4 h-4" /> 单词卡片模式
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-col hidden md:flex items-end">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">复习进度</div>
             <div className="text-sm font-bold text-pink-500">{completedCount} / {words.length}</div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 hidden md:block" />
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
            {article?.article_type === 'podcast' && <Mic2 className="w-5 h-5" />}
            {article?.article_type === 'interview' && <Headphones className="w-5 h-5" />}
            {article?.article_type === 'debate' && <MessageSquare className="w-5 h-5" />}
            {article?.article_type && (['blog', 'news'].includes(article.article_type)) && <BookText className="w-5 h-5" />}
            {!article && <BrainCircuit className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {reviewMode === 'article' ? (
        <>
          <header className="space-y-4 text-center py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-full text-[10px] font-bold ring-1 ring-pink-100 dark:ring-pink-900/30 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {(article && article.content) ? `今日特供 · ${article.article_type.toUpperCase()}` : "等待内容导入"}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight px-4">
              {(article && article.content) ? article.title : "手动导入 AI 复习内容"}
            </h1>
          </header>

          {article?.content ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
               <button onClick={handleRegenerate} className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 rounded-xl text-sm font-bold hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all shadow-lg">
                <Sparkles className="w-4 h-4" /> 重新生成
              </button>
              {renderContentWithHighlights()}
            </div>
          ) : (
            <div className="space-y-8">
               <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <MessageSquare className="w-5 h-5 text-pink-500" />
                       <h3 className="font-bold">1. 获取 AI 复习 Prompt</h3>
                    </div>
                    {prompt && (
                      <button onClick={handleCopyPrompt} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-pink-500 text-white hover:bg-pink-600'}`}>
                         {isCopied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         {isCopied ? '已复制' : '复制 Prompt'}
                      </button>
                    )}
                  </div>
                  {!prompt ? (
                    <button onClick={handleGetPrompt} disabled={isPromptLoading} className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 hover:text-pink-500 hover:border-pink-200 transition-all flex flex-col items-center gap-2">
                       {isPromptLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8" />}
                       <span className="font-bold">点击生成今日复习 Prompt</span>
                    </button>
                  ) : (
                    <div className="bg-gray-50 dark:bg-black/40 rounded-2xl p-4 max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-800">
                       <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans leading-relaxed">{prompt}</pre>
                    </div>
                  )}
               </div>

               <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2">
                      <FilePlus className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold">2. 导入 AI 生成的结果 (JSON)</h3>
                  </div>
                  <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder='在此粘贴 AI 返回的 JSON 代码块...' className="w-full h-40 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm font-code focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                  <button onClick={handleImport} disabled={isImporting || !importJson.trim()} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "导入并刷新文章"}
                  </button>
               </div>
            </div>
          )}
        </>
      ) : (
        <section className="space-y-6">
           <header className="text-center py-4">
               <h2 className="text-3xl font-serif font-bold">待复习单词卡片</h2>
               <p className="text-gray-500 mt-2 italic text-sm">直接点击卡片进行记忆反馈，无需阅读文章。</p>
           </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
              {words.map((item) => {
                const isFinished = !!feedbackStatus[item.id];
                const isFlipped = flippedIds.has(item.id);
                return (
                  <div key={item.id} id={`word-card-${item.id}`} className={`relative w-full h-[450px] transition-all duration-500 [perspective:1000px] group ${isFinished ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                      
                      {/* Front */}
                      <div onClick={() => setFlippedIds(prev => new Set(prev).add(item.id))} className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 flex flex-col shadow-xl cursor-pointer hover:border-pink-200 transition-colors">
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800/30">
                              <MessageSquare className="w-3 h-3" /> Context
                            </div>
                            <div className="text-xl text-gray-800 dark:text-gray-100 leading-relaxed font-medium">
                              "{item.context.split(new RegExp(`(${item.word})`, 'gi')).map((part, i) => part.toLowerCase() === item.word.toLowerCase() ? <span key={i} className="text-pink-600 dark:text-pink-400 font-bold underline decoration-2 underline-offset-4">{part}</span> : part)}"
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                          <h3 className="text-3xl font-bold mb-1">{item.word}</h3>
                          <div className="mt-6 flex justify-center">
                             <div className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-2xl text-base font-bold shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
                               <Sparkles className="w-4 h-4" /> 点击此处思索释义
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Back */}
                      <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white dark:bg-gray-950 border-2 border-pink-100 dark:border-pink-900/30 rounded-[2.5rem] p-6 flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                           <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-bold">{item.word}</h3>
                             <button onClick={(e) => { e.stopPropagation(); setFlippedIds(prev => { const next = new Set(prev); next.delete(item.id); return next; }); }} className="text-gray-300 hover:text-gray-500">
                               <RotateCcw className="w-4 h-4" />
                             </button>
                           </div>
                           <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-2.5 py-1 rounded-full border border-pink-100 dark:border-pink-800/20 uppercase">{item.data?.partOfSpeech}</span>
                              {item.data?.grammarRole && <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/20 uppercase">{item.data.grammarRole}</span>}
                           </div>
                           <div className="space-y-4">
                              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{item.data?.contextMeaning || item.data?.m}</p>
                              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-sm text-gray-600 dark:text-gray-400 leading-relaxed border border-gray-100 dark:border-gray-800">{item.data?.explanation}</div>
                              {item.data?.otherMeanings?.map((m: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1 pl-3 border-l-2 border-pink-100 dark:border-pink-900/30">
                                   <span className="font-bold text-base text-gray-800 dark:text-gray-200">{m.meaning}</span>
                                   <p className="text-sm text-gray-500">"{m.example}"</p>
                                </div>
                              ))}
                           </div>
                        </div>
                        <div className="pt-4 border-t border-gray-50 dark:border-gray-900">
                          <div className="grid grid-cols-4 gap-1.5">
                            <button onClick={() => handleFeedback(item.id, 1)} className="flex flex-col items-center gap-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100">
                              <span className="text-base">😫</span><span className="text-xs font-bold">Again</span>
                            </button>
                            <button onClick={() => handleFeedback(item.id, 2)} className="flex flex-col items-center gap-1 p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl hover:bg-orange-100 transition-all border border-orange-100">
                              <span className="text-base">🤔</span><span className="text-xs font-bold">Hard</span>
                            </button>
                            <button onClick={() => handleFeedback(item.id, 3)} className="flex flex-col items-center gap-1 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100">
                              <span className="text-base">🙂</span><span className="text-xs font-bold">Good</span>
                            </button>
                            <button onClick={() => handleFeedback(item.id, 4)} className="flex flex-col items-center gap-1 p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl hover:bg-green-100 transition-all border border-green-100">
                              <span className="text-base">🤩</span><span className="text-xs font-bold">Easy</span>
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
        </section>
      )}

      {completedCount === words.length && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in zoom-in-50 duration-500">
          <div className="bg-gradient-to-tr from-green-500 to-emerald-400 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white">
            <Trophy className="w-8 h-8" />
            <div>
              <div className="font-bold text-lg">挑战完成！</div>
              <div className="text-xs opacity-90">今日复习的所有单词已全部吸收</div>
            </div>
            <button onClick={onBack} className="ml-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all">完成</button>
          </div>
        </div>
      )}

      {/* Article Mode Word Card Modal */}
      {activeModalWordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
           <div 
             className="absolute inset-0 bg-black/40 backdrop-blur-md"
             onClick={() => setActiveModalWordId(null)}
           />
           <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border-2 border-pink-100 dark:border-pink-900/30 rounded-[2.5rem] p-8 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh]">
              {/* Close Button */}
              <button 
                onClick={() => setActiveModalWordId(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              {(() => {
                const item = words.find(w => w.id === activeModalWordId);
                if (!item) return null;
                return (
                  <>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-3 py-1 rounded-full border border-pink-100 dark:border-pink-800/20 uppercase">
                            {item.data?.partOfSpeech}
                          </span>
                          {item.data?.grammarRole && (
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/20 uppercase">
                              {item.data.grammarRole}
                            </span>
                          )}
                        </div>
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{item.word}</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">文中释义</div>
                          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 leading-tight">
                            {item.data?.contextMeaning || item.data?.m}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 深度解析</div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-3xl text-sm text-gray-600 dark:text-gray-400 leading-relaxed border border-gray-100 dark:border-gray-800">
                            {item.data?.explanation}
                          </div>
                        </div>

                        {item.data?.otherMeanings && item.data.otherMeanings.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">其他常见释义</div>
                            <div className="space-y-3">
                              {item.data.otherMeanings.map((m: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1.5 pl-4 border-l-2 border-pink-100 dark:border-pink-900/30">
                                   <span className="font-bold text-base text-gray-800 dark:text-gray-200">{m.meaning}</span>
                                   <p className="text-sm text-gray-500 leading-snug">"{m.example}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-900">
                      <div className="grid grid-cols-4 gap-3">
                        <button 
                          onClick={() => { handleFeedback(item.id, 1); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">😫</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Again</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 2); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all border border-orange-100 dark:border-orange-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🤔</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Hard</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 3); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-100 dark:border-blue-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🙂</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Good</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 4); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all border border-green-100 dark:border-green-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🤩</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Easy</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
           </div>
        </div>
      )}
    </div>
  );
};
