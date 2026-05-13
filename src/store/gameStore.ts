import { create } from 'zustand';
import {
  LOCATIONS,
  NPCS,
  QUESTS,
  WORLD_OBJECTS,
  createInitialQuestProgress,
  phaseFromMinute,
} from '../content/world';
import { localSaveAdapter } from '../lib/storage';
import type {
  CatAction,
  CatMood,
  DialogueLine,
  GameFlags,
  GameSnapshot,
  LocationId,
  QuestProgress,
  Season,
  Weather,
  WorldObject,
} from '../types/game';

const initialFlags: GameFlags = {
  cassetteFound: false,
  yardLightsFixed: false,
  greenhouseOpen: false,
  stormResolved: false,
  roofNightPrepared: false,
  moonBellFound: false,
  finalNightUnlocked: false,
};

const initialSnapshot = (): GameSnapshot => ({
  season: 'summer',
  weather: 'sunny',
  dayMinute: 17 * 60 + 18,
  location: 'house',
  catMood: 'curious',
  catAction: 'walk',
  inventory: [],
  collections: {
    cassettes: [],
    photos: [],
    notes: [],
    toys: [],
    plants: [],
    memories: [],
  },
  friendship: Object.fromEntries(NPCS.map((npc) => [npc.id, 0])),
  quests: createInitialQuestProgress(),
  flags: initialFlags,
  decorLevel: 0,
  lastSavedAt: Date.now(),
});

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
}

interface RuntimeState {
  activeDialogue: DialogueLine[];
  focusedNpcId?: string;
  activePanel: 'journal' | 'collection' | 'map' | 'settings' | null;
  photoMode: boolean;
  selectedPhotoPreset: string;
  muted: boolean;
  onboardingComplete: boolean;
  toast?: ToastMessage;
  firefliesFollowing: number;
}

interface GameStore extends GameSnapshot, RuntimeState {
  hydrate(): void;
  save(): void;
  reset(): void;
  tick(minutes: number): void;
  setLocation(location: LocationId): void;
  setWeather(weather: Weather): void;
  cycleWeather(): void;
  cycleSeason(): void;
  setCatState(mood: CatMood, action: CatAction): void;
  interactWithNpc(npcId: string): void;
  interactWithObject(targetId: string): void;
  collectObject(objectId: string): void;
  catchFirefly(): void;
  togglePanel(panel: RuntimeState['activePanel']): void;
  closeDialogue(): void;
  togglePhotoMode(): void;
  setPhotoPreset(presetId: string): void;
  toggleMute(): void;
  completeOnboarding(): void;
  clearToast(): void;
}

const collectionKeyForObject = (object: WorldObject) => {
  if (object.kind === 'cassette') return 'cassettes';
  if (object.kind === 'photo') return 'photos';
  if (object.kind === 'note') return 'notes';
  if (object.kind === 'toy') return 'toys';
  if (object.kind === 'plant') return 'plants';
  return 'memories';
};

const weatherOrder: Weather[] = ['sunny', 'cloudy', 'wind', 'rain', 'storm', 'fog'];
const seasonOrder: Season[] = ['summer', 'autumn', 'winter', 'spring'];

const objectIsVisible = (object: WorldObject, flags: GameFlags) => {
  if (!object.hiddenUntil) return true;
  return Object.entries(object.hiddenUntil).every(([flag, value]) => flags[flag as keyof GameFlags] === value);
};

const advanceQuestMap = (
  quests: Record<string, QuestProgress>,
  targetId: string,
  objectQuestId?: string,
): { quests: Record<string, QuestProgress>; completedQuest?: string; reward?: string; unlockFlag?: keyof GameFlags } => {
  const next = structuredClone(quests);

  for (const quest of QUESTS) {
    const progress = next[quest.id];
    if (!progress || progress.status === 'locked' || progress.status === 'completed') continue;
    const currentStep = quest.steps[progress.stepIndex];
    if (!currentStep) continue;
    const targetMatches = currentStep.target === targetId || (objectQuestId === quest.id && currentStep.target);
    if (!targetMatches) continue;

    if (progress.status === 'available') progress.status = 'active';
    if (currentStep.count && currentStep.count > 1) {
      const newCount = (progress.counters[currentStep.id] ?? 0) + 1;
      progress.counters[currentStep.id] = newCount;
      if (newCount < currentStep.count) return { quests: next };
    }

    progress.stepIndex += 1;
    if (progress.stepIndex >= quest.steps.length) {
      progress.status = 'completed';
      return {
        quests: next,
        completedQuest: quest.title,
        reward: quest.reward,
        unlockFlag: quest.unlocks,
      };
    }

    return { quests: next };
  }

  return { quests: next };
};

const unlockFollowUpQuests = (quests: Record<string, QuestProgress>, flags: GameFlags) => {
  const next = structuredClone(quests);
  const unlockable = ['moon-bell', 'greenhouse', 'forest-path', 'strange-notes', 'broken-lantern', 'treasure-box', 'lost-pick'];
  unlockable.forEach((questId) => {
    const quest = next[questId];
    if (!quest || quest.status !== 'locked') return;
    if (flags.cassetteFound || flags.yardLightsFixed || questId === 'moon-bell') {
      quest.status = 'available';
    }
  });
  if (flags.moonBellFound && next.greenhouse?.status === 'locked') next.greenhouse.status = 'available';
  return next;
};

const checkFinalUnlock = (
  collections: Record<string, string[]>,
  quests: Record<string, QuestProgress>,
  flags: GameFlags,
) => {
  const cassetteCount = collections.cassettes.length;
  const photoCount = collections.photos.length;
  const noteCount = collections.notes.length;
  const completedCore = ['old-cassette', 'firefly-photo', 'moon-bell', 'greenhouse'].every(
    (questId) => quests[questId]?.status === 'completed',
  );
  return flags.finalNightUnlocked || (cassetteCount >= 3 && photoCount >= 1 && noteCount >= 3 && completedCore);
};

const applyQuestCompletion = (
  state: GameStore,
  result: ReturnType<typeof advanceQuestMap>,
): Pick<GameStore, 'quests' | 'flags' | 'toast' | 'decorLevel'> => {
  const flags = { ...state.flags };
  if (result.unlockFlag) flags[result.unlockFlag] = true;

  let quests = result.quests;
  quests = unlockFollowUpQuests(quests, flags);
  flags.finalNightUnlocked = checkFinalUnlock(state.collections, quests, flags);

  return {
    quests,
    flags,
    decorLevel: state.decorLevel + (result.completedQuest ? 1 : 0),
    toast: result.completedQuest
      ? {
          id: crypto.randomUUID(),
          title: `Квест завершён: ${result.completedQuest}`,
          body: result.reward ?? 'Дом стал чуточку теплее.',
        }
      : state.toast,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialSnapshot(),
  activeDialogue: [],
  activePanel: null,
  photoMode: false,
  selectedPhotoPreset: 'warm-film',
  muted: false,
  onboardingComplete: false,
  firefliesFollowing: 0,

  hydrate() {
    const saved = localSaveAdapter.load();
    if (saved) set({ ...saved });
  },

  save() {
    const {
      season,
      weather,
      dayMinute,
      location,
      catMood,
      catAction,
      inventory,
      collections,
      friendship,
      quests,
      flags,
      decorLevel,
      lastSavedAt,
    } = get();
    localSaveAdapter.save({
      season,
      weather,
      dayMinute,
      location,
      catMood,
      catAction,
      inventory,
      collections,
      friendship,
      quests,
      flags,
      decorLevel,
      lastSavedAt,
    });
  },

  reset() {
    localSaveAdapter.clear();
    set({ ...initialSnapshot(), activeDialogue: [], activePanel: null, photoMode: false, firefliesFollowing: 0 });
  },

  tick(minutes) {
    set((state) => ({ dayMinute: (state.dayMinute + minutes) % 1440 }));
  },

  setLocation(location) {
    const locked = LOCATIONS.find((entry) => entry.id === location)?.lockedBy;
    if (locked && !get().flags[locked]) {
      set({
        toast: {
          id: crypto.randomUUID(),
          title: 'Теплица пока закрыта',
          body: 'Нужны ключ, электричество и ночная подсказка Мага.',
        },
      });
      return;
    }
    set({ location });
  },

  setWeather(weather) {
    set({ weather });
  },

  cycleWeather() {
    set((state) => {
      const index = weatherOrder.indexOf(state.weather);
      return { weather: weatherOrder[(index + 1) % weatherOrder.length] };
    });
  },

  cycleSeason() {
    set((state) => {
      const index = seasonOrder.indexOf(state.season);
      return { season: seasonOrder[(index + 1) % seasonOrder.length] };
    });
  },

  setCatState(catMood, catAction) {
    set({ catMood, catAction });
  },

  interactWithNpc(npcId) {
    const npc = NPCS.find((entry) => entry.id === npcId);
    if (!npc) return;
    const state = get();
    const phase = phaseFromMinute(state.dayMinute);
    const weatherDialogue = state.weather === 'rain' || state.weather === 'storm' ? npc.dialogue[state.weather] : null;
    const friendship = state.friendship[npcId] ?? 0;
    const lines = friendship >= 4 ? npc.dialogue.friend : weatherDialogue ?? npc.dialogue[phase];
    const result = advanceQuestMap(state.quests, npcId);
    const nextFriendship = { ...state.friendship, [npcId]: Math.min(10, friendship + 1) };

    set({
      ...applyQuestCompletion({ ...state, friendship: nextFriendship } as GameStore, result),
      friendship: nextFriendship,
      focusedNpcId: npcId,
      activeDialogue: lines.map((text) => ({ speaker: npc.name, text })),
      catMood: state.weather === 'storm' ? 'scared' : friendship > 5 ? 'cozy' : 'curious',
      catAction: friendship > 6 ? 'rub' : 'npcReact',
    });
  },

  interactWithObject(targetId) {
    const state = get();
    const result = advanceQuestMap(state.quests, targetId);
    set({
      ...applyQuestCompletion(state, result),
      catMood: targetId.includes('speaker') ? 'musical' : 'playful',
      catAction: targetId.includes('box') ? 'box' : targetId.includes('roof') ? 'climb' : 'play',
    });
  },

  collectObject(objectId) {
    const state = get();
    const object = WORLD_OBJECTS.find((entry) => entry.id === objectId);
    if (!object || !object.collectable || state.inventory.includes(objectId) || !objectIsVisible(object, state.flags)) return;

    const collections = structuredClone(state.collections);
    const key = collectionKeyForObject(object);
    collections[key] = [...(collections[key] ?? []), object.id];
    const inventory = [...state.inventory, object.id];
    let result = advanceQuestMap(state.quests, object.id, object.questId);
    if (object.kind === 'note') result = advanceQuestMap(result.quests, 'strange-note', object.questId);
    if (object.kind === 'cassette') result = advanceQuestMap(result.quests, 'cassette', object.questId);

    const nextState = { ...state, collections, inventory } as GameStore;
    const questPatch = applyQuestCompletion(nextState, result);
    const flags = {
      ...questPatch.flags,
      finalNightUnlocked: checkFinalUnlock(collections, questPatch.quests, questPatch.flags),
    };

    set({
      inventory,
      collections,
      ...questPatch,
      flags,
      decorLevel: questPatch.decorLevel + (object.kind === 'decor' ? 1 : 0),
      toast: {
        id: crypto.randomUUID(),
        title: `Найдено: ${object.title}`,
        body: object.description,
      },
      catMood: object.kind === 'cassette' ? 'musical' : object.kind === 'toy' ? 'playful' : 'curious',
      catAction: object.kind === 'cassette' ? 'dance' : object.kind === 'toy' ? 'play' : 'purr',
    });
  },

  catchFirefly() {
    const state = get();
    const nextCount = state.firefliesFollowing + 1;
    const result = advanceQuestMap(state.quests, 'firefly');
    set({
      ...applyQuestCompletion(state, result),
      firefliesFollowing: nextCount,
      catMood: 'playful',
      catAction: 'jump',
      toast: {
        id: crypto.randomUUID(),
        title: 'Светлячок летит за Рыжиком',
        body: `${Math.min(nextCount, 3)} из 3 для фотографии Насти.`,
      },
    });
  },

  togglePanel(panel) {
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel, activeDialogue: [] }));
  },

  closeDialogue() {
    set({ activeDialogue: [], focusedNpcId: undefined });
  },

  togglePhotoMode() {
    set((state) => ({ photoMode: !state.photoMode, activePanel: null }));
  },

  setPhotoPreset(selectedPhotoPreset) {
    set({ selectedPhotoPreset });
  },

  toggleMute() {
    set((state) => ({ muted: !state.muted }));
  },

  completeOnboarding() {
    set({ onboardingComplete: true });
  },

  clearToast() {
    set({ toast: undefined });
  },
}));

useGameStore.subscribe((state) => {
  state.save();
});
