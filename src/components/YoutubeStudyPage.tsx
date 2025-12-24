import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Youtube, Upload, Play, Sparkles, FileUp, RefreshCw } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { parseSRT, optimizeSubtitles } from '../utils/srtParser';
import type { SubtitleItem } from '../utils/srtParser';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YoutubeStudyPageProps {
  onTriggerAnalysis?: (text: string) => void;
  onTriggerDictionary?: (word: string, context: string) => void;
}

export const YoutubeStudyPage: React.FC<YoutubeStudyPageProps> = ({ 
  onTriggerAnalysis,
  onTriggerDictionary 
}) => {
  // --- State ---
  // Column 1: Video
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
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
    if (onTriggerAnalysis) {
      const cleanText = sub.text.replace(/\n/g, ' ');
      onTriggerAnalysis(cleanText);
    }
  };

  const handleWordClick = (word: string, context: string, e: React.MouseEvent) => {
    if (!isWordSearchEnabled) return;
    e.stopPropagation();
    
    // Copy word to clipboard
    navigator.clipboard.writeText(word).catch(err => {
      console.error('Failed to copy word:', err);
    });
    
    if (onTriggerDictionary) {
      onTriggerDictionary(word, context);
    }
  };

  const renderSubtitleText = (text: string, context: string) => {
    if (!isWordSearchEnabled) return text;

    // Split by words but keep punctuation as separate or attached
    // This is a simple split, could be improved with regex
    const words = text.split(/(\s+)/);
    return words.map((part, idx) => {
      if (/\s+/.test(part)) return part;
      // Extract the word part and punctuation part
      const match = part.match(/^([a-zA-Z0-9'-]+)(.*)$/);
      if (match) {
        const [_, word, punct] = match;
        return (
          <React.Fragment key={idx}>
            <span 
              className="hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded px-0.5 cursor-pointer transition-colors text-gray-900 dark:text-gray-100 font-medium underline decoration-dotted decoration-gray-400 dark:decoration-gray-600 underline-offset-4 active:bg-yellow-300 dark:active:bg-yellow-800"
              onClick={(e) => handleWordClick(word, context, e)}
            >
              {word}
            </span>
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
               <div className="flex items-center gap-2 mr-2">
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={isWordSearchEnabled}
                     onChange={() => setIsWordSearchEnabled(!isWordSearchEnabled)}
                   />
                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:trangray-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                   <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 select-none">查词模式</span>
                 </label>
               </div>
               <div className="flex items-center gap-2 mr-2">
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={isBigTextMode}
                     onChange={() => setIsBigTextMode(!isBigTextMode)}
                   />
                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                   <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 select-none">大字模式</span>
                 </label>
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
                           </div>
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
                      className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-all group-hover:shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                      title="点击跳转播放"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span className="font-mono font-bold text-base">
                        {new Date(sub.startTime * 1000).toISOString().substr(14, 5)}
                      </span>
                    </button>
                    <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed flex-1 pt-1.5 select-text">
                      {renderSubtitleText(sub.text, sub.text)}
                    </p>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(sub); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 bg-white dark:bg-gray-700 shadow-sm rounded-full text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-gray-600 transition-all z-10"
                    title="句法分析"
                  >
                     <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};
