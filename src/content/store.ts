import { create } from 'zustand';
import { loadSettings, saveSettings } from '../lib/storage';
import { DEFAULT_EVAL_SETTINGS, type EvalSettings, type LoopStatus, type PageType, type EvalPage } from '../lib/types';

interface EvalStoreState {
  /** Current page type */
  pageType: PageType;
  /** Parsed evaluation page state */
  evalPage: EvalPage | null;
  /** Loop running status */
  loopStatus: LoopStatus;
  /** Current course index being processed */
  currentCourseIndex: number;
  /** Error message if loopStatus === 'error' */
  errorMessage: string;
  /** Persisted settings */
  settings: EvalSettings;
  /** Have settings been loaded from storage? */
  settingsHydrated: boolean;

  // Actions
  setPageType: (t: PageType) => void;
  setEvalPage: (p: EvalPage) => void;
  setLoopStatus: (s: LoopStatus) => void;
  setErrorMessage: (msg: string) => void;
  setCurrentCourseIndex: (i: number) => void;
  hydrateSettings: () => Promise<void>;
  updateSettings: (patch: Partial<EvalSettings>) => Promise<void>;
  reset: () => void;
}

export const useEvalStore = create<EvalStoreState>((set, get) => ({
  pageType: 'unknown',
  evalPage: null,
  loopStatus: 'idle',
  currentCourseIndex: 0,
  errorMessage: '',
  settings: DEFAULT_EVAL_SETTINGS,
  settingsHydrated: false,

  setPageType(t) {
    set({ pageType: t });
  },

  setEvalPage(p) {
    set({ evalPage: p, currentCourseIndex: p.currentCourseIndex });
  },

  setLoopStatus(s) {
    set({ loopStatus: s });
    if (s === 'idle') {
      set({ errorMessage: '' });
    }
  },

  setErrorMessage(msg) {
    set({ errorMessage: msg, loopStatus: 'error' });
  },

  setCurrentCourseIndex(i) {
    set({ currentCourseIndex: i });
  },

  async hydrateSettings() {
    if (get().settingsHydrated) return;
    const settings = await loadSettings();
    set({ settings, settingsHydrated: true });
  },

  async updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await saveSettings(next);
  },

  reset() {
    set({
      loopStatus: 'idle',
      currentCourseIndex: 0,
      errorMessage: '',
    });
  },
}));
