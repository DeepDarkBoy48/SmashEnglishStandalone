import React, { useEffect, useState } from 'react';
import { 
  getDailyNotesService, 
  getNoteDetailService, 
  summarizeDailyNoteService,
  deleteSavedWordService 
} from '../services/geminiService';
import type { DailyNote, SavedWord } from '../types';
import { 
  BookMarked, Clock, ChevronRight, MessageSquare, 
  Trash2, Loader2, Sparkles, Calendar, ArrowLeft, 
  BookOpen, BrainCircuit, ExternalLink, Download, FileJson, FileCode
} from 'lucide-react';
import { getSavedWordsService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const SavedWordsPage: React.FC = () => {
  const [notes, setNotes] = useState<DailyNote[] | null>(null);
  const [selectedNote, setSelectedNote] = useState<{ note: DailyNote, words: SavedWord[] | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDailyNotesService();
      setNotes(data.notes);
    } catch (err: any) {
      console.error(err);
      setError('无法加载卡片列表，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNote = async (note: DailyNote) => {
    // 立即进入详情页显示基础信息
    setSelectedNote({ note, words: null });
    setIsDetailLoading(true);
    
    try {
      const data = await getNoteDetailService(note.id);
      setSelectedNote(data);
    } catch (err) {
      console.error(err);
      setError('无法加载详情，请重试。');
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
      // Refresh notes list in background
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
      // Remove from UI
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
        
        const highlightedContext = item.context.replace(
          new RegExp(`(${item.word})`, 'gi'), 
          '**$1**'
        );

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
          
          const highlightedContext = item.context.replace(
            new RegExp(`(${item.word})`, 'gi'), 
            '**$1**'
          );

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

  // --- RENDERING DETAIL VIEW ---
  if (selectedNote) {
    const { note, words } = selectedNote;
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedNote(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">返回卡片列表</span>
          </button>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button 
                onClick={() => handleExportNote('md')}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                导出 Markdown
              </button>
              <div className="w-px h-4 bg-gray-100 dark:bg-gray-800" />
              <button 
                onClick={() => handleExportNote('json')}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 transition-all active:scale-95"
              >
                <FileCode className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                导出 JSON
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
               <Calendar className="w-4 h-4" />
               <span>{note.day}</span>
            </div>
          </div>
        </div>

        <header className="space-y-4">
           <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white leading-tight">
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
               <button 
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform disabled:opacity-50"
               >
                 {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                 AI 生成今日博客
               </button>
             )}
           </div>
        </header>

        {/* Blog Content Section */}
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
              <ReactMarkdown>
                {note.content}
              </ReactMarkdown>
            </div>
            {/* Re-generate button for content */}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="text-xs text-gray-400 hover:text-pink-500 flex items-center gap-1 transition-colors"
                >
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
             <button 
               onClick={handleSummarize}
               disabled={isSummarizing}
               className="px-6 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all flex items-center gap-2 mx-auto"
             >
               {isSummarizing ? "AI 创作中..." : "立刻开启 AI 创作"}
             </button>
          </div>
        )}

        {/* Word Grid Section */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-pink-500" />
              <h2 className="text-2xl font-bold font-serif">当日词汇表</h2>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!words ? (
                // Loading Skeletons
                Array.from({ length: note.word_count || 3 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-48 animate-pulse">
                    <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
                    <div className="h-4 w-full bg-gray-50 dark:bg-gray-800/50 rounded mb-2" />
                    <div className="h-4 w-2/3 bg-gray-50 dark:bg-gray-800/50 rounded" />
                  </div>
                ))
              ) : words.map((item) => (
                <div 
                  key={item.id}
                  className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-300"
                >
                  <button 
                    onClick={() => handleDeleteWord(item.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold">{item.word}</h3>
                    <span className="text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-1.5 py-0.5 rounded uppercase">{item.data?.partOfSpeech}</span>
                  </div>
                  
                  <p className="text-pink-600 dark:text-pink-400 font-medium text-sm mb-4">
                    {item.data?.contextMeaning || item.data?.m}
                  </p>

                  <div className="flex items-start gap-3 text-base text-gray-700 dark:text-gray-300 italic mb-6 mt-4">
                    <MessageSquare className="w-4 h-4 mt-1.5 shrink-0 text-gray-400" />
                    <p className="leading-relaxed font-medium">
                      "{item.context.split(new RegExp(`(${item.word})`, 'gi')).map((part, i) => 
                        part.toLowerCase() === item.word.toLowerCase() 
                          ? <span key={i} className="bg-yellow-100 dark:bg-yellow-900/40 text-gray-950 dark:text-white font-bold px-1 rounded not-italic underline decoration-yellow-400 decoration-2 underline-offset-2">{part}</span>
                          : part
                      )}"
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.data?.explanation}
                    </p>
                  </div>

                  {(item.url || item.data?.url) && (
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <ExternalLink className="w-3 h-3" />
                        来源链接
                      </div>
                      <a 
                        href={item.url || item.data?.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 transition-colors py-1 px-2 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg max-w-[180px] truncate underline decoration-pink-300 dark:decoration-pink-700 underline-offset-2"
                      >
                        {(item.url || item.data?.url).replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </section>
      </div>
    );
  }

  // --- RENDERING LIST VIEW ---
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-pink-500/20 transform rotate-3">
          <BookMarked className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold tracking-tight">时光词库</h1>
          <p className="text-gray-500 dark:text-gray-400">记录您的每一次语言探索</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => handleExportAll('md')}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出 Markdown
            </button>
            <button 
              onClick={() => handleExportAll('json')}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
              导出 JSON
            </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {!notes || notes.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center opacity-40">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg">还没有任何收录，去学习点什么吧！</p>
          </div>
        ) : (
          notes.map((note) => (
            <div 
              key={note.id}
              onClick={() => handleSelectNote(note)}
              className="group cursor-pointer relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 hover:shadow-2xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-500 flex flex-col gap-6 overflow-hidden"
            >
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
          ))
        )}
      </div>
    </div>
  );
};
