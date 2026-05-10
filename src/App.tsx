import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Crown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Volume2, VolumeX } from 'lucide-react';

// --- Sound Engine ---
const playSound = (type: 'move' | 'merge' | 'win', isMuted: boolean, value?: number) => {
  if (isMuted) return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playCymbal = (freq: number, decay: number, volume: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + decay);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + decay);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + decay);
  };

  if (type === 'move') {
    // Quick "whoosh"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'merge') {
    // Harmonic "pop" with pitch based on value
    const pitchShift = Math.log2(value || 2) * 50;
    const baseFreq = 400 + pitchShift;
    
    // Primary Tone
    playCymbal(baseFreq, 0.2, 0.1);
    // Harmonic Tone
    playCymbal(baseFreq * 1.5, 0.15, 0.05);
  } else if (type === 'win') {
    // Victory fanfare arpeggio
    const notes = [440, 554.37, 659.25, 880]; // A Major
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }, i * 150);
    });
  }
};

// --- Types ---
type Tile = {
  id: number;
  value: number;
  position: [number, number]; // [row, col]
  mergedFrom?: Tile[];
};

type Grid = (Tile | null)[][];

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// --- Constants ---
const GRID_SIZE = 4;
const WINNING_SCORE = 2048;

// --- Helper Functions ---
const createEmptyGrid = (): Grid => 
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

const getEmptyPositions = (grid: Grid): [number, number][] => {
  const empty: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  return empty;
};

const getRandomValue = () => (Math.random() < 0.9 ? 2 : 4);

const getTileColor = (value: number) => {
  const colors: Record<number, string> = {
    2: 'bg-emerald-100 text-emerald-900',
    4: 'bg-emerald-200 text-emerald-900',
    8: 'bg-orange-200 text-orange-900',
    16: 'bg-orange-300 text-white',
    32: 'bg-orange-400 text-white',
    64: 'bg-orange-500 text-white',
    128: 'bg-amber-400 text-white shadow-lg',
    256: 'bg-amber-500 text-white shadow-lg',
    512: 'bg-amber-600 text-white shadow-lg',
    1024: 'bg-amber-700 text-white shadow-xl',
    2048: 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-300 animate-pulse',
  };
  return colors[value] || 'bg-slate-800 text-white';
};

export default function App() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [nextId, setNextId] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const touchStart = useRef<[number, number] | null>(null);

  // Initialize game
  const initGame = useCallback(() => {
    let newGrid = createEmptyGrid();
    let idCounter = 0;
    
    // Add two random tiles
    for (let i = 0; i < 2; i++) {
      const emptyPos = getEmptyPositions(newGrid);
      if (emptyPos.length > 0) {
        const [r, c] = emptyPos[Math.floor(Math.random() * emptyPos.length)];
        newGrid[r][c] = { id: idCounter++, value: getRandomValue(), position: [r, c] };
      }
    }
    
    setGrid(newGrid);
    setScore(0);
    setNextId(idCounter);
    setGameStatus('PLAYING');
  }, []);

  useEffect(() => {
    initGame();
    const savedBest = localStorage.getItem('2048_best_score');
    if (savedBest) setBestScore(parseInt(savedBest));
    
    const savedMuted = localStorage.getItem('2048_muted');
    if (savedMuted) setIsMuted(savedMuted === 'true');
  }, [initGame]);

  useEffect(() => {
    localStorage.setItem('2048_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048_best_score', score.toString());
    }
  }, [score, bestScore]);

  const addRandomTile = (currentGrid: Grid, currentId: number) => {
    const emptyPos = getEmptyPositions(currentGrid);
    if (emptyPos.length === 0) return { grid: currentGrid, id: currentId };

    const [r, c] = emptyPos[Math.floor(Math.random() * emptyPos.length)];
    const newGrid = [...currentGrid.map(row => [...row])];
    newGrid[r][c] = { id: currentId, value: getRandomValue(), position: [r, c] };
    
    return { grid: newGrid, id: currentId + 1 };
  };

  const checkGameStatus = (currentGrid: Grid) => {
    // Check for 2048 tile
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c]?.value === WINNING_SCORE) return 'WON';
      }
    }

    // Check if any empty cell exists
    if (getEmptyPositions(currentGrid).length > 0) return 'PLAYING';

    // Check if any merges are possible
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = currentGrid[r][c]!.value;
        // Check right
        if (c < GRID_SIZE - 1 && currentGrid[r][c + 1]?.value === val) return 'PLAYING';
        // Check down
        if (r < GRID_SIZE - 1 && currentGrid[r + 1][c]?.value === val) return 'PLAYING';
      }
    }

    return 'LOST';
  };

  const move = useCallback((direction: Direction) => {
    if (gameStatus !== 'PLAYING') return;

    let newGrid = currentGridCopy(grid);
    let moved = false;
    let merged = false;
    let earnedScore = 0;
    let currentIdCounter = nextId;

    const traverseOrder = (dir: Direction) => {
      const order: [number, number][] = [];
      if (dir === 'UP' || dir === 'LEFT') {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) order.push([r, c]);
        }
      } else {
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          for (let c = GRID_SIZE - 1; c >= 0; c--) order.push([r, c]);
        }
      }
      return order;
    };

    const getVector = (dir: Direction) => {
      const vectors: Record<Direction, [number, number]> = {
        UP: [-1, 0],
        DOWN: [1, 0],
        LEFT: [0, -1],
        RIGHT: [0, 1],
      };
      return vectors[dir];
    };

    const vector = getVector(direction);
    const cells = traverseOrder(direction);
    
    // To prevent multiple merges in one move
    const mergedPositions = new Set<string>();

    cells.forEach(([r, c]) => {
      const tile = newGrid[r][c];
      if (!tile) return;

      let currR = r;
      let currC = c;
      let nextR = currR + vector[0];
      let nextC = currC + vector[1];

      // Move as far as possible
      while (
        nextR >= 0 && nextR < GRID_SIZE &&
        nextC >= 0 && nextC < GRID_SIZE &&
        !newGrid[nextR][nextC]
      ) {
        currR = nextR;
        currC = nextC;
        nextR += vector[0];
        nextC += vector[1];
      }

      // Check for merge
      if (
        nextR >= 0 && nextR < GRID_SIZE &&
        nextC >= 0 && nextC < GRID_SIZE &&
        newGrid[nextR][nextC] &&
        newGrid[nextR][nextC]?.value === tile.value &&
        !mergedPositions.has(`${nextR},${nextC}`)
      ) {
        const targetTile = newGrid[nextR][nextC]!;
        const newValue = tile.value * 2;
        
        newGrid[nextR][nextC] = {
          id: currentIdCounter++,
          value: newValue,
          position: [nextR, nextC],
          mergedFrom: [targetTile, { ...tile, position: [nextR, nextC] }]
        };
        newGrid[r][c] = null;
        mergedPositions.add(`${nextR},${nextC}`);
        earnedScore += newValue;
        moved = true;
        merged = true;
      } else if (currR !== r || currC !== c) {
        // Just move
        newGrid[currR][currC] = { ...tile, position: [currR, currC] };
        newGrid[r][c] = null;
        moved = true;
      }
    });

    if (moved) {
      if (merged) {
        playSound('merge', isMuted, earnedScore);
      } else {
        playSound('move', isMuted);
      }
      const { grid: finalGrid, id: finalId } = addRandomTile(newGrid, currentIdCounter);
      setGrid(finalGrid);
      setNextId(finalId);
      setScore(prev => prev + earnedScore);
      
      const newStatus = checkGameStatus(finalGrid);
      if (newStatus === 'WON' && gameStatus === 'PLAYING') {
        playSound('win', isMuted);
      }
      setGameStatus(newStatus);
    }
  }, [grid, nextId, gameStatus, isMuted]);

  const currentGridCopy = (g: Grid): Grid => g.map(row => [...row]);

  // Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') move('UP');
      if (e.key === 'ArrowDown' || e.key === 's') move('DOWN');
      if (e.key === 'ArrowLeft' || e.key === 'a') move('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd') move('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = [e.touches[0].clientX, e.touches[0].clientY];
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touchEnd = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
    const dx = touchEnd[0] - touchStart.current[0];
    const dy = touchEnd[1] - touchStart.current[1];
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) move(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStart.current = null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8 font-sans text-slate-900 select-none overflow-hidden safe-area-inset gap-6 sm:gap-8 relative">
      
      {/* 1. Header & Controls: Standard Vertical Stack (Hidden in Mobile Landscape) */}
      <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-6 landscape:max-sm:hidden">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h1 className="text-5xl sm:text-7xl font-black text-emerald-600 tracking-tighter leading-none">2048</h1>
            <p className="text-slate-500 font-semibold mt-1 sm:text-lg">For fun!</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 sm:gap-4">
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-center min-w-[100px] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</p>
                <p className="text-xl sm:text-2xl font-black">{score}</p>
              </div>
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-center min-w-[100px] shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best</p>
                <p className="text-xl sm:text-2xl font-black">{bestScore}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex gap-2">
            <button 
              onClick={initGame}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95"
            >
              <RefreshCw size={20} />
              Reset
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 sm:px-4 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
           </div>
          <div className="flex gap-4 pr-4">
             <div className="flex items-center gap-2 text-slate-400">
               <div className="flex gap-1">
                 <ArrowUp size={16} /> <ArrowDown size={16} /> <ArrowLeft size={16} /> <ArrowRight size={16} />
               </div>
               <span className="text-xs font-bold uppercase tracking-tighter hidden sm:inline text-slate-500">Arrows / Swipe</span>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Mobile Landscape Sidebar (Absolute) */}
      <div className="hidden landscape:max-sm:flex flex-col justify-between absolute left-6 h-full py-8 w-1/4 z-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-black text-emerald-600 tracking-tighter leading-none">2048</h1>
          <div className="bg-white border border-slate-200 p-2 rounded-xl text-center shadow-sm">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Score</p>
            <p className="text-2xl font-black">{score}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={initGame}
              className="flex-1 bg-emerald-600 text-white p-3 rounded-lg font-bold shadow-md active:scale-95"
            >
              <RefreshCw size={20} className="mx-auto" />
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 bg-white border border-slate-200 rounded-lg text-slate-500"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">How to Play</p>
          <p className="text-slate-500 font-medium text-[10px]">Swipe to move tiles.</p>
        </div>
      </div>

      {/* 3. Game Board: Responsive Sizing */}
      <div className="w-full max-w-2xl landscape:max-sm:flex landscape:max-sm:justify-end landscape:max-sm:pr-4 landscape:max-sm:max-w-none">
        <div 
          className="relative w-full aspect-square landscape:max-sm:h-[92vh] landscape:max-sm:w-[92vh] bg-slate-200/80 p-2 rounded-3xl shadow-xl flex items-center justify-center touch-none overflow-hidden border-4 border-slate-200 mx-auto landscape:max-sm:mx-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Grid Background */}
          <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="p-1 sm:p-2 w-full h-full">
                <div className="bg-slate-300/40 rounded-lg sm:rounded-2xl w-full h-full" />
              </div>
            ))}
          </div>

          {/* Tiles */}
          <div className="absolute inset-0 p-2">
            <AnimatePresence>
              {grid.flat().filter(Boolean).map((tile) => (
                <motion.div
                  key={tile!.id}
                  layoutId={`tile-${tile!.id}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    left: `${tile!.position[1] * 25}%`,
                    top: `${tile!.position[0] * 25}%`,
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 500, 
                    damping: 45,
                    mass: 0.8 
                  }}
                  className="absolute w-1/4 h-1/4 p-1 sm:p-2"
                >
                  <div className={`w-full h-full rounded-lg sm:rounded-2xl flex items-center justify-center font-black text-2xl sm:text-5xl transition-colors duration-200 shadow-md ${getTileColor(tile!.value)}`}>
                    {tile!.value}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Overlays */}
          {gameStatus !== 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-500 max-w-xs w-full"
              >
                {gameStatus === 'WON' ? (
                  <>
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Crown size={48} className="text-amber-500 animate-bounce" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-2">VICTORY!</h2>
                    <p className="text-slate-500 mb-8 font-bold">2048 Reached!</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy size={48} className="text-slate-400 opacity-50" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-2">GG!</h2>
                    <p className="text-slate-500 mb-8 font-bold text-xl">{score} points</p>
                  </>
                )}
                <button 
                  onClick={initGame}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-2xl transition-all shadow-lg active:scale-95"
                >
                  Again!
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      {/* 4. Footer Instructions (Hidden in Mobile Landscape) */}
      <div className="mt-4 text-center text-slate-400 landscape:max-sm:hidden">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">How to Play</p>
        <p className="text-slate-500 font-medium mt-1">
          Use your <span className="text-emerald-600 font-bold">arrow keys</span> or <span className="text-emerald-600 font-bold">Swipe</span> to move tiles.
        </p>
      </div>
    </div>


  );
}
