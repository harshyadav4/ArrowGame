import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertMessageProps {
  message: string | null;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-500/15 border border-red-500/30 rounded-xl py-2.5 px-4 text-xs sm:text-sm text-red-400 flex items-center gap-2 w-full max-w-[500px] shadow-md animate-slide-down">
      <AlertTriangle width={18} height={18} className="shrink-0 text-red-400" strokeWidth={2.5} />
      <span>{message}</span>
    </div>
  );
};
