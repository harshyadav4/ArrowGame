'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Path,
  GridPaths,
  ShapeType,
  generateWindingLevel,
  lineCampaignLevels,
  getPathObstruction,
} from '../utils/lineMazeGenerator';
import {
  playClickSound,
  playMoveSound,
  playCollisionSound,
  playWinSound,
  playGameOverSound,
  getMuteState,
  toggleMute as toggleAudioMute,
} from '../utils/audio';

export interface GameState {
  paths: GridPaths;
  hearts: number;
  moves: number;
}

// ----------------------------------------------------
// Safe localStorage wrappers to prevent security crashes
// ----------------------------------------------------
const safeLocalStorageGet = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.warn("localStorage.getItem failed:", e);
  }
  return null;
};

const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn("localStorage.setItem failed:", e);
  }
};

export const useGameLogic = (maxHearts = 3) => {
  // Active level/campaign state
  const [campaignIndex, setCampaignIndex] = useState<number>(0);
  const [hintsCount, setHintsCount] = useState<number>(3);

  // Active level state
  const [paths, setPaths] = useState<GridPaths>([]);
  const [rows, setRows] = useState<number>(0);
  const [cols, setCols] = useState<number>(0);
  const [shape, setShape] = useState<ShapeType>('rectangle');
  const [initialState, setInitialState] = useState<GameState | null>(null);

  // Gameplay stats states
  const [hearts, setHearts] = useState<number>(maxHearts);
  const [moves, setMoves] = useState<number>(0);
  const [time, setTime] = useState<number>(0);

  // Interactive overlays and alerts
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isWin, setIsWin] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // Animation and Solver states
  const [animatingPathId, setAnimatingPathId] = useState<string | null>(null);
  const [animationType, setAnimationType] = useState<string | null>(null);
  const [hintPathId, setHintPathId] = useState<string | null>(null);
  const [isSolverRunning, setIsSolverRunning] = useState<boolean>(false);
  const [isHintGlowing, setIsHintGlowing] = useState<boolean>(false);

  // Refs for tracking async variables
  const activePathsRef = useRef<GridPaths>([]);
  const nextSolveStepResolveRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const collisionSoundPromiseRef = useRef<Promise<void> | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activePathsRef.current = paths;
  }, [paths]);

  // Fetch campaign progress and hints count from localStorage on mount (deferred to avoid set-state-in-effect lint errors)
  useEffect(() => {
    const savedLevel = safeLocalStorageGet('arrow_exit_campaign_level');
    const savedHints = safeLocalStorageGet('arrow_exit_hints_count');
    const hasVisited = safeLocalStorageGet('arrow_exit_visited');
    const initialMuteState = getMuteState();
    
    const deferTimer = setTimeout(() => {
      setIsSoundMuted(initialMuteState);
      if (savedLevel) {
        const idx = parseInt(savedLevel, 10);
        if (idx >= 0) {
          setCampaignIndex(idx);
        }
      }
      if (savedHints) {
        const hc = parseInt(savedHints, 10);
        if (hc >= 0) {
          setHintsCount(hc);
        }
      }
      if (!hasVisited) {
        setIsHelpOpen(true);
        safeLocalStorageSet('arrow_exit_visited', 'true');
      }
    }, 0);

    return () => clearTimeout(deferTimer);
  }, []);

  // Helper to deep copy paths
  const copyPaths = useCallback((src: GridPaths): GridPaths => {
    return src.map(p => ({
      ...p,
      points: p.points.map(pt => ({ ...pt })),
    }));
  }, []);

  // Initialize Level
  const initLevel = useCallback((index: number) => {
    setIsGameOver(false);
    setIsWin(false);
    setMoves(0);
    setTime(0);
    setAlertMessage(null);
    setAnimatingPathId(null);
    setAnimationType(null);
    setHintPathId(null);
    setIsSolverRunning(false);

    const levelNumber = index + 1;
    const isSnakeLevel = levelNumber % 10 === 0;

    let targetRows = 6;
    let targetCols = 8;
    let density = 0.7;
    let targetShape: ShapeType = 'rectangle';

    if (isSnakeLevel) {
      // Force extra hard snake level (Large grid, high density, and changing shapes)
      targetRows = 13;
      targetCols = 13;
      density = 0.90; // High density challenge
      const shapes: ShapeType[] = ['star', 'heart', 'apple', 'rectangle'];
      targetShape = shapes[Math.floor(levelNumber / 10) % shapes.length];
    } else if (index < lineCampaignLevels.length) {
      const lvl = lineCampaignLevels[index];
      targetRows = lvl.rows;
      targetCols = lvl.cols;
      density = lvl.minDensity;
      targetShape = lvl.shape || 'rectangle';
    } else {
      // Procedural scaling for levels beyond Level 10
      const extra = index - lineCampaignLevels.length + 1; // 1, 2, 3...
      targetRows = Math.min(13, 12 + Math.floor(extra / 4));
      targetCols = Math.min(15, 13 + (extra % 3));
      density = 0.85;

      const shapes: ShapeType[] = ['triangle', 'apple', 'cat', 'heart', 'star', 'rectangle'];
      targetShape = shapes[index % shapes.length];
    }

    const levelData = generateWindingLevel(targetRows, targetCols, density, targetShape);
    setPaths(levelData.paths);
    setRows(levelData.rows);
    setCols(levelData.cols);
    setShape(targetShape);
    setHearts(maxHearts);

    setInitialState({
      paths: copyPaths(levelData.paths),
      hearts: maxHearts,
      moves: 0,
    });
  }, [maxHearts, copyPaths]);

  // Load level on campaignIndex update (deferred to avoid set-state-in-effect lint errors)
  useEffect(() => {
    const deferTimer = setTimeout(() => {
      initLevel(campaignIndex);
    }, 0);
    return () => clearTimeout(deferTimer);
  }, [campaignIndex, initLevel]);

  // Gameplay timer loop
  useEffect(() => {
    if (isGameOver || isWin || isSolverRunning || animatingPathId) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, isWin, isSolverRunning, animatingPathId]);

  // Clear alerts after brief window
  useEffect(() => {
    if (alertMessage) {
      const t = setTimeout(() => setAlertMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [alertMessage]);

  // Inactivity detection to glow hint button (deferred to avoid set-state-in-effect lint errors)
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const deferTimer = setTimeout(() => {
      setIsHintGlowing(false);

      if (hintsCount <= 0 || isGameOver || isWin || isSolverRunning || animatingPathId) {
        return;
      }

      idleTimer = setTimeout(() => {
        setIsHintGlowing(true);
      }, 8000); // 8 seconds of idle time
    }, 0);

    return () => {
      clearTimeout(deferTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [moves, campaignIndex, hintsCount, isGameOver, isWin, isSolverRunning, animatingPathId]);

  const toggleSound = useCallback(() => {
    const muted = toggleAudioMute();
    setIsSoundMuted(muted);
    playClickSound();
  }, []);

  // Full reset
  const handleReset = useCallback(() => {
    if (!initialState || isSolverRunning || animatingPathId) return;
    playClickSound();

    setPaths(copyPaths(initialState.paths));
    setHearts(initialState.hearts);
    setMoves(initialState.moves);
    setTime(0);
    setIsGameOver(false);
    setIsWin(false);
    setAlertMessage(null);
    setHintPathId(null);
  }, [initialState, isSolverRunning, animatingPathId, copyPaths]);

  // Show direct hints
  const handleHint = useCallback(() => {
    if (isGameOver || isWin || isSolverRunning || animatingPathId) return;
    if (hintsCount <= 0) {
      setAlertMessage("No hints remaining!");
      playCollisionSound();
      return;
    }

    // Check paths that have zero obstructions
    const hints = paths.filter(p => getPathObstruction(p, paths, rows, cols) === null);
    if (hints.length > 0) {
      playClickSound();
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      setHintPathId(randomHint.id);

      const newHintsCount = hintsCount - 1;
      setHintsCount(newHintsCount);
      safeLocalStorageSet('arrow_exit_hints_count', newHintsCount.toString());

      setTimeout(() => {
        setHintPathId(prev => prev === randomHint.id ? null : prev);
      }, 2500);
    } else {
      setAlertMessage("All pathways are deadlocked! Undo or Reset.");
      playCollisionSound();
    }
  }, [isGameOver, isWin, isSolverRunning, animatingPathId, hintsCount, paths, rows, cols]);

  // Check win
  const checkWinStateOriginal = useCallback((currentPaths: GridPaths) => {
    if (currentPaths.length === 0) {
      setIsWin(true);
      playWinSound();

      const nextIdx = campaignIndex + 1;
      safeLocalStorageSet('arrow_exit_campaign_level', nextIdx.toString());

      // Award 1 hint on level completion
      const newHintsCount = hintsCount + 1;
      setHintsCount(newHintsCount);
      safeLocalStorageSet('arrow_exit_hints_count', newHintsCount.toString());
    }
  }, [campaignIndex, hintsCount]);

  const handleNextLevelOriginal = useCallback(() => {
    playClickSound();
    setCampaignIndex(prev => prev + 1);
  }, []);

  // Click handler triggered from Canvas
  const handlePathClick = useCallback((clickedPath: Path) => {
    if (isGameOver || isWin || isSolverRunning || animatingPathId) return;
    setHintPathId(null);

    const obstruction = getPathObstruction(clickedPath, paths, rows, cols);

    if (obstruction) {
      // Collision recoil animation trigger
      setAnimatingPathId(clickedPath.id);
      setAnimationType('collide');
      collisionSoundPromiseRef.current = playCollisionSound();
    } else {
      // Smooth Exit flight trigger
      setAnimatingPathId(clickedPath.id);
      setAnimationType('exit');
      playMoveSound();
    }
  }, [isGameOver, isWin, isSolverRunning, animatingPathId, paths, rows, cols]);

  // Called when CanvasGameBoard completes animation slide
  const handleAnimationComplete = useCallback(() => {
    if (!animatingPathId || !animationType) return;

    const blockId = animatingPathId;
    const type = animationType;

    // Clear state
    setAnimatingPathId(null);
    setAnimationType(null);

    if (type === 'collide') {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      setMoves(prev => prev + 1);

      if (newHearts <= 0) {
        if (collisionSoundPromiseRef.current) {
          collisionSoundPromiseRef.current.then(() => {
            setIsGameOver(true);
            playGameOverSound();
            collisionSoundPromiseRef.current = null;
          });
        } else {
          setIsGameOver(true);
          playGameOverSound();
        }
      }

      // If solver is running, resolve promise
      if (nextSolveStepResolveRef.current) {
        nextSolveStepResolveRef.current();
        nextSolveStepResolveRef.current = null;
      }
    } else if (type === 'exit') {
      // Remove path from board
      const updatedPaths = activePathsRef.current.filter(p => p.id !== blockId);
      setPaths(updatedPaths);
      setMoves(prev => prev + 1);

      // Check win
      checkWinStateOriginal(updatedPaths);

      // Resolve step waiting promise for solver
      if (nextSolveStepResolveRef.current) {
        nextSolveStepResolveRef.current();
        nextSolveStepResolveRef.current = null;
      }
    }
  }, [animatingPathId, animationType, hearts, checkWinStateOriginal]);

  return {
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
    isHelpOpen,
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
    handleNextLevel: handleNextLevelOriginal,
    setIsHelpOpen,
    checkWinState: checkWinStateOriginal,
  };
};
