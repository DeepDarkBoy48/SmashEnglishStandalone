import React, { useState, useRef, useEffect } from 'react';
import { Youtube, Upload, Play, Sparkles, AlertCircle, Book, Search, Volume2, Loader2, FileUp } from 'lucide-react';
import { parseSRT } from '../utils/srtParser';
import type { SubtitleItem } from '../utils/srtParser';
import { analyzeSentenceService, lookupWordService } from '../services/geminiService';
import type { AnalysisResult, DictionaryResult } from '../types';
import { ResultDisplay } from './ResultDisplay';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

// Right panel tab type
type RightPanelTab = 'analysis' | 'dictionary';

export const YoutubeStudyPage: React.FC = () => {
  // --- State ---
  // Column 1: Video
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Column 2: Subtitles
  const [srtContent, setSrtContent] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Column 3: Analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Column 3: Dictionary
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('analysis');
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- Effects ---

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        // API Loaded
      };
    }
  }, []);

  // Initialize Player when videoId changes
  useEffect(() => {
    if (videoId && window.YT) {
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
      } else {
        new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            'playsinline': 1,
            'modestbranding': 1,
            'rel': 0
          },
          events: {
            'onReady': (event: any) => {
              playerRef.current = event.target;
              setIsPlayerReady(true);
            },
            'onStateChange': (_event: any) => {
              // Optional: Track state changes
            }
          }
        });
      }
    }
  }, [videoId]);

  // Sync active subtitle with video time (Optional polling)
  useEffect(() => {
    let interval: any;
    if (isPlayerReady && subtitles.length > 0) {
      interval = setInterval(() => {
        const currentTime = playerRef.current?.getCurrentTime?.();
        if (currentTime) {
          const currentSub = subtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime);
          if (currentSub && currentSub.id !== activeSubtitleId) {
            setActiveSubtitleId(currentSub.id);
            // Optional: Auto-scroll to active subtitle
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlayerReady, subtitles, activeSubtitleId]);


  // --- Handlers ---

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Extract ID from URL
    // Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      setVideoId(match[2]);
    } else {
      alert('无效的 YouTube URL');
    }
  };

  const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSrtContent(content);
        const parsed = parseSRT(content);
        setSubtitles(parsed);
      };
      reader.readAsText(file);
    }
  };

  const handleSrtPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setSrtContent(content);
    const parsed = parseSRT(content);
    setSubtitles(parsed);
  };

  const handleJumpToTime = (startTime: number) => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(startTime, true);
      playerRef.current.playVideo();
    }
  };

  const handleAnalyze = async (sub: SubtitleItem) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setRightPanelTab('analysis');

    try {
      // Use the cleaned text for analysis (no timestamps etc)
      const result = await analyzeSentenceService(sub.text.replace(/\n/g, ' '));
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err.message || "分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setSrtContent(content);
          const parsed = parseSRT(content);
          setSubtitles(parsed);
        };
        reader.readAsText(file);
      } else {
        alert('请上传 .srt 格式的字幕文件');
      }
    }
  };

  // --- Dictionary Handlers ---
  const handleDictSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dictQuery.trim() || isDictLoading) return;

    setIsDictLoading(true);
    setDictError(null);

    try {
      const data = await lookupWordService(dictQuery);
      setDictResult(data);
    } catch (err: any) {
      setDictError(err.message || "查询失败，请稍后再试。");
    } finally {
      setIsDictLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('您的浏览器不支持语音合成功能');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') && voice.name.includes('English')
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error('语音播放出错');
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    // Use viewport height minus Header (~60px) + Footer (~50px) + padding (~16px) = ~126px
    <div className="flex flex-col lg:flex-row gap-4 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
      
      {/* Column 1: Video Player (Flex 2) */}
      <div className="flex-[2] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
           <Youtube className="w-5 h-5 text-red-600" />
           <h2 className="font-semibold text-slate-800 dark:text-white">视频播放</h2>
        </div>
        
        <div className="flex-1 bg-black relative">
          {!videoId ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-100 dark:bg-slate-900">
                <div className="w-full max-w-md">
                   <form onSubmit={handleVideoUrlSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入 YouTube 视频地址..."
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                        加载
                      </button>
                   </form>
                   <p className="mt-4 text-sm text-slate-500">示例: https://www.youtube.com/watch?v=...</p>
                </div>
             </div>
          ) : (
            <div id="youtube-player" className="w-full h-full"></div>
          )}
        </div>
      </div>

      {/* Column 2: Subtitles (Flex 1) */}
      <div 
        className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-2 flex flex-col overflow-hidden transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Upload className="w-5 h-5 text-blue-500" />
             <h2 className="font-semibold text-slate-800 dark:text-white">字幕内容</h2>
           </div>
           {!subtitles.length && (
            <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors">
              导入 .srt
              <input type="file" accept=".srt" className="hidden" onChange={handleSrtUpload} />
            </label>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-0 relative">
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/80 flex flex-col items-center justify-center z-20 pointer-events-none">
              <FileUp className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
              <p className="text-blue-600 dark:text-blue-300 font-medium text-lg">释放鼠标上传 .srt 文件</p>
            </div>
          )}
          
          {!subtitles.length ? (
            <div className="h-full flex flex-col p-4 items-center justify-center">
              <div className="w-full max-w-sm text-center">
                <div className="mb-6 p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                  <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                    拖拽 .srt 文件到此处
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    或点击右上角按钮选择文件
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-slate-900 text-xs text-slate-400">或者</span>
                  </div>
                </div>
                <textarea
                  className="mt-4 w-full h-32 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="在此粘贴 SRT 字幕内容..."
                  value={srtContent}
                  onChange={handleSrtPaste}
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {subtitles.map((sub) => (
                <div 
                  key={sub.id} 
                  className={`group relative p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${activeSubtitleId === sub.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 pl-2' : 'pl-3'}`}
                >
                  <div className="flex gap-3 items-start">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToTime(sub.startTime);
                      }}
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-all group-hover:shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                      title="点击跳转播放"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span className="font-mono font-bold text-base">
                        {new Date(sub.startTime * 1000).toISOString().substr(14, 5)}
                      </span>
                    </button>
                    <p 
                      className="text-base text-slate-700 dark:text-slate-200 leading-relaxed flex-1 pt-1.5 select-text"
                    >
                      {sub.text}
                    </p>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(sub); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 bg-white dark:bg-slate-700 shadow-sm rounded-full text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-slate-600 transition-all z-10"
                    title="句法分析"
                  >
                     <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Analysis & Dictionary (Flex 1) */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Tab Header */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={() => setRightPanelTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              rightPanelTab === 'analysis' 
                ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            句法解析
          </button>
          <button
            onClick={() => setRightPanelTab('dictionary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              rightPanelTab === 'dictionary' 
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Book className="w-4 h-4" />
            词典
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          {/* Analysis Tab */}
          {rightPanelTab === 'analysis' && (
            <div className="p-4 h-full">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                   <p className="text-sm text-slate-500">正在分析句子结构...</p>
                </div>
              ) : analysisError ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex gap-2">
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                   <p>{analysisError}</p>
                </div>
              ) : analysisResult ? (
                <ResultDisplay result={analysisResult} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 p-8 text-center">
                  <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                  <p>点击字幕右侧的 <Sparkles className="w-3 h-3 inline mx-1" /> 按钮开始分析</p>
                </div>
              )}
            </div>
          )}

          {/* Dictionary Tab */}
          {rightPanelTab === 'dictionary' && (
            <div className="p-4 h-full flex flex-col">
              {/* Search Input */}
              <form onSubmit={handleDictSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    placeholder="输入单词或词组查询..."
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all outline-none text-sm"
                    disabled={isDictLoading}
                  />
                  <button
                    type="submit"
                    disabled={isDictLoading || !dictQuery.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    {isDictLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
              </form>

              {/* Dictionary Error */}
              {dictError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{dictError}</p>
                </div>
              )}

              {/* Dictionary Result */}
              {dictResult ? (
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* Word Header */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-serif">{dictResult.word}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{dictResult.phonetic}</p>
                      </div>
                      <button
                        onClick={() => speakText(dictResult.word)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isSpeaking 
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {isSpeaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Entries */}
                  {dictResult.entries.map((entry, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold px-2 py-1 rounded uppercase">
                          {entry.partOfSpeech}
                        </span>
                        {entry.cocaFrequency && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            {entry.cocaFrequency}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {entry.definitions.slice(0, 3).map((def, dIdx) => (
                          <div key={dIdx} className="border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{def.meaning}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{def.explanation}</p>
                            {def.example && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                "{def.example}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Collocations */}
                  {dictResult.collocations && dictResult.collocations.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">常用搭配</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictResult.collocations.slice(0, 5).map((col, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded-lg font-medium cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                            onClick={() => {
                              setDictQuery(col.phrase);
                            }}
                            title={col.meaning}
                          >
                            {col.phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : !isDictLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                  <Book className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">输入单词开始查询</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
