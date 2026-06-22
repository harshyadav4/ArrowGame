import React from 'react';
import { X, RotateCcw } from 'lucide-react';

interface GameOverOverlayProps {
  isGameOver: boolean;
  onReset: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  isGameOver,
  onReset,
}) => {
  if (!isGameOver) return null;

  return (
    <div 
      className="absolute inset-4 bg-[#0a081c]/85 backdrop-blur-xl border border-white/8 rounded-3xl flex flex-col items-center justify-center gap-6 z-20 p-6 shadow-2xl animate-pop-in"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Icon wrapper */}
      <div className="w-[72px] h-[72px] p-4 rounded-full mb-2 bg-red-500/10 border-2 border-red-500/30 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center">
        <X width={36} height={36} className="shrink-0" strokeWidth={3} />
      </div>

      <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-center bg-gradient-to-br from-red-400 to-red-600 bg-clip-text text-transparent">
        Game Over
      </h2>

      <p className="text-sm text-slate-400 text-center max-w-[280px] -mt-3 leading-relaxed">
        You ran out of lives! Click below to retry the grid.
      </p>

      <div className="flex gap-3 w-full max-w-[320px]">
        <button 
          className="glow-btn flex-1 py-3.5 px-5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white border border-red-400/20"
          onClick={onReset}
        >
          <RotateCcw width={18} height={18} className="shrink-0" strokeWidth={2.5} />
          Retry Level
        </button>
      </div>
    </div>
  );
};
