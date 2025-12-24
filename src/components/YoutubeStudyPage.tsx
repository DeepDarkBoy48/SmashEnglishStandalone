import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Youtube, Upload, Play, Sparkles, FileUp, RefreshCw, Languages, Settings2, Loader2 } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { parseSRT, optimizeSubtitles } from '../utils/srtParser';
import type { SubtitleItem } from '../utils/srtParser';
import { translateService, rapidLookupService } from '../services/geminiService';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YoutubeStudyPageProps {
  onTriggerAnalysis?: (text: string, wasPaused?: boolean) => void;
  onTriggerDictionary?: (word: string, context: string, wasPaused?: boolean) => void;
  isAiAssistantOpen?: boolean;
  playerRefExternal?: React.MutableRefObject<any>;
}

export const YoutubeStudyPage: React.FC<YoutubeStudyPageProps> = ({ 
  onTriggerAnalysis,
  onTriggerDictionary,
  isAiAssistantOpen,
  playerRefExternal
}) => {
  // --- State ---
  // Column 1: Video
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRefInternal = useRef<any>(null);
  const playerRef = playerRefExternal || playerRefInternal;
  const subtitleContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isYTApiReady, setIsYTApiReady] = useState(false);

  // Column 2: Subtitles
  const [srtContent, setSrtContent] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWordSearchEnabled, setIsWordSearchEnabled] = useState(false);
  const [isBigTextMode, setIsBigTextMode] = useState(false);
  const [isPauseOnClickEnabled, setIsPauseOnClickEnabled] = useState(false);
  const [isFastLookupEnabled, setIsFastLookupEnabled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const [fastLookupResults, setFastLookupResults] = useState<Record<string, any>>({});
  const [fastLookupLoading, setFastLookupLoading] = useState<Record<string, boolean>>({});

  const toolsRef = useRef<HTMLDivElement>(null);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Effects ---

  // Load state from localStorage on mount
  useEffect(() => {
    const savedVideoUrl = localStorage.getItem('smash_english_video_url');
    const savedVideoId = localStorage.getItem('smash_english_video_id');
    const savedSrtContent = localStorage.getItem('smash_english_srt_content');

    if (savedVideoUrl) setVideoUrl(savedVideoUrl);
    if (savedVideoId) setVideoId(savedVideoId);
    if (savedSrtContent) {
      setSrtContent(savedSrtContent);
      const parsed = parseSRT(savedSrtContent);
      setSubtitles(optimizeSubtitles(parsed));
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (videoUrl) localStorage.setItem('smash_english_video_url', videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    if (videoId) localStorage.setItem('smash_english_video_id', videoId);
  }, [videoId]);

  useEffect(() => {
    if (srtContent) localStorage.setItem('smash_english_srt_content', srtContent);
  }, [srtContent]);


  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsYTApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsYTApiReady(true);
    };
  }, []);

  // Initialize Player when videoId changes and API is ready
  const initializePlayer = useCallback(() => {
    if (!videoId || !isYTApiReady) return;
    
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
    } else {
      const playerContainer = document.getElementById('youtube-player');
      if (!playerContainer) return;
      
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
  }, [videoId, isYTApiReady]);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  const handleResetVideo = () => {
    if (window.confirm('确定要更换视频吗？当前的视频和字幕状态将被清除。')) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
        playerRef.current = null;
      }
      setVideoId(null);
      setVideoUrl('');
      setIsPlayerReady(false);
      localStorage.removeItem('smash_english_video_url');
      localStorage.removeItem('smash_english_video_id');
      // optional: also clear SRT if needed
      // setSubtitles([]);
      // setSrtContent('');
      // localStorage.removeItem('smash_english_srt_content');
    }
  };

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
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlayerReady, subtitles, activeSubtitleId]);

  // Handle auto-resume when assistant closes in popup mode
  useEffect(() => {
    if (!isAiAssistantOpen && isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      // In a real app, we might want more complex logic here to only resume if WE paused it
      // but for simplicity:
      if (playerRef.current.getPlayerState?.() === window.YT.PlayerState.PAUSED) {
        playerRef.current.playVideo();
      }
    }
  }, [isAiAssistantOpen, isPauseOnClickEnabled, isPlayerReady]);

  // Scroll to active subtitle
  useEffect(() => {
    if (activeSubtitleId && virtuosoRef.current && subtitles.length > 0) {
      const index = subtitles.findIndex(s => s.id === activeSubtitleId);
      if (index !== -1) {
        virtuosoRef.current.scrollToIndex({
          index,
          align: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [activeSubtitleId, subtitles]);

  // Keyboard shortcuts for video control
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );
      
      if (isTyping) return;

      if (event.code === 'Space') {
        if (playerRef.current && isPlayerReady && typeof playerRef.current.getPlayerState === 'function') {
          event.preventDefault();
          const state = playerRef.current.getPlayerState();
          // YT.PlayerState.PLAYING is 1, YT.PlayerState.PAUSED is 2
          if (state === 1) { 
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.playVideo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerReady, playerRef]);


  // --- Handlers ---

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        setSubtitles(optimizeSubtitles(parsed));
      };
      reader.readAsText(file);
    }
  };

  const handleSrtPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setSrtContent(content);
    const parsed = parseSRT(content);
    setSubtitles(optimizeSubtitles(parsed));
  };

  const handleJumpToTime = (startTime: number) => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(startTime, true);
      playerRef.current.playVideo();
    }
  };

  const handleAnalyze = async (sub: SubtitleItem) => {
    let wasPaused = false;
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
      wasPaused = true;
    }
    if (onTriggerAnalysis) {
      const cleanText = sub.text.replace(/\n/g, ' ');
      onTriggerAnalysis(cleanText, wasPaused);
    }
  };

  const handleTranslate = async (sub: SubtitleItem) => {
    if (translatingIds.has(sub.id) || translations[sub.id]) return;
    
    // Pause video when translating only if enabled
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
    }
    
    setTranslatingIds(prev => new Set(prev).add(sub.id));
    try {
      const result = await translateService(sub.text);
      setTranslations(prev => ({
        ...prev,
        [sub.id]: result.translation
      }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  };

  const handleWordClick = async (word: string, context: string, e: React.MouseEvent) => {
    if (!isWordSearchEnabled && !isFastLookupEnabled) return;
    e.stopPropagation();
    
    let wasPaused = false;
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
      wasPaused = true;
    }

    if (isFastLookupEnabled) {
      const cacheKey = `${word}-${context}`;
      if (fastLookupResults[cacheKey]) return;

      setFastLookupLoading(prev => ({ ...prev, [cacheKey]: true }));
      try {
        const result = await rapidLookupService(word, context);
        setFastLookupResults(prev => ({ ...prev, [cacheKey]: result }));
      } catch (error) {
        console.error('Fast lookup failed:', error);
      } finally {
        setFastLookupLoading(prev => ({ ...prev, [cacheKey]: false }));
      }
    } else {
      // Copy word to clipboard
      navigator.clipboard.writeText(word).catch(err => {
        console.error('Failed to copy word:', err);
      });
      
      if (onTriggerDictionary) {
        onTriggerDictionary(word, context, wasPaused);
      }
    }
  };

  const renderSubtitleText = (text: string, context: string) => {
    if (!isWordSearchEnabled && !isFastLookupEnabled) return text;

    // Split by words but keep punctuation as separate or attached
    const words = text.split(/(\s+)/);
    return words.map((part, idx) => {
      if (/\s+/.test(part)) return part;
      const match = part.match(/^([a-zA-Z0-9'-]+)(.*)$/);
      if (match) {
        const [_, word, punct] = match;
        const cacheKey = `${word}-${context}`;
        const result = fastLookupResults[cacheKey];
        const isLoading = fastLookupLoading[cacheKey];

        return (
          <React.Fragment key={idx}>
            <span 
              className={`hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded px-0.5 cursor-pointer transition-all text-gray-900 dark:text-gray-100 font-medium ${isFastLookupEnabled ? 'border-b border-dashed border-gray-400 dark:border-gray-600' : 'underline decoration-dotted decoration-gray-400 dark:decoration-gray-600 underline-offset-4'} active:bg-yellow-300 dark:active:bg-yellow-800`}
              onClick={(e) => handleWordClick(word, context, e)}
            >
              {word}
            </span>
            {result && (
              <span className="mx-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm rounded-md font-bold animate-fade-in inline-flex items-center gap-1.5 shadow-sm border border-indigo-100 dark:border-indigo-800/50 align-baseline translate-y-[-1px]">
                <span className="opacity-70 text-xs font-mono">{result.p}</span>
                <span>{result.m}</span>
              </span>
            )}
            {isLoading && (
              <Loader2 className="inline w-3 h-3 animate-spin text-gray-400 ml-1" />
            )}
            {punct}
          </React.Fragment>
        );
      }
      return part;
    });
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
          setSubtitles(optimizeSubtitles(parsed));
        };
        reader.readAsText(file);
      } else {
        alert('请上传 .srt 格式的字幕文件');
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Column 1: Video Player */}
      <div className="flex-[2] bg-white dark:bg-[#0d1117] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800/60 flex flex-col overflow-hidden transition-all duration-300">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Youtube className="w-5 h-5 text-red-600" />
             <h2 className="font-semibold text-gray-800 dark:text-white">视频播放</h2>
           </div>
           {videoId && (
             <button 
               onClick={handleResetVideo}
               className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
             >
               <RefreshCw className="w-3.5 h-3.5" />
               更换视频
             </button>
           )}
        </div>
        
        <div className="flex-1 bg-black relative">
          {!videoId ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-100 dark:bg-[#0d1117]">
                <div className="w-full max-w-md">
                   <form onSubmit={handleVideoUrlSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入 YouTube 视频地址..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                        加载
                      </button>
                   </form>
                   <p className="mt-4 text-sm text-gray-500">示例: https://www.youtube.com/watch?v=...</p>
                </div>
             </div>
          ) : (
            <div id="youtube-player" className="w-full h-full"></div>
          )}
        </div>
      </div>

      {/* Column 2: Subtitles */}
      <div 
        className={`flex-1 bg-white dark:bg-[#0d1117] rounded-2xl shadow-sm border-2 flex flex-col overflow-hidden transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-800/60'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Upload className="w-5 h-5 text-blue-500" />
             <h2 className="font-semibold text-gray-800 dark:text-white">字幕内容</h2>
           </div>
            <div className="flex items-center gap-3">
                <div className="relative" ref={toolsRef}>
                  <button 
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isToolsOpen ? 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'} hover:border-gray-400 dark:hover:border-gray-500`}
                  >
                    <Settings2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tools</span>
                  </button>

                  {isToolsOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 p-2 py-3 flex flex-col gap-1">
                      {/* Search Mode */}
                      <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsWordSearchEnabled(!isWordSearchEnabled)}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">查词模式</span>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${isWordSearchEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isWordSearchEnabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>

                      {/* Fast Lookup Mode */}
                      <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsFastLookupEnabled(!isFastLookupEnabled)}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">极速查词</span>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${isFastLookupEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isFastLookupEnabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

                      {/* Click Pause */}
                      <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsPauseOnClickEnabled(!isPauseOnClickEnabled)}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">点击暂停</span>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${isPauseOnClickEnabled ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isPauseOnClickEnabled ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>

                      {/* Big Text Mode */}
                      <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsBigTextMode(!isBigTextMode)}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">大字模式</span>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${isBigTextMode ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isBigTextMode ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
               {!subtitles.length && (
                <label className="cursor-pointer px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors">
                  导入 .srt
                  <input type="file" accept=".srt" className="hidden" onChange={handleSrtUpload} />
                </label>
               )}
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative" ref={subtitleContainerRef}>
          {isDragging && (
            <div className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/80 flex flex-col items-center justify-center z-20 pointer-events-none">
              <FileUp className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
              <p className="text-blue-600 dark:text-blue-300 font-medium text-lg">释放鼠标上传 .srt 文件</p>
            </div>
          )}
          
          {!subtitles.length ? (
            <div className="h-full flex flex-col p-4 items-center justify-center overflow-y-auto">
              <div className="w-full max-sm text-center">
                <div className="mb-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                  <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">拖拽 .srt 文件到此处</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">或点击右上角按钮选择文件</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-[#0d1117] text-xs text-gray-400">或者</span>
                  </div>
                </div>
                <textarea
                  className="mt-4 w-full h-32 p-4 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="在此粘贴 SRT 字幕内容..."
                  value={srtContent}
                  onChange={handleSrtPaste}
                />
              </div>
            </div>
          ) : isBigTextMode ? (
             <div className="h-full flex flex-col items-center p-8 text-center bg-gray-50/30 dark:bg-black/20 overflow-y-auto">
                <div className="flex-1" />
                {activeSubtitleId ? (
                   (() => {
                      const activeSub = subtitles.find(s => s.id === activeSubtitleId);
                      if (!activeSub) return <div className="text-gray-400">Waiting for subtitle...</div>;
                      return (
                        <div className="flex flex-col gap-6 animate-fade-in w-full max-w-4xl py-8">
                           <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 leading-tight tracking-wide">
                              {renderSubtitleText(activeSub.text, activeSub.text)}
                           </p>
                           {isWordSearchEnabled && (
                             <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium flex items-center justify-center gap-2">
                               <Sparkles className="w-4 h-4" />
                               <span>点击单词查询释义</span>
                             </div>
                           )}
                           <div className="flex justify-center mt-4">
                             <button 
                               onClick={() => handleAnalyze(activeSub)}
                               className="px-6 py-2.5 bg-pink-100 hover:bg-pink-200 text-pink-700 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 dark:text-pink-300 rounded-full font-medium transition-colors flex items-center gap-2"
                             >
                                <Sparkles className="w-4 h-4" />
                                <span>句法分析</span>
                             </button>
                             <button 
                               onClick={() => handleTranslate(activeSub)}
                               className={`px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 
                                 ${translations[activeSub.id] 
                                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
                                   : 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300'} 
                                 ${translatingIds.has(activeSub.id) ? 'animate-pulse opacity-70' : ''}`}
                               disabled={translatingIds.has(activeSub.id) || !!translations[activeSub.id]}
                             >
                                <Languages className="w-4 h-4" />
                                <span>{translatingIds.has(activeSub.id) ? '翻译中...' : translations[activeSub.id] ? '已翻译' : '极速翻译'}</span>
                             </button>
                           </div>
                           {translations[activeSub.id] && (
                             <div className="mt-8 p-6 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 animate-fade-in">
                               <p className="text-2xl md:text-3xl text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                                 {translations[activeSub.id]}
                               </p>
                             </div>
                           )}
                        </div>
                      );
                   })()
                ) : (
                  <div className="text-xl text-gray-400 dark:text-gray-600 font-medium">
                    等待播放...
                  </div>
                )}
                <div className="flex-1" />
             </div>
          ) : (
            <Virtuoso
              style={{ height: '100%' }}
              data={subtitles}
              ref={virtuosoRef}
              itemContent={(_index, sub) => (
                <div 
                  id={`subtitle-${sub.id}`} 
                  className={`group relative p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-800/60 ${activeSubtitleId === sub.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 pl-2' : 'pl-3'}`}
                >
                  <div className="flex gap-3 items-start">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToTime(sub.startTime);
                      }}
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-all group-hover:shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 h-fit"
                      title="点击跳转播放"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span className="font-mono font-bold text-base">
                        {new Date(sub.startTime * 1000).toISOString().substr(14, 5)}
                      </span>
                    </button>
                    
                    <div className="flex-1 flex flex-col gap-2 min-w-0 pr-10">
                      <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed pt-1.5 select-text">
                        {renderSubtitleText(sub.text, sub.text)}
                      </p>
                      
                      {translations[sub.id] && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 animate-fade-in">
                          <p className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                            {translations[sub.id]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-10 py-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAnalyze(sub); }}
                      className="p-2 bg-white dark:bg-gray-700 shadow-lg rounded-full text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-gray-600 transition-all border border-gray-100 dark:border-gray-600"
                      title="句法分析"
                    >
                       <Sparkles className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleTranslate(sub); }}
                      className={`p-2 shadow-lg rounded-full transition-all border 
                        ${translations[sub.id]
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700'
                          : 'bg-white text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-gray-100 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600 dark:border-gray-600'}
                        ${translatingIds.has(sub.id) ? 'animate-spin' : ''}`}
                      title={translations[sub.id] ? "已翻译" : "极速翻译"}
                      disabled={translatingIds.has(sub.id) || !!translations[sub.id]}
                    >
                       <Languages className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};
