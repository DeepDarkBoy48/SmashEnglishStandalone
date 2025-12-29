
import React from 'react';
import { Sparkles } from 'lucide-react';

export const CompactDictionaryResult: React.FC<{ result: any }> = ({ result }) => {
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
export const QuickLookupDisplay: React.FC<{ result: any; isPinned?: boolean; hideContext?: boolean }> = ({ result, isPinned = false, hideContext = false }) => {
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
      {result.originalSentence && !hideContext && (
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

      {/* 其他释义 */}
      {result.otherMeanings && result.otherMeanings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-1.5 mb-2.5 text-gray-500 dark:text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80 dark:text-blue-400/80">其他常见释义 & 例句</span>
          </div>
          <div className="space-y-3">
            {result.otherMeanings.map((m: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{m.meaning}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">({m.partOfSpeech})</span>
                </div>
                {m.example && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    "{m.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>

  );
};
