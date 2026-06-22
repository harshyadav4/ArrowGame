import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface WinOverlayProps {
  isWin: boolean;
  moves: number;
  time: number;
  onNextLevel: () => void;
}

export const WinOverlay: React.FC<WinOverlayProps> = ({
  isWin,
  moves,
  time,
  onNextLevel,
}) => {
  if (!isWin) return null;

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div 
      className="absolute inset-4 bg-[#0a081c]/85 backdrop-blur-xl border border-white/8 rounded-3xl flex flex-col items-center justify-center gap-6 z-20 p-6 shadow-2xl animate-pop-in"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Icon wrapper */}
      <div className="w-[72px] h-[72px] p-4 rounded-full mb-2 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-float flex items-center justify-center">
        <Check width={36} height={36} className="shrink-0" strokeWidth={3} />
      </div>

      <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-br from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
        Grid Cleared!
      </h2>

      <p className="text-sm text-slate-400 text-center max-w-[280px] -mt-3 leading-relaxed">
        You cleared all lines in <strong className="text-white font-bold">{moves}</strong> moves and{' '}
        <strong className="text-white font-bold">{minutes}m {seconds}s</strong>!
      </p>

      <div className="flex gap-3 w-full max-w-[320px]">
        <button 
          className="glow-btn flex-1 py-3.5 px-5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white border border-emerald-400/20"
          onClick={onNextLevel}
        >
          Next Level
          <ArrowRight width={18} height={18} className="shrink-0" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
