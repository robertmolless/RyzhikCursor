import { create } from 'zustand';
import type {
  QuestState,
  SaveData,
  SceneKey,
  Season,
  TimeOfDay,
  WeatherKind,
  DialogLine,
} from '@/types';
import { QUEST_BY_ID } from '@/data/quests';
import { CASSETTE_BY_ID } from '@/data/cassettes';

const SAVE_KEY = 'ryzhik.save.v1';

export interface UIState {
  view:
    | 'menu'
    | 'playing'
    | 'paused'
    | 'journal'
    | 'cassettes'
    | 'photo'
    | 'credits';
  dialogQueue: DialogLine[];
  dialogIndex: number;
  toast: string | null;
  toastUntil: number;
}

export interface GameState {
  // World state
  scene: SceneKey;
  timeMinutes: number; // 0..1440
  daysPassed: number;
  timeScale: number;
  paused: boolean;
  season: Season;
  weather: WeatherKind;
  // Catalog
  friendships: Record<string, number>;
  quests: QuestState[];
  cassettes: string[]; // ids
  memories: string[];
  flags: Record<string, boolean>;
  photosTaken: number;
  currentCassette: string | null;
  // UI
  ui: UIState;

  // Actions
  startNewGame: () => void;
  load: (data: SaveData) => void;
  save: () => SaveData;
  setView: (v: UIState['view']) => void;
  pause: () => void;
  resume: () => void;
  setTimeScale: (s: number) => void;
  tick: (deltaMs: number) => void;
  setScene: (s: SceneKey) => void;
  setWeather: (w: WeatherKind) => void;

  // Dialog
  enqueueDialog: (lines: DialogLine[]) => void;
  advanceDialog: () => void;
  clearDialog: () => void;

  // Toast
  showToast: (msg: string, ms?: number) => void;

  // Quests
  offerQuest: (id: string) => void;
  startQuest: (id: string) => void;
  advanceQuest: (id: string, flag?: string) => void;
  completeQuest: (id: string) => void;
  getQuestState: (id: string) => QuestState | undefined;

  // Friendship
  addFriendship: (npcId: string, amount: number) => void;

  // Cassettes
  unlockCassette: (id: string) => void;
  setCurrentCassette: (id: string | null) => void;

  // Memories / flags
  unlockMemory: (id: string) => void;
  setFlag: (key: string, value?: boolean) => void;
}

function defaultQuestStates(): QuestState[] {
  return Object.keys(QUEST_BY_ID).map((id, i) => ({
    id,
    status: i < 4 ? 'offered' : 'locked',
  }));
}

function timeOfDayFrom(minutes: number): TimeOfDay {
  const h = (minutes / 60) % 24;
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 19.5) return 'goldenHour';
  if (h >= 19.5 && h < 21.5) return 'dusk';
  return 'night';
}

export const getTimeOfDay = timeOfDayFrom;

export const useGameStore = create<GameState>((set, get) => ({
  scene: 'yard',
  timeMinutes: 7 * 60, // 07:00 start
  daysPassed: 0,
  timeScale: 60, // 1 real sec = 60 game sec by default
  paused: false,
  season: 'summer',
  weather: 'clear',
  friendships: {},
  quests: defaultQuestStates(),
  cassettes: [],
  memories: [],
  flags: {},
  photosTaken: 0,
  currentCassette: null,
  ui: {
    view: 'menu',
    dialogQueue: [],
    dialogIndex: 0,
    toast: null,
    toastUntil: 0,
  },

  startNewGame: () => {
    set({
      scene: 'yard',
      timeMinutes: 7 * 60,
      daysPassed: 0,
      timeScale: 60,
      paused: false,
      season: 'summer',
      weather: 'clear',
      friendships: {},
      quests: defaultQuestStates(),
      cassettes: [],
      memories: [],
      flags: {},
      photosTaken: 0,
      currentCassette: null,
      ui: { view: 'playing', dialogQueue: [], dialogIndex: 0, toast: null, toastUntil: 0 },
    });
  },

  load: (data) => {
    set({
      scene: data.scene,
      timeMinutes: data.timeMinutes,
      daysPassed: data.daysPassed,
      season: data.season,
      weather: data.weather,
      friendships: data.friendships,
      quests: data.quests,
      cassettes: data.cassettes,
      memories: data.memories,
      flags: data.flags,
      photosTaken: data.photosTaken,
      currentCassette: null,
      paused: false,
      ui: {
        view: 'playing',
        dialogQueue: [],
        dialogIndex: 0,
        toast: null,
        toastUntil: 0,
      },
    });
  },

  save: () => {
    const s = get();
    const data: SaveData = {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      catName: 'Рыжик',
      scene: s.scene,
      timeMinutes: s.timeMinutes,
      daysPassed: s.daysPassed,
      season: s.season,
      weather: s.weather,
      friendships: s.friendships,
      quests: s.quests,
      cassettes: s.cassettes,
      memories: s.memories,
      flags: s.flags,
      photosTaken: s.photosTaken,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    return data;
  },

  setView: (v) => set((s) => ({ ui: { ...s.ui, view: v } })),
  pause: () => set({ paused: true }),
  resume: () => set({ paused: false }),
  setTimeScale: (timeScale) => set({ timeScale }),
  tick: (deltaMs) => {
    const s = get();
    if (s.paused) return;
    if (s.ui.view !== 'playing' && s.ui.view !== 'photo') return;
    const dtGameMin = (deltaMs / 1000) * (s.timeScale / 60);
    let t = s.timeMinutes + dtGameMin;
    let days = s.daysPassed;
    if (t >= 1440) {
      t -= 1440;
      days += 1;
    }
    set({ timeMinutes: t, daysPassed: days });
  },
  setScene: (s) => set({ scene: s }),
  setWeather: (w) => set({ weather: w }),

  enqueueDialog: (lines) =>
    set((s) => ({
      ui: { ...s.ui, dialogQueue: lines, dialogIndex: 0 },
    })),
  advanceDialog: () =>
    set((s) => {
      const next = s.ui.dialogIndex + 1;
      if (next >= s.ui.dialogQueue.length) {
        return { ui: { ...s.ui, dialogQueue: [], dialogIndex: 0 } };
      }
      return { ui: { ...s.ui, dialogIndex: next } };
    }),
  clearDialog: () =>
    set((s) => ({ ui: { ...s.ui, dialogQueue: [], dialogIndex: 0 } })),

  showToast: (msg, ms = 2600) =>
    set((s) => ({
      ui: { ...s.ui, toast: msg, toastUntil: Date.now() + ms },
    })),

  offerQuest: (id) =>
    set((s) => ({
      quests: s.quests.map((q) => (q.id === id ? { id, status: 'offered' } : q)),
    })),
  startQuest: (id) =>
    set((s) => {
      const next = s.quests.map((q) =>
        q.id === id
          ? ({ id, status: 'active', stepIndex: 0, flags: {} } as QuestState)
          : q
      );
      get().showToast(`Новый квест: ${QUEST_BY_ID[id]?.title ?? id}`);
      return { quests: next };
    }),
  advanceQuest: (id, flag) =>
    set((s) => {
      const quest = s.quests.find((q) => q.id === id);
      if (!quest || quest.status !== 'active') return {};
      const def = QUEST_BY_ID[id];
      if (!def) return {};
      const flags = { ...quest.flags };
      if (flag) flags[flag] = true;
      const stepIndex = Math.min(quest.stepIndex + 1, def.steps.length - 1);
      const next: QuestState = {
        id,
        status: 'active',
        stepIndex,
        flags,
      };
      return {
        quests: s.quests.map((q) => (q.id === id ? next : q)),
      };
    }),
  completeQuest: (id) =>
    set((s) => {
      const def = QUEST_BY_ID[id];
      if (!def) return {};
      const fr = { ...s.friendships };
      fr[def.npcId] = (fr[def.npcId] ?? 0) + def.reward.friendship;
      const cassettes = def.reward.cassetteId
        ? Array.from(new Set([...s.cassettes, def.reward.cassetteId]))
        : s.cassettes;
      get().showToast(`Квест завершён: ${def.title}`);
      if (def.reward.cassetteId) {
        const c = CASSETTE_BY_ID[def.reward.cassetteId];
        if (c) get().showToast(`Новая кассета: ${c.title}`, 3400);
      }
      return {
        quests: s.quests.map((q) =>
          q.id === id ? { id, status: 'completed' } : q
        ),
        friendships: fr,
        cassettes,
      };
    }),
  getQuestState: (id) => get().quests.find((q) => q.id === id),

  addFriendship: (npcId, amount) =>
    set((s) => ({
      friendships: {
        ...s.friendships,
        [npcId]: Math.max(0, (s.friendships[npcId] ?? 0) + amount),
      },
    })),

  unlockCassette: (id) =>
    set((s) => {
      if (s.cassettes.includes(id)) return {};
      get().showToast(`Кассета: ${CASSETTE_BY_ID[id]?.title ?? id}`);
      return { cassettes: [...s.cassettes, id] };
    }),
  setCurrentCassette: (id) => set({ currentCassette: id }),

  unlockMemory: (id) =>
    set((s) =>
      s.memories.includes(id) ? {} : { memories: [...s.memories, id] }
    ),
  setFlag: (key, value = true) =>
    set((s) => ({ flags: { ...s.flags, [key]: value } })),
}));

export function loadFromStorage(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
