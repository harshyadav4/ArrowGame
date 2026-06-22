export interface Point {
  r: number;
  c: number;
}

export interface Path {
  id: string;
  points: Point[]; // Winding sequence of grid points: points[0] is tail, points[len-1] is head
  direction: 'U' | 'D' | 'L' | 'R';
  color: string;
}

export type GridPaths = Path[];

export interface LevelData {
  rows: number;
  cols: number;
  paths: GridPaths;
  solution: string[]; // List of path IDs in the order they should be cleared
}

// 8 Vibrant colors for neon theme paths
const PATH_COLORS = [
  '#a78bfa', // Purple
  '#f472b6', // Pink
  '#22d3ee', // Cyan
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#60a5fa', // Blue
  '#f87171', // Red
  '#fb7185', // Rose
];

/**
 * Check if a cell is occupied by any path (optionally excluding a specific path).
 */
export function getPathOccupyingCell(r: number, c: number, paths: GridPaths, excludeId?: string): Path | null {
  for (const path of paths) {
    if (excludeId && path.id === excludeId) continue;
    for (const p of path.points) {
      if (p.r === r && p.c === c) return path;
    }
  }
  return null;
}

/**
 * Translate direction to coordinate delta.
 */
export function getDirectionDelta(dir: 'U' | 'D' | 'L' | 'R'): { dr: number; dc: number } {
  switch (dir) {
    case 'U': return { dr: -1, dc: 0 };
    case 'D': return { dr: 1, dc: 0 };
    case 'L': return { dr: 0, dc: -1 };
    case 'R': return { dr: 0, dc: 1 };
  }
}

/**
 * Checks if a path's head has a clear exit line of sight.
 * Returns null if the path can exit, or the coordinate of the first blocking block.
 */
export function getPathObstruction(path: Path, paths: GridPaths, rows: number, cols: number): Point | null {
  const head = path.points[path.points.length - 1];
  const { dr, dc } = getDirectionDelta(path.direction);
  
  let currR = head.r + dr;
  let currC = head.c + dc;
  
  while (currR >= 0 && currR < rows && currC >= 0 && currC < cols) {
    // Check if any other path occupies this cell
    const blocker = getPathOccupyingCell(currR, currC, paths, path.id);
    if (blocker) {
      return { r: currR, c: currC };
    }
    currR += dr;
    currC += dc;
  }
  
  return null; // Path is clear to exit
}

/**
 * Solves the paths maze.
 * Returns a list of path IDs in clearing order, or null if unsolvable.
 */
export function solvePaths(paths: GridPaths, rows: number, cols: number): string[] | null {
  let tempPaths: GridPaths = paths.map(p => ({
    ...p,
    points: p.points.map(pt => ({ ...pt })),
  }));
  
  const solution: string[] = [];
  const totalPaths = tempPaths.length;
  
  let progressed = true;
  while (progressed) {
    progressed = false;
    
    // Find a path that has no obstructions
    const clearableIndex = tempPaths.findIndex(p => getPathObstruction(p, tempPaths, rows, cols) === null);
    
    if (clearableIndex !== -1) {
      const clearedPath = tempPaths[clearableIndex];
      solution.push(clearedPath.id);
      tempPaths = tempPaths.filter((_, idx) => idx !== clearableIndex);
      progressed = true;
    }
  }
  
  if (solution.length === totalPaths) {
    return solution;
  }
  return null; // Stuck
}

/**
 * Generates a procedural winding path layout.
 * Ensures the level is solvable, retrying until a valid layout is generated.
 */
function findSolvableOrientationsAndSolve(paths: GridPaths, rows: number, cols: number): { solution: string[]; orientedPaths: GridPaths } | null {
  const tempPaths: GridPaths = paths.map(p => ({
    ...p,
    points: p.points.map(pt => ({ ...pt })),
  }));

  const solution: string[] = [];
  const orientedPaths: GridPaths = [];
  let statesVisited = 0;
  const maxStates = 1000;

  function search(remaining: GridPaths): boolean {
    statesVisited++;
    if (statesVisited > maxStates) {
      return false; // Bounded search limit reached
    }

    if (remaining.length === 0) {
      return true;
    }

    for (let i = 0; i < remaining.length; i++) {
      const path = remaining[i];
      const orientations = [
        { isForward: true, head: path.points[path.points.length - 1], prev: path.points[path.points.length - 2] },
        { isForward: false, head: path.points[0], prev: path.points[1] }
      ];

      for (const orient of orientations) {
        let dir: 'U' | 'D' | 'L' | 'R';
        if (orient.head.r === orient.prev.r) {
          dir = orient.head.c > orient.prev.c ? 'R' : 'L';
        } else {
          dir = orient.head.r > orient.prev.r ? 'D' : 'U';
        }

        const { dr, dc } = getDirectionDelta(dir);
        let currR = orient.head.r + dr;
        let currC = orient.head.c + dc;
        let obstructed = false;

        while (currR >= 0 && currR < rows && currC >= 0 && currC < cols) {
          const blocker = getPathOccupyingCell(currR, currC, remaining, path.id);
          if (blocker) {
            obstructed = true;
            break;
          }
          currR += dr;
          currC += dc;
        }

        if (!obstructed) {
          if (!orient.isForward) {
            path.points.reverse();
          }
          path.direction = dir;

          solution.push(path.id);
          orientedPaths.push(path);

          const nextRemaining = remaining.filter((_, idx) => idx !== i);
          if (search(nextRemaining)) {
            return true;
          }

          solution.pop();
          orientedPaths.pop();
          if (!orient.isForward) {
            path.points.reverse();
          }
        }
      }
    }

    return false;
  }

  if (search(tempPaths)) {
    return {
      solution,
      orientedPaths
    };
  }
  return null;
}

export type ShapeType = 'rectangle' | 'triangle' | 'apple' | 'cat' | 'heart' | 'star';

export function isCellActive(r: number, c: number, rows: number, cols: number, shape: ShapeType): boolean {
  if (shape === 'rectangle') {
    return true;
  }
  
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const x = (c - cx) / (cx || 1);
  const y = (r - cy) / (cy || 1);
  
  if (shape === 'triangle') {
    const ratio = rows > 1 ? r / (rows - 1) : 1;
    const maxSpan = (cols - 1) / 2;
    const span = ratio * maxSpan;
    return Math.abs(c - cx) <= Math.max(0.5, span) + 0.01;
  }
  
  if (shape === 'apple') {
    const dist = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    
    // Apple body with top and bottom indents
    const rApple = 0.72 - 0.12 * Math.sin(Math.abs(angle) * 2) - 0.08 * y;
    const isBody = dist <= rApple;
    
    // Stem: vertical bar at the top center
    const isStem = x >= -0.1 && x <= 0.1 && y < -0.4;
    
    return isBody || isStem;
  }
  
  if (shape === 'cat') {
    // Ears height based on total rows (around 22%)
    const earHeight = Math.max(2, Math.floor(rows * 0.22));
    
    if (r < earHeight) {
      // Ears tips and base
      const leftEar = c >= 1 && c <= 1 + r;
      const rightEar = c >= cols - 2 - r && c <= cols - 2;
      return leftEar || rightEar;
    }
    
    // Cat eyes (placed at 40% height, width-appropriate columns)
    const eyeRow = Math.floor(rows * 0.4);
    const leftEye = Math.floor(cols * 0.3);
    const rightEye = cols - 1 - leftEye;
    
    if (r === eyeRow && (c === leftEye || c === rightEye)) {
      return false; // Eyes holes
    }
    
    // Rounded bottom edge
    if (r === rows - 1) {
      return c > 0 && c < cols - 1;
    }
    
    return true;
  }

  if (shape === 'heart') {
    // Cardioid heart: (x^2 + (y * 1.1 + 0.35 * sqrt(|x|))^2) <= 0.65
    const adjustedY = y * 1.1 + 0.35 * Math.sqrt(Math.abs(x));
    return x * x + adjustedY * adjustedY <= 0.65;
  }

  if (shape === 'star') {
    const dist = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    // 5-point star polar formula:
    const starRadius = 0.65 + 0.32 * Math.cos(5 * angle + Math.PI / 2);
    return dist <= starRadius;
  }
  
  return true;
}

export function getActiveCellCount(rows: number, cols: number, shape: ShapeType): number {
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isCellActive(r, c, rows, cols, shape)) {
        count++;
      }
    }
  }
  return count;
}

export function generateWindingLevel(rows: number, cols: number, minDensity: number = 0.7, shape: ShapeType = 'rectangle'): LevelData {
  let attempts = 0;
  
  while (attempts < 300) {
    attempts++;
    
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    
    // Mark inactive cells as visited so the generator ignores them
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isCellActive(r, c, rows, cols, shape)) {
          visited[r][c] = true;
        }
      }
    }
    
    const paths: GridPaths = [];
    let pathIdCounter = 0;
    
    // Helper to find random unvisited starting cell
    const getUnvisitedCoords = () => {
      const list: Point[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!visited[r][c]) list.push({ r, c });
        }
      }
      return list;
    };
    
    let unvisited = getUnvisitedCoords();
    const orphans: Point[] = [];
    
    while (unvisited.length > 0) {
      // Pick a random unvisited starting node
      const start = unvisited[Math.floor(Math.random() * unvisited.length)];
      const currentPathPoints: Point[] = [start];
      visited[start.r][start.c] = true;
      
      // Determine random length for the winding walk based on grid dimensions.
      // For larger grids, we allow significantly longer paths (very large arrows).
      const gridFactor = Math.min(rows, cols);
      const minLen = Math.max(3, Math.floor(gridFactor * 0.5));
      const maxLen = Math.max(6, Math.floor(gridFactor * 1.0));
      const targetLength = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
      
      let curr = start;
      for (let len = 1; len < targetLength; len++) {
        // Find unvisited neighbors
        const neighbors: Point[] = [];
        const directions = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 },
        ];
        
        for (const dir of directions) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
            neighbors.push({ r: nr, c: nc });
          }
        }
        
        if (neighbors.length === 0) break; // Trapped
        
        // Move to a random neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        currentPathPoints.push(next);
        visited[next.r][next.c] = true;
        curr = next;
      }
      
      if (currentPathPoints.length >= 2) {
        // Keep the path
        const id = `path_${pathIdCounter++}`;
        paths.push({
          id,
          points: currentPathPoints,
          direction: 'R', // Default placeholder
          color: PATH_COLORS[pathIdCounter % PATH_COLORS.length],
        });
      } else {
        // This cell is an orphan (trapped start cell with length 1)
        orphans.push(start);
      }
      
      unvisited = getUnvisitedCoords();
    }
    
    // ORPHAN PAIRING STEP: Merge adjacent orphans into paths of length >= 2
    const remainingOrphans: Point[] = [];
    const visitedOrphans = new Set<string>();
    
    for (const o of orphans) {
      const key = `${o.r},${o.c}`;
      if (visitedOrphans.has(key)) continue;
      
      const orphanPath: Point[] = [o];
      visitedOrphans.add(key);
      
      let curr = o;
      while (orphanPath.length < 5) {
        let nextOrphan: Point | null = null;
        const directions = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 },
        ];
        
        for (const dir of directions) {
          const nr = curr.r + dir.dr;
          const nc = curr.c + dir.dc;
          const nKey = `${nr},${nc}`;
          if (
            orphans.some(opt => opt.r === nr && opt.c === nc) && 
            !visitedOrphans.has(nKey)
          ) {
            nextOrphan = { r: nr, c: nc };
            visitedOrphans.add(nKey);
            break;
          }
        }
        
        if (!nextOrphan) break;
        orphanPath.push(nextOrphan);
        curr = nextOrphan;
      }
      
      if (orphanPath.length >= 2) {
        const id = `path_${pathIdCounter++}`;
        paths.push({
          id,
          points: orphanPath,
          direction: 'R',
          color: PATH_COLORS[pathIdCounter % PATH_COLORS.length],
        });
      } else {
        remainingOrphans.push(o);
      }
    }
    
    // Now try to absorb all isolated orphan cells into neighboring paths
    let allOrphansAbsorbed = true;
    for (const orphan of remainingOrphans) {
      let absorbed = false;
      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];
      
      // Shuffle directions to avoid bias
      const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
      
      for (const dir of shuffledDirs) {
        const nr = orphan.r + dir.dr;
        const nc = orphan.c + dir.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        
        // Find which path owns this neighbor cell
        let foundPathIdx = -1;
        let foundPtIdx = -1;
        for (let pIdx = 0; pIdx < paths.length; pIdx++) {
          const ptIdx = paths[pIdx].points.findIndex(pt => pt.r === nr && pt.c === nc);
          if (ptIdx !== -1) {
            foundPathIdx = pIdx;
            foundPtIdx = ptIdx;
            break;
          }
        }
        
        if (foundPathIdx === -1) continue;
        
        const path = paths[foundPathIdx];
        const len = path.points.length;
        
        // Case 1: Neighbor is the tail
        if (foundPtIdx === 0) {
          path.points.unshift(orphan);
          absorbed = true;
          break;
        }
        
        // Case 2: Neighbor is the head
        if (foundPtIdx === len - 1) {
          path.points.push(orphan);
          absorbed = true;
          break;
        }
        
        // Case 3: Neighbor is internal, try to split
        if (foundPtIdx > 0 && foundPtIdx < len - 1) {
          // Try split method A: append orphan to first segment
          if (len - 1 - foundPtIdx >= 2) {
            const p1Points = [...path.points.slice(0, foundPtIdx + 1), orphan];
            const p2Points = path.points.slice(foundPtIdx + 1);
            
            // Replace path with P1 and create P2
            path.points = p1Points;
            const newId = `path_${pathIdCounter++}`;
            paths.push({
              id: newId,
              points: p2Points,
              direction: 'R',
              color: PATH_COLORS[pathIdCounter % PATH_COLORS.length],
            });
            absorbed = true;
            break;
          }
          
          // Try split method B: prepend orphan to second segment
          if (foundPtIdx >= 2) {
            const p1Points = path.points.slice(0, foundPtIdx);
            const p2Points = [orphan, ...path.points.slice(foundPtIdx)];
            
            // Replace path with P1 and create P2
            path.points = p1Points;
            const newId = `path_${pathIdCounter++}`;
            paths.push({
              id: newId,
              points: p2Points,
              direction: 'R',
              color: PATH_COLORS[pathIdCounter % PATH_COLORS.length],
            });
            absorbed = true;
            break;
          }
        }
      }
      
      if (!absorbed) {
        allOrphansAbsorbed = false;
        break; // Failed to absorb this orphan, retry generation
      }
    }
    
    if (!allOrphansAbsorbed) {
      continue;
    }
    
    // Verify we have 100% cell coverage
    const totalFilledCells = paths.reduce((sum, p) => sum + p.points.length, 0);
    const totalActiveCells = getActiveCellCount(rows, cols, shape);
    if (totalFilledCells !== totalActiveCells) {
      continue;
    }
    
    // Solve and verify layout solvability with dynamic orientations
    const result = findSolvableOrientationsAndSolve(paths, rows, cols);
    if (result) {
      return {
        rows,
        cols,
        paths: result.orientedPaths,
        solution: result.solution,
      };
    }
  }
  
  // Fallback default level if generator fails (find the first active adjacent pair)
  let fallbackPoints: Point[] = [];
  for (let r = 0; r < rows && fallbackPoints.length < 2; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (isCellActive(r, c, rows, cols, shape) && isCellActive(r, c + 1, rows, cols, shape)) {
        fallbackPoints = [{ r, c }, { r, c: c + 1 }];
        break;
      }
    }
  }
  if (fallbackPoints.length < 2) {
    // If no horizontal pair, try vertical
    for (let r = 0; r < rows - 1 && fallbackPoints.length < 2; r++) {
      for (let c = 0; c < cols; c++) {
        if (isCellActive(r, c, rows, cols, shape) && isCellActive(r + 1, c, rows, cols, shape)) {
          fallbackPoints = [{ r, c }, { r: r + 1, c }];
          break;
        }
      }
    }
  }
  if (fallbackPoints.length < 2) {
    fallbackPoints = [{ r: Math.floor(rows / 2), c: Math.floor(cols / 2) }, { r: Math.floor(rows / 2), c: Math.floor(cols / 2) + 1 }];
  }

  const fallbackPath: Path = {
    id: 'fallback_1',
    points: fallbackPoints,
    direction: 'R',
    color: PATH_COLORS[0],
  };
  return {
    rows,
    cols,
    paths: [fallbackPath],
    solution: ['fallback_1'],
  };
}

export interface CampaignLevel {
  name: string;
  rows: number;
  cols: number;
  minDensity: number;
  shape?: ShapeType;
}

/**
 * Pre-defined campaign levels of increasing size and complexity.
 */
export const lineCampaignLevels: CampaignLevel[] = [
  { name: "Level 1: Entry Maze", rows: 4, cols: 6, minDensity: 0.6, shape: 'rectangle' },
  { name: "Level 2: Triangle Climb", rows: 7, cols: 9, minDensity: 0.7, shape: 'triangle' },
  { name: "Level 3: Apple Harvest", rows: 8, cols: 10, minDensity: 0.75, shape: 'apple' },
  { name: "Level 4: Cat Whiskers", rows: 9, cols: 11, minDensity: 0.75, shape: 'cat' },
  { name: "Level 5: Crimson Heart", rows: 10, cols: 10, minDensity: 0.8, shape: 'heart' },
  { name: "Level 6: Stardust Escape", rows: 11, cols: 11, minDensity: 0.8, shape: 'star' },
  { name: "Level 7: Pyramid Escape", rows: 12, cols: 12, minDensity: 0.8, shape: 'triangle' },
  { name: "Level 8: Golden Apple", rows: 12, cols: 13, minDensity: 0.8, shape: 'apple' },
  { name: "Level 9: Neko Whiskers", rows: 13, cols: 13, minDensity: 0.8, shape: 'cat' },
  { name: "Level 10: Infinite Love", rows: 13, cols: 13, minDensity: 0.85, shape: 'heart' },
];
