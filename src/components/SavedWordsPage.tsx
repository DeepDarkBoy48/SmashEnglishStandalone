import React, { useEffect, useState } from 'react';
import { 
  getDailyNotesService, 
  getNoteDetailService, 
  summarizeDailyNoteService,
  deleteSavedWordService 
} from '../services/geminiService';
import type { DailyNote, SavedWord, QuickLookupResult, OtherMeaning } from '../types';
import { 
  BookMarked, Clock, ChevronRight, MessageSquare, 
  Trash2, Loader2, Sparkles, Calendar, ArrowLeft, 
  BookOpen, BrainCircuit, ExternalLink, Download, FileJson, FileCode
} from 'lucide-react';
import { getSavedWordsService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ReviewPage } from './ReviewPage';

export const SavedWordsPage: React.FC = () => {
  const [notes, setNotes] = useState<DailyNote[] | null>(null);
  const [selectedNote, setSelectedNote] = useState<{ note: DailyNote, words: SavedWord[] | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyNotesService();
      setNotes(data.notes);
    } catch (err: any) {
      console.error(err);
      alert('无法加载卡片列表，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNote = async (note: DailyNote) => {
    setSelectedNote({ note, words: null });
    setIsDetailLoading(true);
    try {
      const data = await getNoteDetailService(note.id);
      setSelectedNote(data);
    } catch (err) {
      console.error(err);
      alert('AI 总结失败，请稍后再试。');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedNote) return;
    setIsSummarizing(true);
    try {
      const data = await summarizeDailyNoteService(selectedNote.note.id);
      setSelectedNote({
        ...selectedNote,
        note: { 
          ...selectedNote.note, 
          title: data.title,
          summary: data.summary,
          content: data.content 
        }
      });
      fetchNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDeleteWord = async (wordId: number) => {
    if (!selectedNote) return;
    if (!confirm('确定要删除这个单词吗？')) return;
    try {
      await deleteSavedWordService(wordId);
      setSelectedNote({
        ...selectedNote,
        words: selectedNote.words ? selectedNote.words.filter(w => w.id !== wordId) : null,
        note: { ...selectedNote.note, word_count: Math.max(0, selectedNote.note.word_count - 1) }
      });
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleExportNote = (format: 'md' | 'json') => {
    if (!selectedNote || !selectedNote.words) return;
    const { note, words } = selectedNote;
    let content = '';
    let filename = `vocab_${note.day.replace(/-/g, '_')}`;

    if (format === 'md') {
      content = `# 今日词汇 (${words.length}) - ${note.day}\n\n`;
      words.forEach(item => {
        const meaning = item.data?.contextMeaning || item.data?.m || '';
        const pos = item.data?.partOfSpeech || item.data?.p || '';
        const explanation = item.data?.explanation || '';
        const url = item.url || item.data?.url || '';
        const highlightedContext = item.context.replace(new RegExp(`(${item.word})`, 'gi'), '**$1**');
        content += `### ${item.word} [${pos.toUpperCase()}]\n\n`;
        content += `**释义**: ${meaning}\n\n`;
        content += `> "${highlightedContext}"\n\n`;
        content += `**AI 解析**:\n${explanation}\n\n`;
        if (url) content += `**来源**: [${url}](${url})\n\n`;
        content += `---\n`;
      });
      filename += '.md';
    } else {
      content = JSON.stringify(words, null, 2);
      filename += '.json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = async (format: 'md' | 'json') => {
    setIsExporting(true);
    try {
      const data = await getSavedWordsService();
      if (!data.words || data.words.length === 0) {
        alert('没有可以导出的单词');
        return;
      }
      let content = '';
      let filename = `smash_english_export_${new Date().toISOString().split('T')[0]}`;

      if (format === 'md') {
        content = data.words.map(item => {
          const meaning = item.data?.contextMeaning || item.data?.m || '';
          const pos = item.data?.partOfSpeech || item.data?.p || '';
          const explanation = item.data?.explanation || '';
          const url = item.url || item.data?.url || '';
          const highlightedContext = item.context.replace(new RegExp(`(${item.word})`, 'gi'), '**$1**');
          return `# ${item.word} [${pos.toUpperCase()}]\n\n` +
                 `**${meaning}**\n\n` +
                 `> "${highlightedContext}"\n\n` +
                 `**AI 解析**:\n${explanation}\n\n` +
                 (url ? `**来源**: [${url}](${url})\n\n` : '') +
                 `---\n`;
        }).join('\n');
        filename += '.md';
      } else {
        content = JSON.stringify(data.words, null, 2);
        filename += '.json';
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !notes && !selectedNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">正在同步数据...</p>
      </div>
    );
  }

  if (showReview) {
    return <ReviewPage onBack={() => setShowReview(false)} />;
  }

  if (selectedNote) {
    const { note, words } = selectedNote;
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button 
            onClick={() => setSelectedNote(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">返回卡片列表</span>
          </button>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 p-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button onClick={() => handleExportNote('md')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 transition-all active:scale-95">
                <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="hidden xs:inline">导出 Markdown</span>
                <span className="xs:hidden">MD</span>
              </button>
              <div className="w-px h-4 bg-gray-100 dark:bg-gray-800" />
              <button onClick={() => handleExportNote('json')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 transition-all active:scale-95">
                <FileCode className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="hidden xs:inline">导出 JSON</span>
                <span className="xs:hidden">JSON</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 font-medium ml-auto sm:ml-0">
               <Calendar className="w-4 h-4" />
               <span>{note.day}</span>
            </div>
          </div>
        </div>

        <header className="space-y-4">
           <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white leading-tight">
             {note.title || `${note.day} 的学习札记`}
           </h1>
           <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-xs font-bold border border-pink-100 dark:border-pink-800">
               {note.word_count} 个关键词
             </div>
             {isDetailLoading && (
                <div className="flex items-center gap-2 text-xs text-pink-500 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>正在更新完整列表...</span>
                </div>
              )}
             {!note.content && (
               <button onClick={handleSummarize} disabled={isSummarizing} className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform disabled:opacity-50">
                 {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                 AI 生成今日博客
               </button>
             )}
           </div>
        </header>

        {note.content ? (
          <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl shadow-black/5">
            {note.summary && (
              <div className="mb-8 p-6 bg-pink-50/50 dark:bg-pink-900/10 border-l-4 border-pink-400 rounded-r-2xl">
                <p className="text-lg font-medium text-pink-950 dark:text-pink-100 italic leading-relaxed">
                  {note.summary}
                </p>
              </div>
            )}
            <div className="markdown-body text-gray-700 dark:text-gray-300">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button onClick={handleSummarize} disabled={isSummarizing} className="text-xs text-gray-400 hover:text-pink-500 flex items-center gap-1 transition-colors">
                  {isSummarizing ? "正在更新..." : "感觉写得不好？让 AI 重新生成一张博客卡片"}
                </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
             <BrainCircuit className="w-12 h-12 mx-auto text-gray-300 mb-4" />
             <h3 className="text-gray-400 font-medium">还没有生成博客心得</h3>
             <p className="text-sm text-gray-400 mt-2 mb-6 text-balance">
               AI 可以根据您今天收录的 {note.word_count} 个单词，自动为您撰写一篇串联记忆的短文。
             </p>
             <button onClick={handleSummarize} disabled={isSummarizing} className="px-6 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all flex items-center gap-2 mx-auto">
               {isSummarizing ? "AI 创作中..." : "立刻开启 AI 创作"}
             </button>
          </div>
        )}

        <section className="space-y-6">
           <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-pink-500" />
              <h2 className="text-2xl font-bold font-serif">当日词汇表</h2>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!words ? (
                Array.from({ length: note.word_count || 3 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-48 animate-pulse">
                    <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
                    <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50 rounded mb-2" />
                  </div>
                ))
              ) : words.map((item) => {
                const data = item.data as QuickLookupResult;
                return (
                  <div key={item.id} className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 hover:shadow-2xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-500 flex flex-col h-full">
                    <button onClick={() => handleDeleteWord(item.id)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">{item.word}</h3>
                      <div className="flex flex-wrap gap-2">
                        {data?.partOfSpeech && (
                          <span className="text-[10px] font-black text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-1 rounded-md uppercase tracking-wider ring-1 ring-pink-100 dark:ring-pink-900/30">
                            {data.partOfSpeech}
                          </span>
                        )}
                        {data?.grammarRole && (
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md tracking-wider ring-1 ring-indigo-100 dark:ring-indigo-900/30">
                            {data.grammarRole}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
                        {data?.contextMeaning || (data as any)?.m}
                      </p>
                    </div>

                    <div className="relative bg-gray-50 dark:bg-white/5 rounded-2xl p-5 mb-6 border border-gray-100 dark:border-white/5">
                      <MessageSquare className="absolute -top-3 -left-3 w-8 h-8 text-pink-200/50 dark:text-pink-900/20 fill-current" />
                      <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed font-medium relative z-10">
                        "{item.context.split(new RegExp(`(${item.word})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === item.word.toLowerCase() 
                            ? <span key={i} className="text-pink-600 dark:text-pink-400 font-bold decoration-pink-300 dark:decoration-pink-700 underline underline-offset-4 decoration-2">{part}</span>
                            : part
                        )}"
                      </p>
                    </div>

                    <div className="space-y-4 flex-1">
                      {data?.explanation && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <Sparkles className="w-3 h-3 text-pink-400" />
                            AI 深度解析
                          </div>
                          <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed bg-pink-50/30 dark:bg-pink-900/5 rounded-2xl p-4 border border-pink-100/50 dark:border-pink-900/20">
                            <ReactMarkdown>{data.explanation}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {data?.otherMeanings && data.otherMeanings.length > 0 && (
                        <div className="space-y-3 pt-4">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            其他常用释义
                          </div>
                          <div className="grid gap-3">
                            {data.otherMeanings.map((m: OtherMeaning, idx: number) => (
                              <div key={idx} className="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl p-4 group/item hover:bg-white dark:hover:bg-gray-800 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                                    {m.partOfSpeech}
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">{m.meaning}</span>
                                </div>
                                {m.example && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic font-serif leading-relaxed">
                                    "{m.example}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const readingId = item.reading_id || data?.reading_id;
                      const videoId = item.video_id || data?.video_id;
                      const sourceUrl = item.url || data?.url;

                      if (readingId) {
                        return (
                          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <BookOpen className="w-3.5 h-3.5" />
                              精读记事本
                            </div>
                            <a 
                              href={`/intensive-reading?id=${readingId}&word=${encodeURIComponent(item.word)}`} 
                              className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <span>回到文章精读</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      }

                      if (videoId) {
                        return (
                          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <BrainCircuit className="w-3.5 h-3.5" />
                              视频学习
                            </div>
                            <a 
                              href={`/video-study?id=${videoId}`} 
                              className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <span>回到视频学习</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      }

                      if (!sourceUrl) return null;
                      return (
                        <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <ExternalLink className="w-3.5 h-3.5" />
                            外部来源
                          </div>
                          <a 
                            href={sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <span className="max-w-[150px] truncate">
                              {sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
           </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-pink-500/20 transform rotate-3 flex-shrink-0">
            <BookMarked className="w-6 h-6 sm:w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-gray-900 dark:text-white">
              时光词库
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              记录您的每一次语言探索
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 ml-0 sm:ml-auto">
           <button onClick={() => handleExportAll('md')} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold hover:border-pink-500 hover:text-pink-500 transition-all shadow-sm disabled:opacity-50">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             <span className="sm:inline hidden">导出 Markdown</span>
             <span className="sm:hidden">Markdown</span>
           </button>
           <button onClick={() => handleExportAll('json')} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold hover:border-pink-500 hover:text-pink-500 transition-all shadow-sm disabled:opacity-50">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
             <span className="sm:inline hidden">导出 JSON</span>
             <span className="sm:hidden">JSON</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {!notes || notes.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center opacity-40">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg">还没有任何收录，去学习点什么吧！</p>
          </div>
        ) : (
          <>
            <div className="col-span-full mb-4">
              <div onClick={() => setShowReview(true)} className="group cursor-pointer relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-3xl p-8 shadow-2xl shadow-pink-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                  <BrainCircuit className="w-40 h-40" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white ring-1 ring-white/30">
                      <Sparkles className="w-3 h-3" />
                      每日复习挑战
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-white">沉浸式 AI 情境复习</h2>
                    <p className="text-white/80 max-w-lg">今天有 30 个单词待复习。AI 已为你根据记忆曲线准备了一篇专属播客文章，立刻开启挑战。</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-white text-pink-600 rounded-2xl font-bold shadow-xl group-hover:shadow-white/20 transition-all">
                    开始挑战
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
            {notes.map((note) => (
              <div key={note.id} onClick={() => handleSelectNote(note)} className="group cursor-pointer relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 hover:shadow-2xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-500 flex flex-col gap-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-full text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    {note.day}
                  </div>
                  {note.content && (
                     <div className="w-8 h-8 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-full flex items-center justify-center">
                       <Sparkles className="w-4 h-4" />
                     </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-serif text-gray-900 dark:text-white group-hover:text-pink-500 transition-colors line-clamp-2 leading-tight mb-2">
                    {note.title || `${note.day} 的学习记录`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                    {note.content ? note.content.replace(/[#*`]/g, '').slice(0, 100) + '...' : "点击进入查看当日学习详情和单词列表"}
                  </p>
                </div>
                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    收录 <span className="text-pink-500 text-lg ml-1">{note.word_count}</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all transform group-hover:rotate-[360deg] duration-700">
                     <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
