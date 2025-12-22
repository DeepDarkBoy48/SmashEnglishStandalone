import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm transition-colors">
      <p>© {new Date().getFullYear()} 英语粉碎机. Designed by 徐晨阳.</p>
    </footer>
  );
};