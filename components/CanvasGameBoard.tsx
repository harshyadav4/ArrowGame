import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Path,
  ShapeType,
  isCellActive,
  getDirectionDelta,
  getPathObstruction,
} from '../utils/lineMazeGenerator';

interface CanvasGameBoardProps {
  levelNumber: number;
  paths: Path[];
  rows: number;
  cols: number;
  shape: ShapeType;
  animatingPathId: string | null;
  animationType: string | null;
  hintPathId: string | null;
  onPathClick: (path: Path) => void;
  onAnimationComplete: () => void;
  isInteractionDisabled: boolean;
}

interface Point2D {
  x: number;
  y: number;
}

// ----------------------------------------------------
// Pure Helper Functions (Stateless, declared outside)
// ----------------------------------------------------

const getPointToSegmentDistance = (p: Point2D, a: Point2D, b: Point2D): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  
  // Projection factor
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
};

const getInterpolatedPoint = (track: Point2D[], distances: number[], targetDist: number): Point2D => {
  if (targetDist <= 0) return { ...track[0] };
  const lastIdx = track.length - 1;
  if (targetDist >= distances[lastIdx]) return { ...track[lastIdx] };

  for (let i = 0; i < lastIdx; i++) {
    if (targetDist >= distances[i] && targetDist <= distances[i+1]) {
      const segLen = distances[i+1] - distances[i];
      if (segLen === 0) return { ...track[i] };
      const t = (targetDist - distances[i]) / segLen;
      return {
        x: track[i].x + t * (track[i+1].x - track[i].x),
        y: track[i].y + t * (track[i+1].y - track[i].y),
      };
    }
  }
  return { ...track[lastIdx] };
};

const drawArrowhead = (
  ctx: CanvasRenderingContext2D,
  head: Point2D,
  angle: number,
  color: string,
  isHint: boolean
) => {
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  const outlineColor = '#0a0918';
  ctx.fillStyle = isHint ? '#10b981' : color;

  // Clear shadow blur during outline stroke to keep it sharp
  ctx.shadowBlur = 0;

  // Pointier, longer triangle shape
  ctx.beginPath();
  if (isHint) {
    ctx.moveTo(9.5, 0);       // Pointier longer tip for hint
    ctx.lineTo(-6, -5.5);     // Base corner 1
    ctx.lineTo(-6, 5.5);      // Base corner 2
  } else {
    ctx.moveTo(5.5, 0);       // Longer tip
    ctx.lineTo(-4, -3.5);     // Base corner 1
    ctx.lineTo(-4, 3.5);      // Base corner 2
  }
  ctx.closePath();

  // Draw outline stroke with sharp miter join
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = isHint ? 2.8 : 1.8;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 10;
  ctx.stroke();

  // Fill with neon glow
  ctx.shadowBlur = isHint ? 35 : 12;
  ctx.shadowColor = isHint ? '#10b981' : color;
  ctx.fill();
  ctx.restore();
};

const drawSnakeHead = (
  ctx: CanvasRenderingContext2D,
  head: Point2D,
  angle: number,
  color: string,
  isHint: boolean
) => {
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  const size = isHint ? 11.5 : 9.0;
  const outlineColor = '#0a0918';

  // 1. Draw forked tongue sticking out
  ctx.beginPath();
  ctx.strokeStyle = '#f43f5e'; // Crimson red tongue
  ctx.lineWidth = isHint ? 2.2 : 1.6;
  ctx.moveTo(size - 2, 0);
  ctx.lineTo(size + 6, 0);
  ctx.moveTo(size + 6, 0);
  ctx.lineTo(size + 9, -2.5);
  ctx.moveTo(size + 6, 0);
  ctx.lineTo(size + 9, 2.5);
  ctx.stroke();

  // 2. Draw spade/shield viper head shape (flared cheeks)
  ctx.beginPath();
  // Neck base attachment
  ctx.moveTo(-size * 0.6, -size * 0.4);
  // Left cheek
  ctx.bezierCurveTo(-size * 0.2, -size * 0.95, size * 0.2, -size * 0.95, size * 0.5, -size * 0.4);
  // Snout
  ctx.lineTo(size + 1, 0);
  // Right cheek taper
  ctx.lineTo(size * 0.5, size * 0.4);
  // Right cheek flare
  ctx.bezierCurveTo(size * 0.2, size * 0.95, -size * 0.2, size * 0.95, -size * 0.6, size * 0.4);
  ctx.closePath();

  // Fill with neon glowing gradient
  ctx.fillStyle = isHint ? '#10b981' : color;
  ctx.shadowBlur = isHint ? 30 : 12;
  ctx.shadowColor = isHint ? '#10b981' : color;
  ctx.fill();

  // Sharp outline
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // 3. Draw glowing viper slit eyes (angled diamond/wedge shapes)
  ctx.fillStyle = '#ffffff'; // White eyeball backing
  ctx.shadowBlur = 0;
  
  // Left eye shape
  ctx.beginPath();
  ctx.moveTo(size * 0.1, -size * 0.4);
  ctx.lineTo(size * 0.45, -size * 0.25);
  ctx.lineTo(size * 0.15, -size * 0.2);
  ctx.closePath();
  ctx.fill();

  // Right eye shape
  ctx.beginPath();
  ctx.moveTo(size * 0.1, size * 0.4);
  ctx.lineTo(size * 0.45, size * 0.25);
  ctx.lineTo(size * 0.15, size * 0.2);
  ctx.closePath();
  ctx.fill();

  // Red slit pupils pointing forward
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(size * 0.22, -size * 0.35);
  ctx.lineTo(size * 0.32, -size * 0.28);
  ctx.moveTo(size * 0.22, size * 0.35);
  ctx.lineTo(size * 0.32, size * 0.28);
  ctx.stroke();

  ctx.restore();
};

export const CanvasGameBoard: React.FC<CanvasGameBoardProps> = ({
  levelNumber,
  paths,
  rows,
  cols,
  shape,
  animatingPathId,
  animationType,
  hintPathId,
  onPathClick,
  onAnimationComplete,
  isInteractionDisabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Coordinates & mouse hover states
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState<number>(40);
  const [padding, setPadding] = useState<number>(30);

  // Animation values (using ref to avoid React state lag at 60fps)
  const animProgressRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);

  // Convert row, col index to Canvas pixels
  const getCanvasCoords = useCallback((r: number, c: number): Point2D => {
    return {
      x: padding + c * cellSize,
      y: padding + r * cellSize,
    };
  }, [padding, cellSize]);

  // Detect which path is hovered based on cursor coords
  const detectHoveredPath = useCallback((mx: number, my: number): string | null => {
    if (isInteractionDisabled || animatingPathId) return null;

    let minDistance = Infinity;
    let closestPathId: string | null = null;
    const threshold = 18; // px

    paths.forEach(path => {
      // Convert path points to canvas coordinates
      const canvasPoints = path.points.map(pt => getCanvasCoords(pt.r, pt.c));
      
      // Check distance to each segment
      for (let i = 0; i < canvasPoints.length - 1; i++) {
        const dist = getPointToSegmentDistance({ x: mx, y: my }, canvasPoints[i], canvasPoints[i+1]);
        if (dist < minDistance) {
          minDistance = dist;
          closestPathId = path.id;
        }
      }
    });

    return minDistance < threshold ? closestPathId : null;
  }, [isInteractionDisabled, animatingPathId, paths, getCanvasCoords]);

  // Re-calculate cell sizes depending on container width and height
  const handleResize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    if (cols === 0 || rows === 0) return;
    const containerWidth = containerRef.current.clientWidth;
    let containerHeight = containerRef.current.clientHeight;

    // Fallback if height is not resolved yet or too small
    if (!containerHeight || containerHeight < 100) {
      containerHeight = containerRef.current.parentElement?.clientHeight || 400;
    }
    
    // Fit to grid size plus margins
    const calculatedPadding = containerWidth < 480 ? 15 : 25;
    
    // Calculate max cell size allowed by width
    const maxCellSizeWidth = (containerWidth - calculatedPadding * 2) / (cols - 1 || 1);
    
    // Calculate max cell size allowed by height
    const maxCellSizeHeight = (containerHeight - calculatedPadding * 2) / (rows - 1 || 1);

    // Limit cell size to the minimum of both dimensions, keeping it at least 16px
    const calculatedCellSize = Math.max(16, Math.min(maxCellSizeWidth, maxCellSizeHeight));
    
    setPadding(calculatedPadding);
    setCellSize(calculatedCellSize);
  }, [cols, rows]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isInteractionDisabled || animatingPathId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const pathId = detectHoveredPath(mx, my);
    if (pathId) {
      const clickedPath = paths.find(p => p.id === pathId);
      if (clickedPath) {
        onPathClick(clickedPath);
      }
    }
  };

  // Track cursor movement for hover highlights
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hovered = detectHoveredPath(mx, my);
    setHoveredPathId(hovered);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPathId(null);
  };

  // Rope sliding points calculator
  const getSlidingPathPoints = useCallback((
    pathPoints: Point2D[],
    exitDirection: 'U' | 'D' | 'L' | 'R',
    offset: number,
    isExit: boolean
  ): Point2D[] => {
    const track = [...pathPoints];
    const head = pathPoints[pathPoints.length - 1];
    const { dr, dc } = getDirectionDelta(exitDirection);

    // Build the track extension
    const extensionLength = isExit ? Math.max(rows, cols) + 5 : 2;
    for (let i = 1; i <= extensionLength; i++) {
      track.push({
        x: head.x + dc * i * cellSize,
        y: head.y + dr * i * cellSize,
      });
    }

    // Cumulative distances along track
    const distances = [0];
    for (let i = 1; i < track.length; i++) {
      const d = Math.hypot(track[i].x - track[i-1].x, track[i].y - track[i-1].y);
      distances.push(distances[i-1] + d);
    }

    // Original path total length
    const originalDistances = [0];
    for (let i = 1; i < pathPoints.length; i++) {
      const d = Math.hypot(pathPoints[i].x - pathPoints[i-1].x, pathPoints[i].y - pathPoints[i-1].y);
      originalDistances.push(originalDistances[i-1] + d);
    }
    const originalLength = originalDistances[originalDistances.length - 1];

    const startDist = offset;
    const endDist = offset + originalLength;

    const result: Point2D[] = [];
    result.push(getInterpolatedPoint(track, distances, startDist));

    for (let i = 0; i < track.length; i++) {
      if (distances[i] > startDist && distances[i] < endDist) {
        result.push({ ...track[i] });
      }
    }

    result.push(getInterpolatedPoint(track, distances, endDist));
    return result;
  }, [rows, cols, cellSize]);

  // Draw exit preview dotted lines
  const drawTrajectory = useCallback((ctx: CanvasRenderingContext2D, path: Path) => {
    const headPt = path.points[path.points.length - 1];
    const headCanvas = getCanvasCoords(headPt.r, headPt.c);
    const { dr, dc } = getDirectionDelta(path.direction);
    
    const targetCellDist = Math.max(rows, cols);
    const endPt = {
      x: headCanvas.x + dc * targetCellDist * cellSize,
      y: headCanvas.y + dr * targetCellDist * cellSize,
    };

    const obstruction = getPathObstruction(path, paths, rows, cols);
    let lineColors = 'rgba(167, 139, 250, 0.4)';
    let isObstructed = false;

    if (obstruction) {
      isObstructed = true;
      const obCanvas = getCanvasCoords(obstruction.r, obstruction.c);
      endPt.x = obCanvas.x;
      endPt.y = obCanvas.y;
      lineColors = 'rgba(239, 68, 68, 0.5)';
    }

    ctx.beginPath();
    ctx.moveTo(headCanvas.x, headCanvas.y);
    ctx.lineTo(endPt.x, endPt.y);
    ctx.strokeStyle = lineColors;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw red circle highlight on obstruction cell
    if (isObstructed) {
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [rows, cols, paths, cellSize, getCanvasCoords]);

  // Master draw function (called on render and animation frames)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cols === 0 || rows === 0) return;

    // Dimensions in CSS pixels
    const width = padding * 2 + (cols - 1) * cellSize;
    const height = padding * 2 + (rows - 1) * cellSize;

    // Use device pixel ratio for retina screens to ensure sharpness
    const dpr = window.devicePixelRatio || 1;
    
    // Synchronize canvas buffer dimensions with CSS dimensions
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);
    
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Reset transform & scale to dpr to handle retina scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Reset board
    ctx.clearRect(0, 0, width, height);

    // Theme Configs
    const bgColor = '#0a0918';
    const dotColor = '#3a3460';
    
    // Draw canvas base background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Pass 1: Draw grid dots in the background
    ctx.fillStyle = dotColor;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isCellActive(r, c, rows, cols, shape)) {
          const pt = getCanvasCoords(r, c);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw paths exit hover previews
    if (hoveredPathId && !animatingPathId) {
      const hoverPath = paths.find(p => p.id === hoveredPathId);
      if (hoverPath) {
        drawTrajectory(ctx, hoverPath);
      }
    }

    const isSnakeLevel = levelNumber % 10 === 0;

    // Pass 2: Draw path lines on top of background dots
    paths.forEach(path => {
      const isAnimating = path.id === animatingPathId;
      const isHint = path.id === hintPathId;
      const isHovered = path.id === hoveredPathId;

      // If a hint is active and this path is NOT the hint path, make it semi-transparent
      if (hintPathId && !isHint) {
        ctx.globalAlpha = 0.15;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Base path points in pixels
      const points = path.points.map(pt => getCanvasCoords(pt.r, pt.c));
      
      // Points updated for animations
      let drawPoints = points;
      if (isAnimating && animationType) {
        drawPoints = getSlidingPathPoints(
          points, 
          path.direction, 
          animProgressRef.current, 
          animationType === 'exit'
        );
      }

      if (drawPoints.length < 2) return;

      const pathColor = path.color;
      const outlineColor = bgColor;

      if (isSnakeLevel) {
        // 1. Smooth Backing Outline
        ctx.beginPath();
        ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
        for (let i = 1; i < drawPoints.length; i++) {
          ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
        }
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = isHint ? 11.5 : 8.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;
        ctx.stroke();

        // 2. Smooth Glowing Cylinder Body (Base neon color)
        ctx.beginPath();
        ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
        for (let i = 1; i < drawPoints.length; i++) {
          ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
        }
        ctx.strokeStyle = isHint ? '#10b981' : pathColor;
        ctx.lineWidth = isHint ? 6.2 : 4.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.shadowColor = isHint ? '#10b981' : pathColor;
        ctx.stroke();
        ctx.shadowBlur = 0; // Disable shadows for drawing details on top

        // 3. Wavy/Perpendicular Neon Stripes (Detailed banding patterns)
        const step = 10; // distance between bands
        ctx.strokeStyle = isHint ? '#86efac' : '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'butt';

        for (let i = 0; i < drawPoints.length - 1; i++) {
          const p1 = drawPoints[i];
          const p2 = drawPoints[i+1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len === 0) continue;

          const ux = dx / len;
          const uy = dy / len;

          const px = -uy;
          const py = ux;

          let d = 0;
          while (d <= len) {
            const cx = p1.x + ux * d;
            const cy = p1.y + uy * d;

            ctx.beginPath();
            const halfWidth = isHint ? 3.0 : 2.0;
            ctx.moveTo(cx - px * halfWidth, cy - py * halfWidth);
            ctx.lineTo(cx + px * halfWidth, cy + py * halfWidth);
            ctx.stroke();

            d += step;
          }
        }
      } else {
        // Draw Path Outline (Double stroke outline separation)
        ctx.beginPath();
        ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
        for (let i = 1; i < drawPoints.length; i++) {
          ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
        }
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = isHint ? 12 : 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 0;
        ctx.stroke();

        // Draw Path Inner Line
        ctx.beginPath();
        ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
        for (let i = 1; i < drawPoints.length; i++) {
          ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
        }
        ctx.strokeStyle = isHint ? '#10b981' : pathColor;
        ctx.lineWidth = isHint ? 5.5 : 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Neon glows
        ctx.shadowBlur = isHovered ? 18 : 8;
        ctx.shadowColor = pathColor;
        
        if (isHint) {
          ctx.shadowBlur = 35;
          ctx.shadowColor = '#10b981';
        }

        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    });

    // Reset alpha
    ctx.globalAlpha = 1.0;

    // Pass 3: Draw arrowheads on top of all dots and lines
    paths.forEach(path => {
      const isAnimating = path.id === animatingPathId;
      const isHint = path.id === hintPathId;

      // If a hint is active and this path is NOT the hint path, make it semi-transparent
      if (hintPathId && !isHint) {
        ctx.globalAlpha = 0.15;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Base path points in pixels
      const points = path.points.map(pt => getCanvasCoords(pt.r, pt.c));
      
      // Points updated for animations
      let drawPoints = points;
      if (isAnimating && animationType) {
        drawPoints = getSlidingPathPoints(
          points, 
          path.direction, 
          animProgressRef.current, 
          animationType === 'exit'
        );
      }

      if (drawPoints.length < 2) return;

      const pathColor = path.color;
      const headIdx = drawPoints.length - 1;
      const head = drawPoints[headIdx];
      const prevHead = drawPoints[headIdx - 1];

      const dx = head.x - prevHead.x;
      const dy = head.y - prevHead.y;
      const angle = Math.atan2(dy, dx);

      if (isSnakeLevel) {
        drawSnakeHead(ctx, head, angle, pathColor, isHint);
      } else {
        drawArrowhead(ctx, head, angle, pathColor, isHint);
      }
    });

    // Reset alpha at the end
    ctx.globalAlpha = 1.0;
  }, [
    paths,
    rows,
    cols,
    shape,
    levelNumber,
    animatingPathId,
    animationType,
    hintPathId,
    hoveredPathId,
    padding,
    cellSize,
    getCanvasCoords,
    getSlidingPathPoints,
    drawTrajectory,
  ]);

  // Hook to redraw when React state updates
  useEffect(() => {
    draw();
  }, [draw]);

  // Keep a ref of the draw function so the animation loop can call it
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Clear hover preview immediately when an animation begins
  useEffect(() => {
    if (animatingPathId) {
      const frameId = requestAnimationFrame(() => setHoveredPathId(null));
      return () => cancelAnimationFrame(frameId);
    }
  }, [animatingPathId]);

  // Animation frame loop
  useEffect(() => {
    if (!animatingPathId || !animationType) {
      animProgressRef.current = 0;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    const path = paths.find(p => p.id === animatingPathId);
    if (!path) return;

    // Calculate maximum slide distance
    const pathCanvasPoints = path.points.map(pt => getCanvasCoords(pt.r, pt.c));
    const distances = [0];
    for (let i = 1; i < pathCanvasPoints.length; i++) {
      const d = Math.hypot(pathCanvasPoints[i].x - pathCanvasPoints[i-1].x, pathCanvasPoints[i].y - pathCanvasPoints[i-1].y);
      distances.push(distances[i-1] + d);
    }
    const pathLength = distances[distances.length - 1];
    
    const maxExitSlide = pathLength + Math.max(rows, cols) * cellSize + 50;
    const maxCollideSlide = 25; // pixels
    const duration = animationType === 'exit' ? 500 : 400; // ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (animationType === 'exit') {
        animProgressRef.current = progress * maxExitSlide;
      } else {
        if (progress < 0.4) {
          const p = progress / 0.4;
          animProgressRef.current = p * maxCollideSlide;
        } else if (progress < 0.6) {
          animProgressRef.current = maxCollideSlide + (Math.sin((progress - 0.4) * Math.PI * 8) * 3);
        } else {
          const p = (progress - 0.6) / 0.4;
          animProgressRef.current = maxCollideSlide * (1 - p);
        }
      }

      drawRef.current();

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        animProgressRef.current = 0;
        animationFrameIdRef.current = null;
        onAnimationComplete();
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [
    animatingPathId,
    animationType,
    paths,
    rows,
    cols,
    cellSize,
    getCanvasCoords,
    onAnimationComplete,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full grow flex justify-center items-center bg-transparent"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        className="rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
        style={{
          cursor: hoveredPathId ? 'pointer' : 'default',
        }}
      />
    </div>
  );
};
