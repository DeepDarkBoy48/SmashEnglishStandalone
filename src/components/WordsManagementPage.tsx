import React, { useEffect, useState } from 'react';
import { 
  getSavedWordsService, 
  deleteSavedWordService, 
  updateSavedWordService, 
  batchDeleteSavedWordsService 
} from '../services/geminiService';
import type { SavedWord } from '../types';
import { 
  Trash2, Edit2, Check, X, Search,
  ChevronLeft, ChevronRight,
  BookOpen
} from 'lucide-react';

export const WordsManagementPage: React.FC = () => {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{ word: string; meaning: string }>({ word: '', meaning: '' });

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const data = await getSavedWordsService();
      setWords(data.words);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个单词吗？')) return;
    try {
      await deleteSavedWordService(id);
      setWords(words.filter(w => w.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个单词吗？`)) return;
    try {
      await batchDeleteSavedWordsService(selectedIds);
      setWords(words.filter(w => !selectedIds.includes(w.id)));
      setSelectedIds([]);
    } catch (err) {
      alert('批量删除失败');
    }
  };

  const handleStartEdit = (word: SavedWord) => {
    setEditingId(word.id);
    setEditFormData({
      word: word.word,
      meaning: word.data?.contextMeaning || word.data?.m || ''
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const wordToUpdate = words.find(w => w.id === id);
      if (!wordToUpdate) return;

      const newData = { ...wordToUpdate.data, contextMeaning: editFormData.meaning };
      await updateSavedWordService(id, { word: editFormData.word, data: newData });
      
      setWords(words.map(w => w.id === id ? { ...w, word: editFormData.word, data: newData } : w));
      setEditingId(null);
    } catch (err) {
      alert('保存失败');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredWords.map(w => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.data?.contextMeaning || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-serif">词库汇总管理</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">全量单词的增删改查与批量复核</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                批量删除 ({selectedIds.length})
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索单词或释义..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      checked={selectedIds.length === filteredWords.length && filteredWords.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">单词</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">上下文释义</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">收录时间</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">复习进度</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredWords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>未找到匹配的单词</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((word) => (
                    <tr 
                      key={word.id} 
                      className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${selectedIds.includes(word.id) ? 'bg-pink-50/20 dark:bg-pink-900/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                          checked={selectedIds.includes(word.id)}
                          onChange={() => handleSelectOne(word.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {editingId === word.id ? (
                          <input 
                            type="text"
                            value={editFormData.word}
                            onChange={(e) => setEditFormData({ ...editFormData, word: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-pink-500 rounded text-sm font-bold"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white">{word.word}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-black">{word.data?.partOfSpeech}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                         {editingId === word.id ? (
                          <input 
                            type="text"
                            value={editFormData.meaning}
                            onChange={(e) => setEditFormData({ ...editFormData, meaning: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-pink-500 rounded text-sm"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">
                            {word.data?.contextMeaning || word.data?.m}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-xs font-medium">
                          {word.created_at?.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-pink-500 rounded-full" 
                                style={{ width: `${Math.min(100, (word.reps / 10) * 100)}%` }}
                              />
                           </div>
                           <span className="text-[10px] font-bold text-gray-400">{word.reps} 次复习</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === word.id ? (
                            <>
                              <button 
                                onClick={() => handleSaveEdit(word.id)}
                                className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleStartEdit(word)}
                                className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(word.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
             <span>共计 {filteredWords.length} 个单词</span>
             <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                   <span className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-bold text-gray-900 dark:text-white">1</span>
                </div>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" disabled>
                  <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
