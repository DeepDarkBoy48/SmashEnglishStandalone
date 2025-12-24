
import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Bot, Sparkles, Loader2, Pin, PinOff, History, MessageSquare, Play } from 'lucide-react';
import type { Message, Thread } from '../types';
import { getChatResponseService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ResultDisplay } from './ResultDisplay';

interface AiAssistantProps {
  currentContext: string | null;
  contextType: 'sentence' | 'word' | 'writing';
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  isPinned: boolean;
  onPinChange: (isPinned: boolean) => void;
  // Multi-thread additions
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onResumeVideo?: () => void;
  activeTab?: string;
}

const CHIP_BASE = "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm flex items-center gap-1.5";
const CHIP_DEFAULT = `${CHIP_BASE} bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600`;
const CHIP_PRIMARY = `${CHIP_BASE} bg-red-600 hover:bg-red-700 text-white border-transparent shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95`;

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  currentContext, 
  contextType,
  isOpen,
  onOpenChange,
  messages,
  onMessagesChange,
  isPinned,
  onPinChange,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onResumeVideo,
  activeTab
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isThinking]);

  // Handle context changes - Note: Parent should probably handle the "New Context" message if desired, 
  // or we can keep this effect but be careful not to conflict with parent updates.
  // For now, let's allow the parent to reset messages if needed, or we can just append a system message here.
  // But strictly lifting state means parent controls messages. 
  // Let's rely on parent to add "Context Loaded" message if it wants to reset conversation.

  const handleSend = async (content: string) => {
    if (!content.trim() || isThinking) return;

    const userMsg: Message = { role: 'user', content: content };
    const newMessages = [...messages, userMsg];
    onMessagesChange(newMessages);
    setInputValue("");
    setIsThinking(true);

    try {
      const responseText = await getChatResponseService(newMessages, currentContext, content, contextType);
      onMessagesChange([...newMessages, { role: 'assistant', content: responseText }]);
    } catch (error) {
      onMessagesChange([...newMessages, { role: 'assistant', content: "抱歉，连接出了点问题，请稍后再试。" }]);
    } finally {
      setIsThinking(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const containerClasses = isPinned
    ? 'w-full h-full flex flex-col font-sans bg-white dark:bg-[#0d1117] border-l border-gray-200 dark:border-gray-800/60'
    : isOpen
      ? 'fixed z-50 inset-0 md:inset-auto md:bottom-6 md:right-6 flex flex-col items-end font-sans'
      : 'fixed z-50 bottom-6 right-6 flex flex-col items-end font-sans';

  const cardClasses = isPinned
    ? 'w-full h-full flex flex-col overflow-hidden bg-white dark:bg-[#0d1117]'
    : 'w-full h-full md:w-[500px] md:h-[80vh] md:max-h-[800px] md:mb-4 bg-white dark:bg-[#0d1117] md:rounded-2xl shadow-2xl shadow-gray-900/20 dark:shadow-gray-950/50 border border-pink-300 dark:border-pink-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 transition-colors';

  const renderSuggestions = () => {
    const hasVideoControl = messages.some(m => m.type === 'video_control');

    return (
      <>
        {hasVideoControl && activeTab === 'youtube' && (
          <button 
            onClick={onResumeVideo} 
            className={`${CHIP_PRIMARY} animate-in fade-in zoom-in duration-300`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>继续播放视频</span>
          </button>
        )}
        {contextType === 'sentence' ? (
          <>
            <button onClick={() => handleSend("解释一下这个句子的语法结构")} className={CHIP_DEFAULT}>✨ 解释语法结构</button>
            <button onClick={() => handleSend("这句话里的重点单词有哪些？")} className={CHIP_DEFAULT}>📖 重点单词</button>
          </>
        ) : contextType === 'word' ? (
          <>
            <button onClick={() => handleSend("帮我造几个不同的例句")} className={CHIP_DEFAULT}>📝 生成更多例句</button>
            <button onClick={() => handleSend("这个词有什么同义词？")} className={CHIP_DEFAULT}>🔄 同义词辨析</button>
          </>
        ) : (
          <>
            <button onClick={() => handleSend("这篇文章的语气是否足够正式？")} className={CHIP_DEFAULT}>👔 检查语气</button>
            <button onClick={() => handleSend("有哪些表达可以更地道一些？")} className={CHIP_DEFAULT}>🌟 优化地道表达</button>
          </>
        )}
      </>
    );
  };

  // 固定模式使用简洁的头部样式
  const renderPinnedHeader = () => (
    <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between bg-white dark:bg-[#0d1117] shrink-0">
      <div className="flex items-center gap-2 overflow-hidden">
        <Bot className="w-5 h-5 text-pink-500 shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <h2 className="font-semibold text-gray-800 dark:text-white truncate">
            {activeThreadId ? "对话中" : "AI 助手"}
          </h2>
          {activeThreadId && (
             <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
               {contextType === 'sentence' ? '语法' : contextType === 'word' ? '词汇' : '写作'}
             </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-pink-50 text-pink-500 dark:bg-pink-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
          title="历史记录"
        >
          <History className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onPinChange(!isPinned)} 
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
          title="取消固定"
        >
          <PinOff className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onPinChange(false)} 
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // 浮动模式使用简洁头部 - 白色背景+粉红描边
  const renderFloatingHeader = () => (
    <div className="bg-white dark:bg-[#0d1117] px-3 py-2 flex justify-between items-center border-b border-pink-200 dark:border-pink-800/50 z-10 shrink-0 safe-top">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-pink-500" />
        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">AI 助手</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-pink-50 text-pink-500 dark:bg-pink-900/20' : 'hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-500 dark:text-gray-400'}`}
          title="历史记录"
        >
          <History className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onPinChange(!isPinned)} 
          className="hover:bg-pink-50 dark:hover:bg-pink-900/20 p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-pink-500"
          title="固定侧边栏"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => onOpenChange(false)} 
          className="hover:bg-pink-50 dark:hover:bg-pink-900/20 p-1.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-pink-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );


  return (
    <div className={containerClasses}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        .markdown-body p { margin-bottom: 0.5em; }
        .markdown-body p:last-child { margin-bottom: 0; }
      `}</style>

      {(isOpen || isPinned) && (
        <>
          <div className={cardClasses}>
          {/* Header - 根据模式切换样式 */}
          {isPinned ? renderPinnedHeader() : renderFloatingHeader()}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* History Overlay */}
            {showHistory && (
              <div className="absolute inset-0 bg-white dark:bg-[#0d1117] z-30 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">历史会话</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        onNewChat();
                        setShowHistory(false);
                      }} 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-pink-500"
                      title="开启新对话"
                    >
                      <History className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                       <MessageSquare className="w-12 h-12 mb-2 opacity-10" />
                       <p className="text-sm">暂无历史记录</p>
                    </div>
                  ) : (
                    threads.map((thread: Thread) => (
                      <button
                        key={thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          setShowHistory(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all border ${
                          activeThreadId === thread.id 
                            ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30' 
                            : 'bg-white dark:bg-transparent border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            thread.contextType === 'sentence' ? 'bg-blue-400' : 'bg-green-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {thread.title}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(thread.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto space-y-4 custom-scrollbar transition-colors ${isPinned ? 'px-4 py-3 bg-white dark:bg-[#0d1117]' : 'px-3 py-4 bg-gray-50 dark:bg-gray-800/50 space-y-6'}`}>
              {messages.length === 0 && !isThinking && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                  <Bot className="w-12 h-12 opacity-10" />
                  <p className="text-sm">点击左侧句子或单词开启分析会话</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'analysis_result' && msg.data ? (
                    <div className="w-full">
                       <div className={`border border-gray-200 dark:border-gray-700 overflow-hidden ${isPinned ? 'bg-gray-50 dark:bg-gray-900/50 rounded-xl p-0' : 'bg-white dark:bg-[#0d1117] rounded-3xl p-1 shadow-sm'}`}>
                          <ResultDisplay result={msg.data} compact={true} />
                       </div>
                    </div>
                  ) : msg.type === 'dictionary_result' && msg.data ? (
                    <div className="w-full">
                       <div className={`border border-gray-200 dark:border-gray-700 overflow-hidden ${isPinned ? 'bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3' : 'bg-white dark:bg-[#0d1117] rounded-3xl p-4 shadow-sm'}`}>
                          <CompactDictionaryResult result={msg.data} />
                       </div>
                    </div>
                  ) : msg.type === 'quick_lookup_result' && msg.data ? (
                    <div className="w-full">
                       <QuickLookupDisplay result={msg.data} isPinned={isPinned} />
                    </div>
                  ) : msg.type === 'video_control' ? null : (
                    <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? (isPinned ? 'bg-pink-500 text-white max-w-[85%]' : 'bg-pink-600 text-white rounded-br-sm max-w-[90%] md:max-w-[98%] shadow-sm')
                        : (isPinned ? 'bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 w-full markdown-body' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-bl-sm max-w-[90%] md:max-w-[98%] shadow-sm markdown-body')
                    }`}>
                      {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2 transition-colors">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                    <span className="text-sm text-gray-400 dark:text-gray-500">正在思考...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggestions */}
          {!isThinking && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 transition-colors ${isPinned ? 'bg-white dark:bg-[#0d1117] border-t border-gray-100 dark:border-gray-800/60' : 'bg-gray-50 dark:bg-gray-800/50 border-t border-gray-50 dark:border-gray-700/50'}`}>
              {renderSuggestions()}
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} className={`shrink-0 safe-bottom transition-colors ${isPinned ? 'p-3 bg-white dark:bg-[#0d1117] border-t border-gray-100 dark:border-gray-800/60' : 'p-3 bg-white dark:bg-[#0d1117] border-t border-gray-100 dark:border-gray-700'}`}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入你的问题..."
                className={`w-full text-gray-700 dark:text-gray-200 focus:outline-none transition-all text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 ${isPinned ? 'pl-4 pr-10 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 focus:border-pink-300 dark:focus:border-pink-800' : 'pl-5 pr-12 py-3 rounded-full bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-800 focus:bg-white dark:focus:bg-gray-700'}`}
              />
              <button type="submit" disabled={!inputValue.trim() || isThinking} className={`absolute p-2 text-white disabled:opacity-50 transition-all ${isPinned ? 'right-1 p-1.5 bg-pink-500 hover:bg-pink-600 rounded-lg' : 'right-1.5 p-2 bg-pink-600 hover:bg-pink-700 rounded-full'}`}>
                <Send className={isPinned ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </button>
            </div>
          </form>
          </div>
        </>
      )}

      {/* Toggle Button - Only show when NOT pinned */}
      {!isPinned && (
        <button
          onClick={() => onOpenChange(!isOpen)}
          className={`group p-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-1.5 relative overflow-hidden ${isOpen ? 'hidden md:flex bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rotate-90 scale-90' : 'flex bg-gradient-to-tr from-pink-600 to-rose-500 text-white hover:scale-105 hover:-translate-y-0.5'}`}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
};

const CompactDictionaryResult: React.FC<{ result: any }> = ({ result }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-2">
        <h4 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{result.word}</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{result.phonetic}</span>
      </div>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pt-2">
        {result.entries.map((entry: any, eIdx: number) => (
          <div key={eIdx} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {entry.partOfSpeech}
              </span>
            </div>
            <div className="space-y-3 pl-1">
              {entry.definitions.map((def: any, dIdx: number) => (
                <div key={dIdx} className="text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-300 dark:text-gray-600 font-bold shrink-0">{dIdx + 1}.</span>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 leading-snug">{def.meaning}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{def.explanation}</p>
                    </div>
                  </div>
                  <div className="mt-1.5 ml-6 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-800/60/50">
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{def.example}"</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{def.exampleTranslation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 快速上下文查词结果展示组件
const QuickLookupDisplay: React.FC<{ result: any; isPinned?: boolean }> = ({ result, isPinned = false }) => {
  return (
    <div className={`border rounded-xl ${isPinned ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 p-4' : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 border-blue-200 dark:border-blue-900/50 rounded-2xl p-5 shadow-sm'}`}>
      {/* 单词标题与词性/成分标签 */}
      <div className={`flex flex-wrap items-center gap-2 ${isPinned ? 'mb-3' : 'mb-4'}`}>
        <span className={`font-bold text-blue-700 dark:text-blue-400 ${isPinned ? 'text-xl' : 'text-2xl'}`}>
          {result.word}
        </span>
        <div className="flex gap-1.5">
          {result.grammarRole && (
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-medium rounded-full border border-indigo-200 dark:border-indigo-800/50">
              {result.grammarRole}
            </span>
          )}
        </div>
      </div>

      {/* 原句展示 */}
      {result.originalSentence && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 opacity-80" />
          <p className="text-xl text-gray-900 dark:text-white leading-relaxed font-bold pr-2">
            {(() => {
              const text = result.originalSentence;
              const word = result.word;
              if (!word) return `"${text}"`;
              
              // Use regex to case-insensitively find the word
              const parts = text.split(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
              return (
                <>
                  "
                  {parts.map((part: string, i: number) => 
                    part.toLowerCase() === word.toLowerCase() ? (
                      <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded text-gray-900 dark:text-white">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )}
                  "
                </>
              );
            })()}
          </p>
        </div>
      )}
      
      {/* 释义与词性 */}
      <div className={`${isPinned ? 'mb-3' : 'mb-4'}`}>
        <div className={`font-semibold text-gray-800 dark:text-gray-100 flex items-baseline gap-2 ${isPinned ? 'text-base' : 'text-lg'}`}>
          <span className="shrink-0">📖</span>
          <span>{result.contextMeaning}</span>
          {result.partOfSpeech && (
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500 italic ml-1">
              ({result.partOfSpeech})
            </span>
          )}
        </div>
      </div>
      
      {/* 解释 */}
      <div className={`rounded-lg p-3 border ${isPinned ? 'bg-white/80 dark:bg-gray-900/30 border-blue-100/50 dark:border-gray-800' : 'bg-white/60 dark:bg-gray-900/40 rounded-xl p-4 border-blue-100/50 dark:border-gray-700'}`}>
        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="text-blue-500 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">为什么</span>
          </div>
          <p className="pl-1 border-l-2 border-blue-100 dark:border-blue-900/50">
            {result.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};

