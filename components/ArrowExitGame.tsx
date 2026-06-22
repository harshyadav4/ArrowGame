'use client';

import React, { useState } from 'react';
import { CanvasGameBoard } from './CanvasGameBoard';
import { ControlPanel } from './ControlPanel';
import { WinOverlay } from './WinOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { AlertMessage } from './AlertMessage';
import { useGameLogic } from '../hooks/useGameLogic';
import { ProfileHeader } from './ProfileHeader';
import { AuthScreen } from './AuthScreen';
import { ChatScreen } from './ChatScreen';

export const ArrowExitGame: React.FC = () => {
  const [screen, setScreen] = useState<'game' | 'auth' | 'chat'>('game');
  
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
    user,
    syncStatus,
    signOut,
    toggleSound,
    handleReset,
    handleHint,
    handlePathClick,
    handleAnimationComplete,
    handleNextLevel,
  } = useGameLogic();

  if (screen === 'auth') {
    return (
      <div
        className="flex-1 w-full max-w-[600px] mx-auto p-4 flex flex-col items-center justify-center h-full overflow-hidden transition-all duration-300 text-[#f8fafc]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #151233 0%, #070514 100%)',
        }}
      >
        <AuthScreen
          onBack={() => setScreen('game')}
          onAuthSuccess={() => setScreen('game')}
        />
      </div>
    );
  }

  if (screen === 'chat' && user) {
    return (
      <div
        className="flex-1 w-full h-full flex flex-col overflow-hidden transition-all duration-300 text-[#f8fafc]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #151233 0%, #070514 100%)',
        }}
      >
        <ChatScreen
          onBack={() => setScreen('game')}
          user={user}
        />
      </div>
    );
  }

  return (
    <div
      className="flex-1 w-full max-w-[600px] mx-auto p-2.5 sm:px-4 sm:py-2.5 flex flex-col items-center gap-2.5 h-full overflow-hidden justify-start transition-all duration-300 text-[#f8fafc]"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #151233 0%, #070514 100%)',
      }}
    >
      {/* Header with Title and Profile */}
      <header className="w-full max-w-[500px] flex items-center justify-between mb-0 pt-2 px-4 shrink-0">
        <div className="flex flex-col items-start">
          <h1 className="font-outfit text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-br from-violet-400 via-pink-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(167,139,250,0.15)]">
            Arrow Exit
          </h1>
          <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Clear all winding lines off the board
          </p>
        </div>
        <ProfileHeader
          user={user}
          syncStatus={syncStatus}
          onSignInClick={() => setScreen('auth')}
          onChatClick={() => setScreen('chat')}
          onSignOut={signOut}
        />
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
