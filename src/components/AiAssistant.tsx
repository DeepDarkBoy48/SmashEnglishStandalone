
import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Bot, Sparkles, Loader2, Pin, PinOff, History, MessageSquare, Play } from 'lucide-react';
import type { Message, Thread } from '../types';
import { getChatResponseService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ResultDisplay } from './ResultDisplay';
import { CompactDictionaryResult, QuickLookupDisplay } from './AiSharedComponents';

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
          {isPinned ? renderPinnedHeader() : renderFloatingHeader()}

          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
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

          {!isThinking && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 transition-colors ${isPinned ? 'bg-white dark:bg-[#0d1117] border-t border-gray-100 dark:border-gray-800/60' : 'bg-gray-50 dark:bg-gray-800/50 border-t border-gray-50 dark:border-gray-700/50'}`}>
              {renderSuggestions()}
            </div>
          )}

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

      {!isPinned && activeTab !== 'youtube' && (
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
