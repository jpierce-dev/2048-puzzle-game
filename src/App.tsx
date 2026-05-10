import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Crown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Volume2, VolumeX, Palette } from 'lucide-react';
import { ThemeId, themes, ThemeConfig } from './themes';

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
    const pitchShift = Math.log2(value || 2) * 50;
    const baseFreq = 400 + pitchShift;
    playCymbal(baseFreq, 0.2, 0.1);
    playCymbal(baseFreq * 1.5, 0.15, 0.05);
  } else if (type === 'win') {
    const notes = [440, 554.37, 659.25, 880];
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
  position: [number, number];
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

export default function App() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [nextId, setNextId] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>('neon');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const touchStart = useRef<[number, number] | null>(null);

  const currentTheme = themes[themeId];

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
    const savedTheme = localStorage.getItem('2048_theme') as ThemeId;
    if (savedTheme && themes[savedTheme]) setThemeId(savedTheme);
  }, [initGame]);

  useEffect(() => {
    localStorage.setItem('2048_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('2048_theme', themeId);
  }, [themeId]);

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
      // Don't trigger moves if user is interacting with theme menu
      if (showThemeMenu) return;
      if (e.key === 'ArrowUp' || e.key === 'w') move('UP');
      if (e.key === 'ArrowDown' || e.key === 's') move('DOWN');
      if (e.key === 'ArrowLeft' || e.key === 'a') move('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd') move('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, showThemeMenu]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showThemeMenu) return;
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

  const cycleTheme = () => {
    const themeKeys = Object.keys(themes) as ThemeId[];
    const currentIndex = themeKeys.indexOf(themeId);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setThemeId(themeKeys[nextIndex]);
  };

  return (
    <div className={`min-h-screen ${currentTheme.globalBg} ${currentTheme.globalText} transition-colors duration-500 flex flex-col landscape:flex-row items-center justify-center p-4 sm:p-8 font-sans select-none overflow-hidden safe-area-inset gap-8 sm:gap-16 relative w-full`}>
      
      {/* Theme Menu Overlay */}
      <AnimatePresence>
        {showThemeMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowThemeMenu(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`${currentTheme.modalPanel} p-6 rounded-3xl w-full max-w-sm`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-xl font-black mb-4 ${currentTheme.modalTitle}`}>Select Theme</h3>
              <div className="flex flex-col gap-3">
                {(Object.keys(themes) as ThemeId[]).map((tId) => (
                  <button
                    key={tId}
                    onClick={() => {
                      setThemeId(tId);
                      setShowThemeMenu(false);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${themeId === tId ? 'border-current opacity-100 ring-2 ring-current ring-offset-2 ring-offset-transparent' : 'border-transparent opacity-70 hover:opacity-100 bg-black/10'}`}
                  >
                    <span className="font-bold">{themes[tId].name}</span>
                    {themeId === tId && <div className="w-3 h-3 rounded-full bg-current" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header & Controls */}
      <div className="w-full max-w-[500px] landscape:max-w-[300px] flex flex-col gap-6 sm:gap-8 z-10 shrink-0">
        <div className="flex justify-between items-center landscape:items-start landscape:flex-col gap-4 sm:gap-6">
          <div className="text-center landscape:text-left">
            <h1 className={`text-5xl sm:text-7xl landscape:text-6xl font-black tracking-tighter leading-none ${currentTheme.titleColors}`}>
              2048
            </h1>
            <p className="opacity-70 font-semibold mt-2 sm:text-lg tracking-wide uppercase text-sm">{currentTheme.name}</p>
          </div>
          
          <div className="flex landscape:w-full gap-3 sm:gap-4">
            <div className={`flex-1 ${currentTheme.panelBg} px-4 py-3 rounded-2xl text-center relative overflow-hidden transition-colors duration-500`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${currentTheme.scoreLabel}`}>Score</p>
              <p className={`text-xl sm:text-3xl font-black tabular-nums ${currentTheme.scoreText}`}>{score}</p>
            </div>
            <div className={`flex-1 ${currentTheme.panelBg} px-4 py-3 rounded-2xl text-center relative overflow-hidden transition-colors duration-500`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${currentTheme.scoreLabel}`}>Best</p>
              <p className={`text-xl sm:text-3xl font-black tabular-nums ${currentTheme.scoreText}`}>{bestScore}</p>
            </div>
          </div>
        </div>

        <div className={`flex items-center ${currentTheme.panelBg} p-3 sm:p-4 rounded-2xl transition-colors duration-500`}>
          <button 
            onClick={initGame}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all active:scale-95 ${currentTheme.btnPrimary}`}
          >
            <RefreshCw size={20} />
            <span className="hidden sm:inline landscape:inline">Reset</span>
          </button>
          
          <div className="flex gap-2 sm:gap-3 ml-2 sm:ml-3">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 flex items-center justify-center rounded-xl transition-all active:scale-95 ${currentTheme.btnSecondary}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button 
              onClick={() => setShowThemeMenu(true)}
              className={`p-3 flex items-center justify-center rounded-xl transition-all active:scale-95 ${currentTheme.btnSecondary}`}
              title="Change Theme"
            >
              <Palette size={20} />
            </button>
          </div>
        </div>
        
        <div className="hidden landscape:block opacity-60 mt-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2">How to Play</p>
          <p className="text-sm font-medium">
            Use arrow keys or swipe to move tiles. Tiles merge when they touch.
          </p>
        </div>
      </div>

      {/* 3. Game Board */}
      <div className="w-full max-w-[500px] landscape:max-w-[min(100vh-4rem,600px)] aspect-square shrink-0 z-10">
        <div 
          className={`relative w-full h-full ${currentTheme.boardBg} p-3 sm:p-4 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-center touch-none overflow-hidden transition-colors duration-500`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full h-full">
            {/* Grid Background */}
            <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-full h-full p-1.5 sm:p-2">
                  <div className={`w-full h-full rounded-xl sm:rounded-2xl transition-colors duration-500 ${currentTheme.emptyCell}`} />
                </div>
              ))}
            </div>

            {/* Tiles */}
            <div className="absolute inset-0 pointer-events-none">
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
                      stiffness: 400, 
                      damping: 30,
                      mass: 0.8 
                    }}
                    className="absolute w-1/4 h-1/4 p-1.5 sm:p-2"
                  >
                    <div className={`w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-3xl sm:text-5xl transition-all duration-300 ${currentTheme.getTileStyle(tile!.value)}`}>
                      {tile!.value}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Overlays */}
          {gameStatus !== 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`absolute inset-0 z-20 ${currentTheme.modalBg} rounded-3xl sm:rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8`}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className={`${currentTheme.modalPanel} p-10 rounded-[2.5rem] max-w-sm w-full relative overflow-hidden`}
              >
                {gameStatus === 'WON' ? (
                  <div className="relative z-10">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-current ${currentTheme.iconColors}`}>
                      <Crown size={48} className="text-white animate-bounce" />
                    </div>
                    <h2 className={`text-4xl sm:text-5xl font-black mb-2 tracking-tight ${currentTheme.modalTitle}`}>VICTORY!</h2>
                    <p className="opacity-80 mb-8 font-bold text-lg">2048 Reached!</p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="w-24 h-24 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Trophy size={48} className="opacity-50" />
                    </div>
                    <h2 className={`text-4xl sm:text-5xl font-black mb-2 tracking-tight ${currentTheme.modalTitle}`}>GAME OVER</h2>
                    <p className="opacity-80 mb-8 font-bold text-xl">{score} points</p>
                  </div>
                )}
                <button 
                  onClick={initGame}
                  className={`w-full px-8 py-4 rounded-2xl font-black text-2xl transition-all active:scale-95 relative z-10 ${currentTheme.btnPrimary}`}
                >
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Portrait Mobile Footer Instructions */}
      <div className="landscape:hidden text-center opacity-60 w-full max-w-[500px]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1">How to Play</p>
        <p className="text-sm font-medium">
          Use arrow keys or swipe to move tiles.
        </p>
      </div>
    </div>
  );
}
