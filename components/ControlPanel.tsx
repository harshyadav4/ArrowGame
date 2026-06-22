import React from 'react';
import { Heart, CircleHelp, Volume2, VolumeX } from 'lucide-react';
import { ShapeType } from '../utils/lineMazeGenerator';
import { LevelBadge } from './LevelBadge';

interface ControlPanelProps {
  levelNumber: number;
  hearts: number;
  maxHearts: number;
  moves: number;
  time: number;
  shape: ShapeType;
  isSoundMuted: boolean;
  hintsCount: number;
  isHintGlowing: boolean;
  onHint: () => void;
  onToggleSound: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  levelNumber,
  hearts,
  maxHearts,
  moves,
  time,
  shape,
  isSoundMuted,
  hintsCount,
  isHintGlowing,
  onHint,
  onToggleSound,
}) => {
  // Format elapsed time as MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const renderHeartIcons = () => {
    return Array.from({ length: maxHearts }).map((_, idx) => {
      const isFilled = idx < hearts;
      if (isFilled) {
        return (
          <Heart
            key={`heart-${idx}`}
            className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] text-red-500 fill-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0"
            strokeWidth={2.5}
          />
        );
      }
      return (
        <Heart
          key={`heart-${idx}`}
          className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] text-white/15 fill-none transition-all duration-300 shrink-0"
          strokeWidth={2.5}
        />
      );
    });
  };

  return (
    <div className="w-full max-w-[500px] mx-auto px-4 py-2 flex flex-col gap-2.5">
      {/* Single Stats Card (Only Values, No Labels) */}
      <div className="flex justify-between items-center bg-white/2 border border-white/5 rounded-[14px] px-4 py-2.5 text-sm text-slate-400">
        <div className="flex items-center gap-1.5 flex-1 justify-start">
          <div className="flex gap-1.5 items-center">{renderHeartIcons()}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <span className="font-bold text-white font-outfit">{moves}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <span className="font-bold text-white font-outfit">{formatTime(time)}</span>
        </div>
      </div>

      {/* Control Buttons Grid */}
      <div className="grid grid-cols-3 gap-2">
        <button
          className={`flex flex-col items-center justify-center gap-1 py-2 px-1 sm:py-2.5 sm:px-1 rounded-xl text-[10px] sm:text-xs font-semibold bg-white/3 border border-white/5 text-slate-400 cursor-pointer transition-all duration-200 hover:enabled:bg-violet-500/10 hover:enabled:border-violet-500/30 hover:enabled:text-white hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 disabled:opacity-25 disabled:cursor-not-allowed ${
            isHintGlowing ? 'animate-hint-glow text-white!' : ''
          }`}
          onClick={onHint}
          disabled={hintsCount <= 0}
          title="Show direct move hint"
        >
          <CircleHelp className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" strokeWidth={2.5} />
          Hint ({hintsCount})
        </button>

        {/* Level Display Badge */}
        <LevelBadge levelNumber={levelNumber} shape={shape} />

        <button
          className="flex flex-col items-center justify-center gap-1 py-2 px-1 sm:py-2.5 sm:px-1 rounded-xl text-[10px] sm:text-xs font-semibold bg-white/3 border border-white/5 text-slate-400 cursor-pointer transition-all duration-200 hover:enabled:bg-violet-500/10 hover:enabled:border-violet-500/30 hover:enabled:text-white hover:enabled:-translate-y-0.5 active:enabled:translate-y-0"
          onClick={onToggleSound}
          title={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isSoundMuted ? (
            <>
              <VolumeX className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" strokeWidth={2.5} />
              Unmute
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" strokeWidth={2.5} />
              Mute
            </>
          )}
        </button>
      </div>
    </div>
  );
};
