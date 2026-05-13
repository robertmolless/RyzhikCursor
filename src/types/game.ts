export type Season = 'summer' | 'autumn' | 'winter' | 'spring';
export type Weather = 'sunny' | 'rain' | 'storm' | 'fog' | 'wind' | 'cloudy';
export type DayPhase = 'morning' | 'day' | 'goldenHour' | 'blueEvening' | 'night';
export type LocationId = 'house' | 'yard' | 'forest' | 'pond' | 'greenhouse';
export type QuestStatus = 'locked' | 'available' | 'active' | 'completed';
export type CatMood = 'curious' | 'cozy' | 'playful' | 'sleepy' | 'scared' | 'musical';
export type CatAction =
  | 'walk'
  | 'run'
  | 'jump'
  | 'sleep'
  | 'stretch'
  | 'purr'
  | 'climb'
  | 'dance'
  | 'rain'
  | 'play'
  | 'window'
  | 'speakerNap'
  | 'keyboard'
  | 'box'
  | 'rub'
  | 'npcReact'
  | 'shoulder'
  | 'stormScare';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldObject {
  id: string;
  title: string;
  location: LocationId;
  position: Vec2;
  kind:
    | 'cassette'
    | 'photo'
    | 'note'
    | 'toy'
    | 'plant'
    | 'tool'
    | 'memory'
    | 'decor'
    | 'quest'
    | 'fish'
    | 'firefly';
  description: string;
  collectable?: boolean;
  hiddenUntil?: Partial<GameFlags>;
  questId?: string;
}

export interface LocationDefinition {
  id: LocationId;
  title: string;
  subtitle: string;
  bounds: Bounds;
  lockedBy?: keyof GameFlags;
  palette: {
    sky: number;
    ground: number;
    accent: number;
    shadow: number;
  };
  atmosphere: string[];
}

export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  appearance: string;
  personality: string;
  questId?: string;
  favoriteGifts: string[];
  schedule: Record<DayPhase, LocationId>;
  dialogue: Record<DayPhase | 'rain' | 'storm' | 'friend', string[]>;
}

export interface QuestStep {
  id: string;
  text: string;
  target?: string;
  count?: number;
}

export interface QuestDefinition {
  id: string;
  title: string;
  giver: string;
  summary: string;
  unlocks?: keyof GameFlags;
  reward: string;
  steps: QuestStep[];
}

export interface GameFlags {
  cassetteFound: boolean;
  yardLightsFixed: boolean;
  greenhouseOpen: boolean;
  stormResolved: boolean;
  roofNightPrepared: boolean;
  moonBellFound: boolean;
  finalNightUnlocked: boolean;
}

export interface QuestProgress {
  status: QuestStatus;
  stepIndex: number;
  counters: Record<string, number>;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface PhotoPreset {
  id: string;
  title: string;
  blur: number;
  grain: number;
  saturation: number;
  vignette: number;
}

export interface GameSnapshot {
  season: Season;
  weather: Weather;
  dayMinute: number;
  location: LocationId;
  catMood: CatMood;
  catAction: CatAction;
  inventory: string[];
  collections: Record<string, string[]>;
  friendship: Record<string, number>;
  quests: Record<string, QuestProgress>;
  flags: GameFlags;
  decorLevel: number;
  lastSavedAt: number;
}
