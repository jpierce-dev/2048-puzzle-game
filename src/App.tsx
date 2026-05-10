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
    2: 'bg-slate-800 text-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
    4: 'bg-slate-700 text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    8: 'bg-indigo-900/80 text-indigo-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-indigo-700/50',
    16: 'bg-indigo-800 text-white shadow-[0_0_15px_rgba(79,70,229,0.2)] border border-indigo-600/50',
    32: 'bg-violet-700 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-violet-500/50',
    64: 'bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] border border-violet-400/50',
    128: 'bg-fuchsia-600 text-white shadow-[0_0_30px_rgba(192,38,211,0.5)] border border-fuchsia-400/50 text-4xl sm:text-5xl',
    256: 'bg-fuchsia-500 text-white shadow-[0_0_35px_rgba(217,70,239,0.6)] border border-fuchsia-300/50 text-4xl sm:text-5xl',
    512: 'bg-pink-600 text-white shadow-[0_0_40px_rgba(219,39,119,0.7)] border border-pink-400/50 text-4xl sm:text-5xl',
    1024: 'bg-rose-500 text-white shadow-[0_0_45px_rgba(244,63,94,0.8)] border border-rose-400/50 text-3xl sm:text-4xl',
    2048: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_60px_rgba(168,85,247,0.8)] border border-white/30 text-3xl sm:text-4xl animate-pulse',
  };
  return colors[value] || 'bg-slate-900 text-white border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.2)]';
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
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c]?.value === WINNING_SCORE) return 'WON';
      }
    }
    if (getEmptyPositions(currentGrid).length > 0) return 'PLAYING';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = currentGrid[r][c]!.value;
        if (c < GRID_SIZE - 1 && currentGrid[r][c + 1]?.value === val) return 'PLAYING';
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
    const mergedPositions = new Set<string>();

    cells.forEach(([r, c]) => {
      const tile = newGrid[r][c];
      if (!tile) return;

      let currR = r;
      let currC = c;
      let nextR = currR + vector[0];
      let nextC = currC + vector[1];

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
        newGrid[currR][currC] = { ...tile, position: [currR, currC] };
        newGrid[r][c] = null;
        moved = true;
      }
    });

    if (moved) {
      if (merged) playSound('merge', isMuted, earnedScore);
      else playSound('move', isMuted);
      
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
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col landscape:flex-row items-center justify-center p-4 sm:p-8 font-sans select-none overflow-hidden safe-area-inset gap-8 sm:gap-16 relative w-full">
      
      {/* 1. Header & Controls: Responsive Layout */}
      <div className="w-full max-w-[500px] landscape:max-w-[300px] flex flex-col gap-6 sm:gap-8 z-10 shrink-0">
        <div className="flex justify-between items-center landscape:items-start landscape:flex-col gap-4 sm:gap-6">
          <div className="text-center landscape:text-left">
            <h1 className="text-5xl sm:text-7xl landscape:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tighter leading-none filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              2048
            </h1>
            <p className="text-slate-400 font-semibold mt-2 sm:text-lg tracking-wide uppercase text-sm">Neon Edition</p>
          </div>
          
          <div className="flex landscape:w-full gap-3 sm:gap-4">
            <div className="flex-1 bg-slate-900/80 border border-white/10 px-4 py-3 rounded-2xl text-center shadow-lg backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Score</p>
              <p className="text-xl sm:text-3xl font-black tabular-nums text-white">{score}</p>
            </div>
            <div className="flex-1 bg-slate-900/80 border border-white/10 px-4 py-3 rounded-2xl text-center shadow-lg backdrop-blur-sm relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-pink-300 mb-1">Best</p>
              <p className="text-xl sm:text-3xl font-black tabular-nums text-white">{bestScore}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-900/50 p-3 sm:p-4 rounded-2xl shadow-xl border border-white/5 backdrop-blur-md">
           <div className="flex gap-3">
            <button 
              onClick={initGame}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] active:scale-95"
            >
              <RefreshCw size={20} />
              <span className="hidden sm:inline landscape:inline">Reset</span>
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 flex items-center justify-center rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 transition-colors text-slate-300 shadow-md active:scale-95"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
           </div>
          
           {/* Instructions (Hidden on very small screens, visible on desktop/landscape) */}
           <div className="flex items-center gap-2 text-slate-500 px-2">
             <div className="flex gap-1">
               <ArrowUp size={16} /> <ArrowDown size={16} /> <ArrowLeft size={16} /> <ArrowRight size={16} />
             </div>
           </div>
        </div>
        
        <div className="hidden landscape:block text-slate-500 mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 text-slate-600">How to Play</p>
          <p className="text-sm font-medium">
            Use <span className="text-indigo-400 font-bold">arrow keys</span> or <span className="text-pink-400 font-bold">swipe</span> to move tiles. Tiles with the same number merge into one when they touch.
          </p>
        </div>
      </div>

      {/* 3. Game Board: Takes up remaining space in landscape, max width limited */}
      <div className="w-full max-w-[500px] landscape:max-w-[min(100vh-4rem,600px)] aspect-square shrink-0 z-10">
        <div 
          className="relative w-full h-full bg-slate-900/60 p-3 sm:p-4 rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center touch-none overflow-hidden backdrop-blur-md"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Inner Glow effect */}
          <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>

          {/* Grid Background */}
          <div className="grid grid-cols-4 grid-rows-4 w-full h-full gap-2 sm:gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-full h-full">
                <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl w-full h-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-white/5" />
              </div>
            ))}
          </div>

          {/* Tiles */}
          <div className="absolute inset-0 p-3 sm:p-4 pointer-events-none">
            <AnimatePresence>
              {grid.flat().filter(Boolean).map((tile) => (
                <motion.div
                  key={tile!.id}
                  layoutId={`tile-${tile!.id}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    left: `calc(${tile!.position[1] * 25}% + 0.75rem)`, // Accounting for padding
                    top: `calc(${tile!.position[0] * 25}% + 0.75rem)`,
                    width: 'calc(25% - 1.5rem)',
                    height: 'calc(25% - 1.5rem)'
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 30,
                    mass: 0.8 
                  }}
                  className="absolute"
                >
                  <div className={`w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-3xl sm:text-5xl transition-colors duration-200 ${getTileColor(tile!.value)}`}>
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
              className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-lg rounded-3xl sm:rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className="bg-slate-900/90 p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,1)] border border-white/10 max-w-sm w-full relative overflow-hidden"
              >
                {/* Glow behind modal */}
                <div className={`absolute inset-0 opacity-20 blur-3xl ${gameStatus === 'WON' ? 'bg-indigo-500' : 'bg-slate-500'}`}></div>

                {gameStatus === 'WON' ? (
                  <div className="relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                      <Crown size={48} className="text-white animate-bounce" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">VICTORY!</h2>
                    <p className="text-indigo-300 mb-8 font-bold text-lg">2048 Reached!</p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5">
                      <Trophy size={48} className="text-slate-500" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
                    <p className="text-slate-400 mb-8 font-bold text-xl">{score} points</p>
                  </div>
                )}
                <button 
                  onClick={initGame}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-black text-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 relative z-10"
                >
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Portrait Mobile Footer Instructions */}
      <div className="landscape:hidden text-center text-slate-500 w-full max-w-[500px]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1 text-slate-600">How to Play</p>
        <p className="text-sm font-medium">
          Use <span className="text-indigo-400 font-bold">arrow keys</span> or <span className="text-pink-400 font-bold">swipe</span> to move tiles.
        </p>
      </div>
    </div>
  );
}
