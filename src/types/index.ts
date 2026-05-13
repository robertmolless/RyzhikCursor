// Shared types across the game (used by both Phaser and React UI).

export type TimeOfDay = 'morning' | 'day' | 'goldenHour' | 'dusk' | 'night';
export type Season = 'summer' | 'autumn' | 'winter' | 'spring';
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';

export type SceneKey = 'yard' | 'house' | 'forest' | 'pond' | 'greenhouse';

export interface NPCDef {
  id: string;
  name: string;
  color: { hair: number; outfit: number; accent: number };
  hair: 'short' | 'medium' | 'long' | 'mohawk' | 'wavy';
  outfit: 'hoodie' | 'jacket' | 'sweater' | 'tee' | 'cloak';
  trait: string;
  description: string;
  questId?: string;
  favorites: string[];
  spawn: { x: number; y: number };
  scheduleHint: string;
}

export interface QuestStep {
  id: string;
  text: string;
  hint?: string;
  done?: boolean;
}

export interface QuestDef {
  id: string;
  npcId: string;
  title: string;
  intro: string;
  outro: string;
  reward: { friendship: number; cassetteId?: string; item?: string };
  steps: QuestStep[];
}

export type QuestState =
  | { id: string; status: 'locked' }
  | { id: string; status: 'offered' }
  | { id: string; status: 'active'; stepIndex: number; flags: Record<string, boolean> }
  | { id: string; status: 'completed' };

export interface CassetteDef {
  id: string;
  title: string;
  author: string;
  mood: 'lofi' | 'acoustic' | 'rock' | 'ambient' | 'piano';
  memory: string;
  unlockHint: string;
}

export interface DialogLine {
  speaker: string;
  text: string;
}

export interface Memory {
  id: string;
  title: string;
  body: string;
  unlocked: boolean;
}

export interface SaveData {
  version: 1;
  createdAt: number;
  updatedAt: number;
  catName: string;
  scene: SceneKey;
  timeMinutes: number; // 0..1440
  daysPassed: number;
  season: Season;
  weather: WeatherKind;
  friendships: Record<string, number>;
  quests: QuestState[];
  cassettes: string[];
  memories: string[];
  photosTaken: number;
  flags: Record<string, boolean>;
}
