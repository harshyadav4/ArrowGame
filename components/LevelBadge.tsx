import React from 'react';
import { ShapeType } from '../utils/lineMazeGenerator';

interface LevelBadgeProps {
  levelNumber: number;
  shape: ShapeType;
}

const SHAPE_NAMES: Record<string, string> = {
  rectangle: 'Classic',
  triangle: 'Triangle',
  apple: 'Apple',
  cat: 'Cat Face',
  heart: 'Heart',
  star: 'Star',
};

const SHAPE_ICONS: Record<string, string> = {
  rectangle: '⏹️',
  triangle: '🔺',
  apple: '🍎',
  cat: '🐱',
  heart: '💖',
  star: '⭐',
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({ levelNumber, shape }) => {
  const isSnakeLevel = levelNumber % 10 === 0;
  const shapeName = SHAPE_NAMES[shape] || shape;
  const shapeIcon = SHAPE_ICONS[shape] || '⏹️';

  if (isSnakeLevel) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-white text-center shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-snake-badge transition-all"
        title={`Snake Boss Challenge! Shape: ${shapeName}`}
      >
        <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider leading-none mb-0.5 text-emerald-200">
          🐍 Snake Boss
        </span>
        <span className="text-xs sm:text-sm font-extrabold font-outfit text-emerald-500 leading-none">
          {levelNumber}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-white text-center shadow-[0_0_15px_rgba(139,92,246,0.05)] transition-all"
      title={`Shape: ${shapeName}`}
    >
      <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider leading-none mb-0.5 text-slate-400">
        {shapeIcon} {shapeName}
      </span>
      <span className="text-xs sm:text-sm font-extrabold font-outfit text-purple-400 leading-none">
        {levelNumber}
      </span>
    </div>
  );
};
