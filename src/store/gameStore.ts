import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collectibles, npcs, quests, upgrades } from '../game/content';
import type {
  CatIntent,
  DayPhase,
  LocationId,
  NpcId,
  QuestId,
  QuestObjective,
  Season,
  Weather,
} from '../game/types';

type Panel = 'journal' | 'map' | 'collection' | 'friends' | 'settings' | null;

interface DialogueEntry {
  speaker: string;
  text: string;
}

interface GameStore {
  day: number;
  minuteOfDay: number;
  dayPhase: DayPhase;
  weather: Weather;
  season: Season;
  location: LocationId;
  playerEnergy: number;
  coziness: number;
  fireflies: number;
  catIntent: CatIntent;
  interactionHint: string | null;
  activeQuestId: QuestId;
  questObjectives: Record<QuestId, QuestObjective[]>;
  completedQuestIds: QuestId[];
  friendship: Record<NpcId, number>;
  inventory: string[];
  collection: string[];
  upgrades: string[];
  dialogueLog: DialogueEntry[];
  selectedPanel: Panel;
  photoMode: boolean;
  musicEnabled: boolean;
  ambienceEnabled: boolean;
  isFinaleReady: boolean;
  setAtmosphere: (minuteOfDay: number, dayPhase: DayPhase, weather: Weather, season: Season) => void;
  setLocation: (location: LocationId) => void;
  setCatIntent: (intent: CatIntent) => void;
  setInteractionHint: (hint: string | null) => void;
  startQuest: (questId: QuestId) => void;
  completeObjective: (questId: QuestId, objectiveId: string) => void;
  completeQuest: (questId: QuestId) => void;
  addInventoryItem: (itemId: string) => void;
  collect: (collectibleId: string) => void;
  addUpgrade: (upgradeId: string) => void;
  addFriendship: (npcId: NpcId, amount: number) => void;
  addDialogue: (speaker: string, text: string) => void;
  setPanel: (panel: Panel) => void;
  togglePhotoMode: () => void;
  toggleMusic: () => void;
  toggleAmbience: () => void;
  addFirefly: (amount?: number) => void;
  spendFireflies: (amount: number) => boolean;
  sleepUntilMorning: () => void;
  resetProgress: () => void;
}

const npcIds = npcs.map((npc) => npc.id);
const initialFriendship = Object.fromEntries(npcIds.map((id) => [id, 1])) as Record<NpcId, number>;
const initialQuestObjectives = Object.fromEntries(
  quests.map((quest) => [
    quest.id,
    quest.objectives.map((text, index) => ({
      id: `${quest.id}-${index}`,
      text,
      done: false,
    })),
  ]),
) as Record<QuestId, QuestObjective[]>;

const finaleRequirements = {
  cassettes: collectibles.filter((item) => item.kind === 'cassette').map((item) => item.id),
  photos: collectibles.filter((item) => item.kind === 'photo').map((item) => item.id),
  notes: collectibles.filter((item) => item.kind === 'note').map((item) => item.id),
  hidden: ['moon-bell', 'greenhouse-glowleaf'],
};

const computeFinaleReady = (collection: string[], completedQuestIds: QuestId[]) =>
  completedQuestIds.includes('greenhouse') &&
  [...finaleRequirements.cassettes, ...finaleRequirements.photos, ...finaleRequirements.notes, ...finaleRequirements.hidden].every(
    (id) => collection.includes(id),
  );

const nextDayPhase = (minuteOfDay: number): DayPhase => {
  if (minuteOfDay < 420) return 'night';
  if (minuteOfDay < 720) return 'morning';
  if (minuteOfDay < 1020) return 'day';
  if (minuteOfDay < 1170) return 'goldenHour';
  if (minuteOfDay < 1290) return 'blueEvening';
  return 'night';
};

const defaultState = {
  day: 1,
  minuteOfDay: 960,
  dayPhase: 'goldenHour' as DayPhase,
  weather: 'sun' as Weather,
  season: 'summer' as Season,
  location: 'yard' as LocationId,
  playerEnergy: 100,
  coziness: 12,
  fireflies: 0,
  catIntent: 'wander' as CatIntent,
  interactionHint: null,
  activeQuestId: 'oldCassette' as QuestId,
  questObjectives: initialQuestObjectives,
  completedQuestIds: [] as QuestId[],
  friendship: initialFriendship,
  inventory: [] as string[],
  collection: [] as string[],
  upgrades: [] as string[],
  dialogueLog: [
    {
      speaker: 'Дом',
      text: 'Старые доски вздыхают на закате. Рыжик просыпается на веранде, где пахнет травой и пыльными кассетами.',
    },
  ] as DialogueEntry[],
  selectedPanel: 'journal' as Panel,
  photoMode: false,
  musicEnabled: true,
  ambienceEnabled: true,
  isFinaleReady: false,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setAtmosphere: (minuteOfDay, dayPhase, weather, season) => set({ minuteOfDay, dayPhase, weather, season }),
      setLocation: (location) => set({ location }),
      setCatIntent: (catIntent) => set({ catIntent }),
      setInteractionHint: (interactionHint) => set({ interactionHint }),
      startQuest: (questId) => {
        const quest = quests.find((item) => item.id === questId);
        set({ activeQuestId: questId });
        if (quest) {
          get().addDialogue('Задание', quest.summary);
        }
      },
      completeObjective: (questId, objectiveId) =>
        set((state) => ({
          questObjectives: {
            ...state.questObjectives,
            [questId]: state.questObjectives[questId].map((objective) =>
              objective.id === objectiveId ? { ...objective, done: true } : objective,
            ),
          },
        })),
      completeQuest: (questId) => {
        const quest = quests.find((item) => item.id === questId);
        if (!quest || get().completedQuestIds.includes(questId)) return;
        const completedQuestIds = [...get().completedQuestIds, questId];
        const questIndex = quests.findIndex((item) => item.id === questId);
        const nextQuest = quests[questIndex + 1]?.id ?? questId;
        set((state) => ({
          completedQuestIds,
          activeQuestId: nextQuest,
          coziness: state.coziness + 12,
          questObjectives: {
            ...state.questObjectives,
            [questId]: state.questObjectives[questId].map((objective) => ({ ...objective, done: true })),
          },
          isFinaleReady: computeFinaleReady(state.collection, completedQuestIds),
        }));
        get().addFriendship(quest.npc, 2);
        get().addDialogue('Задание выполнено', `${quest.title}: ${quest.reward}`);
      },
      addInventoryItem: (itemId) =>
        set((state) => (state.inventory.includes(itemId) ? state : { inventory: [...state.inventory, itemId] })),
      collect: (collectibleId) => {
        const collectible = collectibles.find((item) => item.id === collectibleId);
        if (!collectible || get().collection.includes(collectibleId)) return;
        const collection = [...get().collection, collectibleId];
        set((state) => ({
          collection,
          inventory: state.inventory.includes(collectibleId) ? state.inventory : [...state.inventory, collectibleId],
          coziness: state.coziness + 4,
          isFinaleReady: computeFinaleReady(collection, state.completedQuestIds),
        }));
        get().addDialogue('Находка', `${collectible.title}: ${collectible.description}`);
      },
      addUpgrade: (upgradeId) => {
        const upgrade = upgrades.find((item) => item.id === upgradeId);
        if (!upgrade || get().upgrades.includes(upgradeId)) return;
        set((state) => ({ upgrades: [...state.upgrades, upgradeId], coziness: state.coziness + 8 }));
        get().addDialogue('Двор оживает', `${upgrade.title}: ${upgrade.description}`);
      },
      addFriendship: (npcId, amount) =>
        set((state) => ({
          friendship: {
            ...state.friendship,
            [npcId]: Math.min(10, state.friendship[npcId] + amount),
          },
        })),
      addDialogue: (speaker, text) =>
        set((state) => ({
          dialogueLog: [...state.dialogueLog.slice(-7), { speaker, text }],
        })),
      setPanel: (selectedPanel) => set({ selectedPanel }),
      togglePhotoMode: () => set((state) => ({ photoMode: !state.photoMode })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      toggleAmbience: () => set((state) => ({ ambienceEnabled: !state.ambienceEnabled })),
      addFirefly: (amount = 1) => set((state) => ({ fireflies: Math.min(24, state.fireflies + amount) })),
      spendFireflies: (amount) => {
        if (get().fireflies < amount) return false;
        set((state) => ({ fireflies: state.fireflies - amount }));
        return true;
      },
      sleepUntilMorning: () =>
        set((state) => ({
          day: state.day + 1,
          minuteOfDay: 480,
          dayPhase: nextDayPhase(480),
          playerEnergy: 100,
          weather: state.day % 4 === 0 ? 'rain' : 'sun',
        })),
      resetProgress: () => set({ ...defaultState, questObjectives: initialQuestObjectives, friendship: initialFriendship }),
    }),
    {
      name: 'ryzhik-old-country-house-save',
      version: 1,
    },
  ),
);

export const formatGameTime = (minuteOfDay: number) => {
  const hours = Math.floor(minuteOfDay / 60) % 24;
  const minutes = minuteOfDay % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
