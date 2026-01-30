
import React, { useState, useEffect } from 'react';
import { Settings, X, Key, ShieldCheck, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('smash_gemini_api_key') || '';
      setApiKey(savedKey);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('smash_gemini_api_key', apiKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    localStorage.removeItem('smash_gemini_api_key');
    setApiKey('');
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1b1e] w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-white/70">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">API 设置</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white/70 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Gemini API Key
            </label>
            <div className="relative group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="在此输入您的 Gemini API Key..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white/20 outline-none transition-all text-sm font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              您的 Key 将仅加密保存在浏览器本地 localStorage 中。
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
              如果您不填写此项，系统将尝试使用公共演示 Key（可能因限额而失败）。建议使用您自己的专属 Key 以获得稳定体验。
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          >
            清除
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`flex-[2] px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              isSaved 
                ? 'bg-green-500 text-white' 
                : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98]'
            }`}
          >
            {isSaved ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                已保存
              </>
            ) : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
};
