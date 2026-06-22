'use client';

import React from 'react';
import { CanvasGameBoard } from './CanvasGameBoard';
import { ControlPanel } from './ControlPanel';
import { WinOverlay } from './WinOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { AlertMessage } from './AlertMessage';
import { useGameLogic } from '../hooks/useGameLogic';

export const ArrowExitGame: React.FC = () => {
  const {
    campaignIndex,
    hintsCount,
    paths,
    rows,
    cols,
    shape,
    hearts,
    moves,
    time,
    isGameOver,
    isWin,
    alertMessage,
    isSoundMuted,
    animatingPathId,
    animationType,
    hintPathId,
    isSolverRunning,
    isHintGlowing,
    maxHearts,
    toggleSound,
    handleReset,
    handleHint,
    handlePathClick,
    handleAnimationComplete,
    handleNextLevel,
  } = useGameLogic();

  return (
    <div
      className="flex-1 w-full max-w-[600px] mx-auto p-2.5 sm:px-4 sm:py-2.5 flex flex-col items-center gap-2.5 h-full overflow-hidden justify-start transition-all duration-300 text-[#f8fafc]"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #151233 0%, #070514 100%)',
      }}
    >
      <header className="text-center mb-0 pt-1">
        <h1 className="font-outfit text-2xl sm:text-[38px] font-extrabold tracking-tight bg-gradient-to-br from-violet-400 via-pink-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(167,139,250,0.15)] mb-1">
          Arrow Exit
        </h1>
        <p className="text-sm text-slate-400 font-medium hidden sm:block">
          Clear all winding lines off the board in the correct order
        </p>
      </header>

      {/* Warning Alert */}
      <AlertMessage message={alertMessage} />

      {/* Stats and Controls */}
      <ControlPanel
        levelNumber={campaignIndex + 1}
        hearts={hearts}
        maxHearts={maxHearts}
        moves={moves}
        time={time}
        shape={shape}
        isSoundMuted={isSoundMuted}
        hintsCount={hintsCount}
        isHintGlowing={isHintGlowing}
        onHint={handleHint}
        onToggleSound={toggleSound}
      />

      {/* Canvas board wrap */}
      <div id="game-canvas-area" className="relative w-full max-w-[500px] flex-1 flex flex-col justify-center items-center">
        <CanvasGameBoard
          levelNumber={campaignIndex + 1}
          paths={paths}
          rows={rows}
          cols={cols}
          shape={shape}
          animatingPathId={animatingPathId}
          animationType={animationType}
          hintPathId={hintPathId}
          onPathClick={handlePathClick}
          onAnimationComplete={handleAnimationComplete}
          isInteractionDisabled={isGameOver || isWin || isSolverRunning}
        />

        {/* Win Overlay */}
        <WinOverlay
          isWin={isWin}
          moves={moves}
          time={time}
          onNextLevel={handleNextLevel}
        />

        {/* Game Over / Lose Overlay */}
        <GameOverOverlay
          isGameOver={isGameOver}
          onReset={handleReset}
        />
      </div>
    </div>
  );
};
