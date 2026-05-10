export type ThemeId = 'classic' | 'ocean' | 'sunset' | 'neon';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  globalBg: string;
  globalText: string;
  titleColors: string;
  panelBg: string;
  scoreLabel: string;
  scoreText: string;
  btnPrimary: string;
  btnSecondary: string;
  boardBg: string;
  emptyCell: string;
  modalBg: string;
  modalPanel: string;
  modalTitle: string;
  iconColors: string;
  getTileStyle: (value: number) => string;
}

export const themes: Record<ThemeId, ThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Clean',
    globalBg: 'bg-slate-50',
    globalText: 'text-slate-900',
    titleColors: 'text-emerald-600',
    panelBg: 'bg-white border border-slate-200 shadow-sm',
    scoreLabel: 'text-slate-400',
    scoreText: 'text-slate-800',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20',
    btnSecondary: 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50',
    boardBg: 'bg-slate-200/80 shadow-xl border-4 border-slate-200',
    emptyCell: 'bg-slate-300/40',
    modalBg: 'bg-slate-900/40 backdrop-blur-md',
    modalPanel: 'bg-white border-4 border-emerald-500 shadow-2xl',
    modalTitle: 'text-slate-900',
    iconColors: 'text-emerald-500',
    getTileStyle: (value: number) => {
      const colors: Record<number, string> = {
        2: 'bg-emerald-50 text-emerald-900 shadow-sm border border-emerald-100/50',
        4: 'bg-emerald-100 text-emerald-900 shadow-sm border border-emerald-200/50',
        8: 'bg-emerald-200 text-emerald-900 shadow-sm border border-emerald-300/50',
        16: 'bg-emerald-300 text-emerald-900 shadow-md',
        32: 'bg-emerald-400 text-white shadow-md',
        64: 'bg-emerald-500 text-white shadow-lg',
        128: 'bg-amber-400 text-white shadow-lg text-4xl sm:text-5xl',
        256: 'bg-amber-500 text-white shadow-lg text-4xl sm:text-5xl',
        512: 'bg-orange-500 text-white shadow-xl text-4xl sm:text-5xl',
        1024: 'bg-orange-600 text-white shadow-xl text-3xl sm:text-4xl',
        2048: 'bg-red-500 text-white shadow-2xl ring-4 ring-red-300 text-3xl sm:text-4xl animate-pulse',
      };
      return colors[value] || 'bg-slate-800 text-white';
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Depth',
    globalBg: 'bg-slate-900',
    globalText: 'text-slate-100',
    titleColors: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]',
    panelBg: 'bg-slate-800 border border-cyan-900 shadow-lg',
    scoreLabel: 'text-cyan-600',
    scoreText: 'text-cyan-50',
    btnPrimary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/50',
    btnSecondary: 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700',
    boardBg: 'bg-slate-800/80 shadow-2xl border border-slate-700',
    emptyCell: 'bg-slate-900/50 shadow-inner',
    modalBg: 'bg-slate-950/80 backdrop-blur-lg',
    modalPanel: 'bg-slate-800 border border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.3)]',
    modalTitle: 'text-white',
    iconColors: 'text-cyan-400',
    getTileStyle: (value: number) => {
      const colors: Record<number, string> = {
        2: 'bg-slate-700 text-slate-300 shadow-sm border border-slate-600/50',
        4: 'bg-slate-600 text-slate-200 shadow-sm border border-slate-500/50',
        8: 'bg-sky-900 text-sky-100 shadow-md border border-sky-800/50',
        16: 'bg-sky-700 text-white shadow-lg shadow-sky-900/50',
        32: 'bg-blue-600 text-white shadow-lg shadow-blue-900/50',
        64: 'bg-blue-500 text-white shadow-lg shadow-blue-800/50',
        128: 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/60 text-4xl sm:text-5xl',
        256: 'bg-cyan-500 text-white shadow-xl shadow-cyan-800/60 text-4xl sm:text-5xl',
        512: 'bg-teal-500 text-white shadow-xl shadow-teal-900/60 text-4xl sm:text-5xl',
        1024: 'bg-emerald-500 text-white shadow-2xl shadow-emerald-900/70 text-3xl sm:text-4xl',
        2048: 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_30px_rgba(34,211,238,0.6)] text-3xl sm:text-4xl animate-pulse',
      };
      return colors[value] || 'bg-slate-950 text-white';
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    globalBg: 'bg-orange-50',
    globalText: 'text-stone-900',
    titleColors: 'text-orange-600',
    panelBg: 'bg-white border border-orange-200 shadow-md',
    scoreLabel: 'text-orange-400',
    scoreText: 'text-stone-800',
    btnPrimary: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg shadow-orange-500/30',
    btnSecondary: 'bg-white border border-orange-200 text-stone-500 hover:bg-orange-50',
    boardBg: 'bg-orange-100 shadow-xl border-4 border-orange-200',
    emptyCell: 'bg-orange-200/50',
    modalBg: 'bg-stone-900/40 backdrop-blur-sm',
    modalPanel: 'bg-white border-4 border-orange-400 shadow-2xl',
    modalTitle: 'text-stone-900',
    iconColors: 'text-orange-500',
    getTileStyle: (value: number) => {
      const colors: Record<number, string> = {
        2: 'bg-orange-50 text-orange-900 shadow-sm border border-orange-200/50',
        4: 'bg-orange-100 text-orange-900 shadow-sm border border-orange-300/50',
        8: 'bg-orange-200 text-orange-900 shadow-sm border border-orange-400/50',
        16: 'bg-orange-400 text-white shadow-md',
        32: 'bg-orange-500 text-white shadow-md',
        64: 'bg-red-500 text-white shadow-lg',
        128: 'bg-rose-500 text-white shadow-lg text-4xl sm:text-5xl',
        256: 'bg-rose-600 text-white shadow-lg text-4xl sm:text-5xl',
        512: 'bg-pink-600 text-white shadow-xl text-4xl sm:text-5xl',
        1024: 'bg-fuchsia-600 text-white shadow-xl text-3xl sm:text-4xl',
        2048: 'bg-gradient-to-br from-orange-400 via-rose-500 to-purple-600 text-white shadow-2xl text-3xl sm:text-4xl animate-pulse',
      };
      return colors[value] || 'bg-stone-800 text-white';
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon Night',
    globalBg: 'bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black',
    globalText: 'text-slate-100',
    titleColors: 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    panelBg: 'bg-slate-900/80 border border-white/10 shadow-lg backdrop-blur-sm',
    scoreLabel: 'text-indigo-300',
    scoreText: 'text-white',
    btnPrimary: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    btnSecondary: 'bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700',
    boardBg: 'bg-slate-900/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md',
    emptyCell: 'bg-slate-950/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-white/5',
    modalBg: 'bg-slate-950/80 backdrop-blur-lg',
    modalPanel: 'bg-slate-900/90 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)]',
    modalTitle: 'text-white',
    iconColors: 'text-white',
    getTileStyle: (value: number) => {
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
    }
  }
};
