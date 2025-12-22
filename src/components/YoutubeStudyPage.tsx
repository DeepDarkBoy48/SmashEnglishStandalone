import React, { useState, useRef, useEffect } from 'react';
import { Youtube, Upload, Play, Sparkles, FileUp } from 'lucide-react';
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
  onTriggerDictionary?: (word: string) => void;
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

  // Column 2: Subtitles
  const [srtContent, setSrtContent] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWordSearchEnabled, setIsWordSearchEnabled] = useState(false);

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

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    if (!isWordSearchEnabled) return;
    e.stopPropagation();
    if (onTriggerDictionary) {
      onTriggerDictionary(word);
    }
  };

  const renderSubtitleText = (text: string) => {
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
              className="hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded px-0.5 cursor-pointer transition-colors text-blue-600 dark:text-blue-400 font-medium underline decoration-dotted decoration-blue-300 dark:decoration-blue-700 underline-offset-4"
              onClick={(e) => handleWordClick(word, e)}
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
      <div className="flex-[2] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300">
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

      {/* Column 2: Subtitles */}
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
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 mr-2">
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={isWordSearchEnabled}
                     onChange={() => setIsWordSearchEnabled(!isWordSearchEnabled)}
                   />
                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                   <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400 select-none">查词模式</span>
                 </label>
               </div>
               {!subtitles.length && (
                <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors">
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
                <div className="mb-6 p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                  <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">拖拽 .srt 文件到此处</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">或点击右上角按钮选择文件</p>
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
            <Virtuoso
              style={{ height: '100%' }}
              data={subtitles}
              ref={virtuosoRef}
              itemContent={(_index, sub) => (
                <div 
                  id={`subtitle-${sub.id}`} 
                  className={`group relative p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 ${activeSubtitleId === sub.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 pl-2' : 'pl-3'}`}
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
                    <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed flex-1 pt-1.5 select-text">
                      {renderSubtitleText(sub.text)}
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
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};
